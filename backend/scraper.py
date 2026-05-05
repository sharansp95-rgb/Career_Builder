"""
scraper.py - Job scraper using requests + BeautifulSoup (no Selenium).
Sources: LinkedIn guest API, Indeed India RSS, Internshala.
Each source is isolated — a failure in one never cancels the others.
"""

from __future__ import annotations

import json
import logging
import os
import time
import xml.etree.ElementTree as ET
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_SCRAPED_FILE = os.path.join(os.path.dirname(__file__), "scraped_jobs.json")
_REQUEST_TIMEOUT = 10  # seconds per source

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Maps keyword fragments → related skills for BERT resume matching
_KEYWORD_SKILLS: dict[str, list[str]] = {
    "python": ["Python", "Flask", "Django", "FastAPI", "REST APIs", "SQL", "pandas"],
    "react": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind", "Next.js"],
    "node": ["Node.js", "JavaScript", "Express", "REST APIs", "MongoDB", "TypeScript"],
    "java": ["Java", "Spring Boot", "Maven", "SQL", "REST APIs", "Microservices"],
    "full stack": ["React", "Node.js", "SQL", "JavaScript", "REST APIs", "TypeScript"],
    "fullstack": ["React", "Node.js", "SQL", "JavaScript", "REST APIs"],
    "data science": ["Python", "Machine Learning", "pandas", "SQL", "TensorFlow", "scikit-learn"],
    "machine learning": ["Python", "TensorFlow", "PyTorch", "scikit-learn", "pandas", "NLP"],
    "devops": ["Docker", "Kubernetes", "AWS", "Linux", "CI/CD", "Jenkins", "Terraform"],
    "cloud": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform"],
    "frontend": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind", "Figma"],
    "backend": ["Python", "Node.js", "Java", "REST APIs", "SQL", "Flask", "PostgreSQL"],
    "android": ["Android", "Kotlin", "Java", "REST APIs", "Firebase"],
    "ios": ["Swift", "iOS", "Xcode", "REST APIs", "Objective-C"],
    "c++": ["C++", "CMake", "Linux", "STL", "Multithreading"],
    "docker": ["Docker", "Kubernetes", "Linux", "CI/CD", "AWS"],
    "express": ["Node.js", "Express", "JavaScript", "REST APIs", "MongoDB"],
    "sql": ["SQL", "PostgreSQL", "MySQL", "Database Design", "Python"],
    "typescript": ["TypeScript", "JavaScript", "React", "Node.js", "HTML", "CSS"],
}


def _expand_keyword(keyword: str) -> str:
    kw = keyword.lower()
    matched: list[str] = []
    for fragment, skills in _KEYWORD_SKILLS.items():
        if fragment in kw:
            matched.extend(s for s in skills if s not in matched)
    if not matched:
        matched = ["Software Development", "Programming", "Problem Solving", "Git"]
    return ", ".join(matched)


def _job_record(
    *,
    source: str,
    title: str,
    company: str,
    location: str,
    keyword: str,
    apply_url: str = "",
) -> dict:
    cleaned_title = title.strip()
    cleaned_company = company.strip()
    cleaned_location = location.strip() or "India"
    cleaned_apply_url = apply_url.strip()

    skills_str = _expand_keyword(keyword)
    return {
        "source": source,
        "title": cleaned_title,
        "company": cleaned_company,
        "location": cleaned_location,
        "url": cleaned_apply_url,
        "applyUrl": cleaned_apply_url,
        "description": (
            f"{cleaned_title} position at {cleaned_company} in {cleaned_location}. "
            f"Required skills: {skills_str}. "
            f"This role involves {cleaned_title} responsibilities with strong expertise in {keyword}."
        ),
    }


