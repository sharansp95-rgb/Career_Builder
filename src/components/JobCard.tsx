"use client";

import React, { useEffect, useState, memo } from "react";
import { MapPin, ExternalLink, Bookmark, ChevronDown, ChevronUp, Info } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { toast } from "@/components/Toast";
import { getCompanyData } from "@/lib/company-reviews";

interface JobCardProps {
  id: number;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  source?: string;
  description?: string;
  applyUrl?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  salaryLpa?: number;
  onTrack?: (job: { id: number; title: string; company: string; location: string; matchScore: number }) => void;
}

function companyColor(name: string): string {
  const palette = [
    "bg-violet-500", "bg-blue-500", "bg-orange-500", "bg-rose-500",
    "bg-teal-500", "bg-amber-500", "bg-indigo-500", "bg-cyan-500",
    "bg-pink-500", "bg-lime-600",
  ];
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  const cls = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className={`${cls} text-amber-400`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.172c.969 0 1.371 1.24.588 1.81l-3.375 2.452a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.375-2.452a1 1 0 00-1.175 0l-3.375 2.452c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.172a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
      {half && (
        <svg className={`${cls} text-amber-400`} fill="currentColor" viewBox="0 0 20 20">
          <defs><linearGradient id="half"><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
          <path fill="url(#half)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.172c.969 0 1.371 1.24.588 1.81l-3.375 2.452a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.375-2.452a1 1 0 00-1.175 0l-3.375 2.452c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.172a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className={`${cls} text-gray-300 dark:text-gray-600`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.172c.969 0 1.371 1.24.588 1.81l-3.375 2.452a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.375-2.452a1 1 0 00-1.175 0l-3.375 2.452c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.172a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
    </span>
  );
}

function EstimateTooltip({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Estimation note"
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-800 text-white text-[11px] leading-relaxed px-3 py-2 z-50 pointer-events-none shadow-lg">
          Estimated based on industry averages for this role and location.
        </span>
      )}
    </span>
  );
}

export const JobCard = memo(function JobCard({
  id,
  title,
  company,
  location,
  matchScore,
  source,
  description,
  applyUrl,
  matchedSkills,
  missingSkills,
  salaryLpa,
  onTrack,
}: JobCardProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const companyData = getCompanyData(company);
  const initials = company.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  useEffect(() => {
    setBookmarked(isBookmarked(id));
  }, [id]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleBookmark({ id, title, company, location, matchScore, source, description, applyUrl });
    setBookmarked(result === "saved");
    toast(result === "saved" ? "Job saved!" : "Job removed!", result === "saved" ? "success" : "info");
  };

  const fallbackUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`;
  const href = applyUrl || fallbackUrl;

  const scoreColor = matchScore >= 70 ? "text-green-500" : matchScore >= 40 ? "text-orange-500" : "text-red-500";

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-accent/30 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header row */}
        <div className="flex justify-between items-start mb-4">
          <div className={`${companyColor(company)} w-12 h-12 flex items-center justify-center rounded-xl shrink-0 shadow-sm`}>
            <span className="text-white font-bold text-sm tracking-wide">{initials}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Animated match score ring */}
            <div className={`relative flex items-center justify-center w-10 h-10 ${scoreColor}`}>
              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-200 dark:text-gray-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="stroke-current transition-all duration-1000 ease-out"
                  strokeWidth="3"
                  strokeDasharray={`${matchScore}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300">{matchScore}%</span>
            </div>
            <button
              onClick={handleBookmark}
              title={bookmarked ? "Remove bookmark" : "Save job"}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bookmark className={`w-4 h-4 transition-colors ${bookmarked ? "fill-accent text-accent" : "text-gray-400 hover:text-accent"}`} />
            </button>
          </div>
        </div>

        {/* Matched / missing skills */}
        {matchedSkills && matchedSkills.length > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1 -mt-1">
            ✔ Matched: {matchedSkills.length > 4 ? `${matchedSkills.slice(0, 4).join(", ")} +${matchedSkills.length - 4} more` : matchedSkills.join(", ")}
          </p>
        )}
        {missingSkills && missingSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-red-500 font-semibold mr-1">❌ Missing:</span>
            {missingSkills.slice(0, 4).map((skill, i) => (
              <span key={i} className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-[2px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/50">
                {skill}
              </span>
            ))}
            {missingSkills.length > 4 && (
              <span className="text-[10px] font-bold text-red-400 px-1 py-[2px]">+{missingSkills.length - 4} more</span>
            )}
          </div>
        )}

        {/* Why this job? */}
        {matchedSkills && matchedSkills.length > 0 && (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-3 rounded-xl mb-4">
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed">
              <span className="font-bold mr-1">💡 Why this job?</span>
              This role aligns with your expertise in <strong>{matchedSkills.slice(0, 2).join(" and ")}</strong>.
            </p>
          </div>
        )}

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">{company}</p>

        {/* Star rating */}
        <div className="flex items-center gap-2 mb-0.5">
          <StarRating rating={companyData.rating} />
          <span className="text-sm font-bold text-amber-500">{companyData.rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({companyData.reviewCount.toLocaleString()} reviews)</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mb-2">Community estimate</p>

        {/* Review snippet */}
        <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-3 leading-relaxed">
          &ldquo;{companyData.reviews[0].text}&rdquo;
          {companyData.reviews[1] && <> &middot; &ldquo;{companyData.reviews[1].text}&rdquo;</>}
        </p>

        <button
          onClick={() => setShowReviews((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover mb-3 transition-colors"
        >
          {showReviews ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showReviews ? "Hide reviews" : "See reviews"}
        </button>

        {showReviews && (
          <div className="mb-4 space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            {companyData.reviews.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5"><StarRating rating={r.rating} size="xs" /></div>
                <div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{r.author}: </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 italic">&ldquo;{r.text}&rdquo;</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {source && (
          <div className="mb-3 inline-flex w-fit items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {source}
          </div>
        )}

        {/* Location + salary */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
            <MapPin className="w-4 h-4 shrink-0" />
            <EstimateTooltip>
              <span>{location}</span>
            </EstimateTooltip>
          </div>
          {salaryLpa !== undefined && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <EstimateTooltip>
                <span className="font-semibold text-gray-700 dark:text-gray-300">~₹{salaryLpa} LPA</span>
                <em className="text-[10px] text-gray-400 ml-0.5 not-italic italic">Estimated</em>
              </EstimateTooltip>
            </div>
          )}
        </div>

        {description && (
          <p className="mb-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {description.length > 120 ? `${description.slice(0, 120)}…` : description}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {onTrack && (
          <button
            onClick={() => onTrack({ id, title, company, location, matchScore })}
            className="flex-1 flex items-center justify-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent font-semibold py-3 rounded-xl transition-all text-sm"
          >
            + Track
          </button>
        )}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`${onTrack ? "flex-1" : "w-full"} flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-accent hover:text-white text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-xl transition-all active:scale-95 group-hover:shadow-md`}
        >
          {applyUrl ? "Apply Now" : "Search on LinkedIn"}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
});

/* ── Skeleton ──────────────────────────────────────────────────────────────── */

export const JobCardSkeleton = memo(function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
      <div className="flex gap-1 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        ))}
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-6" />
      <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
});