def _dedupe_jobs(jobs: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen: set[tuple[str, str, str, str]] = set()
    for job in jobs:
        title = str(job.get("title", "")).strip()
        company = str(job.get("company", "")).strip()
        location = str(job.get("location", "")).strip() or "India"
        source = str(job.get("source", "")).strip()
        if not title or not company:
            continue
        key = (source.lower(), title.lower(), company.lower(), location.lower())
        if key in seen:
            continue
        seen.add(key)
        cleaned = job.copy()
        cleaned["title"] = title
        cleaned["company"] = company
        cleaned["location"] = location
        deduped.append(cleaned)
    return deduped


def _save_scraped_jobs(keyword: str, jobs: list[dict]) -> None:
    payload = {"keyword": keyword, "fetched_at": int(time.time()), "jobs": jobs}
    try:
        with open(_SCRAPED_FILE, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
    except OSError as exc:
        log.warning("Could not save scraped jobs cache: %s", exc)


def _scrape_linkedin(keyword: str, max_jobs: int = 15) -> list[dict]:
    """LinkedIn public guest jobs API — returns HTML, no login needed."""
    jobs: list[dict] = []
    url = (
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        f"?keywords={quote(keyword)}&location=India&start=0"
    )
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select("li")[:max_jobs]
        for card in cards:
            title_el = card.select_one(".base-search-card__title")
            company_el = card.select_one(".base-search-card__subtitle")
            location_el = card.select_one(".job-search-card__location")
            link_el = card.select_one("a.base-card__full-link")
            title = title_el.get_text(strip=True) if title_el else ""
            company = company_el.get_text(strip=True) if company_el else ""
            location = location_el.get_text(strip=True) if location_el else "India"
            apply_url = link_el["href"].strip() if link_el and link_el.get("href") else ""
            if title and company:
                jobs.append(_job_record(
                    source="LinkedIn", title=title, company=company,
                    location=location, keyword=keyword, apply_url=apply_url,
                ))
        log.info("LinkedIn: %d jobs scraped", len(jobs))
    except requests.Timeout:
        log.warning("LinkedIn scrape timed out after %ds — skipping source.", _REQUEST_TIMEOUT)
    except Exception as exc:
        log.warning("LinkedIn scrape failed: %s — skipping source.", exc)
    return jobs


def _scrape_indeed(keyword: str, max_jobs: int = 15) -> list[dict]:
    """Indeed India RSS feed — always-on, no bot detection."""
    jobs: list[dict] = []
    url = f"https://in.indeed.com/rss?q={quote(keyword)}&l=India&sort=date"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = root.findall(".//item")[:max_jobs]
        for item in items:
            raw_title = (item.findtext("title") or "").strip()
            if " - " in raw_title:
                parts = raw_title.split(" - ", 1)
                job_title = parts[0].strip()
                company = parts[1].strip()
            else:
                job_title = raw_title
                company = ""
            apply_url = (item.findtext("link") or "").strip()
            desc = item.findtext("description") or ""
            location = "India"
            for city, keywords in {
                "Bangalore": ["Bengaluru", "Bangalore"],
                "Mumbai": ["Mumbai"],
                "Hyderabad": ["Hyderabad"],
                "Pune": ["Pune"],
                "Delhi": ["Delhi", "Gurgaon", "Gurugram", "Noida"],
                "Chennai": ["Chennai"],
                "Remote": ["Remote", "Work from Home", "WFH"],
            }.items():
                if any(k.lower() in desc.lower() for k in keywords):
                    location = city
                    break
            if job_title and company:
                jobs.append(_job_record(
                    source="Indeed", title=job_title, company=company,
                    location=location, keyword=keyword, apply_url=apply_url,
                ))
        log.info("Indeed: %d jobs scraped", len(jobs))
    except requests.Timeout:
        log.warning("Indeed scrape timed out after %ds — skipping source.", _REQUEST_TIMEOUT)
    except Exception as exc:
        log.warning("Indeed scrape failed: %s — skipping source.", exc)
    return jobs


def _scrape_internshala(keyword: str, max_jobs: int = 15) -> list[dict]:
    """Internshala jobs page — scraper-friendly, no bot detection for requests."""
    jobs: list[dict] = []
    slug = keyword.strip().lower().replace(" ", "-")
    url = f"https://internshala.com/jobs/{slug}-jobs/"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select(".individual_internship")[:max_jobs]
        for card in cards:
            title_el = (
                card.select_one(".job-title-href")
                or card.select_one("h3.job-internship-name a")
                or card.select_one("h3 a")
            )
            company_el = (
                card.select_one(".company-name")
                or card.select_one(".internship-heading")
                or card.select_one("p.company-name")
            )
            location_el = (
                card.select_one(".locations span")
                or card.select_one(".row-1-item.locations a")
                or card.select_one(".location_link")
            )
            title = title_el.get_text(strip=True) if title_el else ""
            company = company_el.get_text(strip=True) if company_el else ""
            location = location_el.get_text(strip=True) if location_el else "India"
            href = title_el.get("href", "") if title_el else ""
            apply_url = (
                f"https://internshala.com{href}" if href.startswith("/") else href
            )
            if title and company:
                jobs.append(_job_record(
                    source="Internshala", title=title, company=company,
                    location=location, keyword=keyword, apply_url=apply_url,
                ))
        log.info("Internshala: %d jobs scraped", len(jobs))
    except requests.Timeout:
        log.warning("Internshala scrape timed out after %ds — skipping source.", _REQUEST_TIMEOUT)
    except Exception as exc:
        log.warning("Internshala scrape failed: %s — skipping source.", exc)
    return jobs


def scrape_all_jobs(keyword: str = "software developer", max_per_source: int = 15) -> list[dict]:
    """Scrape all three sources independently. A failure in one never blocks others."""
    scraper_mode = os.getenv("SCRAPER_ENABLED", "false").lower() == "true"
    if not scraper_mode:
        log.info("SCRAPER_ENABLED is false. Skipping live scraping.")
        return []

    all_jobs: list[dict] = []

    log.info("Scraping LinkedIn for '%s' ...", keyword)
    all_jobs.extend(_scrape_linkedin(keyword, max_per_source))

    log.info("Scraping Indeed India for '%s' ...", keyword)
    all_jobs.extend(_scrape_indeed(keyword, max_per_source))

    log.info("Scraping Internshala for '%s' ...", keyword)
    all_jobs.extend(_scrape_internshala(keyword, max_per_source))

    all_jobs = _dedupe_jobs(all_jobs)

    for index, job in enumerate(all_jobs):
        job["id"] = 1000 + index

    _save_scraped_jobs(keyword, all_jobs)
    log.info("Scrape complete — %d unique jobs.", len(all_jobs))
    return all_jobs


def load_scraped_jobs(keyword: str | None = None) -> list[dict]:
    if not os.path.exists(_SCRAPED_FILE):
        return []

    try:
        with open(_SCRAPED_FILE, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return []

    if isinstance(payload, list):
        return _dedupe_jobs(payload)

    if isinstance(payload, dict):
        cached_keyword = str(payload.get("keyword", "")).strip().lower()
        if keyword and cached_keyword and cached_keyword != keyword.strip().lower():
            return []
        jobs = payload.get("jobs")
        if isinstance(jobs, list):
            return _dedupe_jobs(jobs)

    return []
