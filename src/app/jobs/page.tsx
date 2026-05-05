"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { JobCard, JobCardSkeleton } from "@/components/JobCard";
import { getJobMeta, type JobType, type ExperienceLevel } from "@/lib/job-meta";
import { getCompanyData } from "@/lib/company-reviews";
import {
  Sparkles, AlertCircle, SearchX, UploadCloud,
  Radar, RefreshCcw, SlidersHorizontal, X, Loader2, TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getUserProfile } from "@/lib/auth";
import { toast } from "@/components/Toast";
import AuthGuard from "@/components/AuthGuard";

// ── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  description: string;
  source?: string;
  url?: string;
  applyUrl?: string;
  missingSkills?: string[];
  matchedSkills?: string[];
}

const ALL_LOCATIONS = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Remote"] as const;
const ALL_JOB_TYPES: JobType[] = ["Remote", "Hybrid", "On-site"];
const ALL_EXP_LEVELS: ExperienceLevel[] = ["Fresher", "1-3 yrs", "3-5 yrs", "5+ yrs"];

interface Filters {
  jobTypes: JobType[];
  salaryMin: number;
  salaryMax: number;
  minRating: number | null;
  location: string;
  experienceLevels: ExperienceLevel[];
  companyType: string;
  datePosted: string;
}

const DEFAULT_FILTERS: Filters = {
  jobTypes: [], salaryMin: 0, salaryMax: 50,
  minRating: null, location: "",
  experienceLevels: [], companyType: "", datePosted: "",
};

// ── Scraper progress messages ─────────────────────────────────────────────────

const SCRAPER_MSGS = [
  "Scanning LinkedIn…",
  "Scanning Indeed…",
  "Scanning Internshala…",
  "Ranking matches with AI…",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ScraperLoadingState() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % SCRAPER_MSGS.length), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-accent/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-base font-semibold text-accent"
          >
            {SCRAPER_MSGS[msgIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="text-sm text-gray-400 dark:text-gray-500">This may take a few seconds</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mt-4">
        {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-2xl flex flex-col items-center max-w-sm w-full text-center border border-red-100 dark:border-red-800 shadow-sm">
        <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
        <h2 className="text-xl font-bold mb-2">Connection Error</h2>
        <p className="text-sm font-medium mb-6">{message}</p>
        <Link href="/upload" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95">
          <UploadCloud className="w-4 h-4" /> Try again
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">No matches found</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 text-sm leading-relaxed">
        Try adjusting your filters or upload a more detailed resume.
      </p>
      <Link href="/upload" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95">
        <UploadCloud className="w-4 h-4" /> Upload a new resume
      </Link>
    </div>
  );
}

// ── Filters sidebar ───────────────────────────────────────────────────────────

function FiltersPanel({ filters, onChange, onClear, activeCount }: {
  filters: Filters; onChange: (f: Filters) => void; onClear: () => void; activeCount: number;
}) {
  const toggle = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-accent" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">Filters</span>
          {activeCount > 0 && <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeCount}</span>}
        </div>
        {activeCount > 0 && (
          <button onClick={onClear} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
            <X className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>

      {/* Job Type */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Job Type</p>
        <div className="flex flex-col gap-2">
          {ALL_JOB_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={filters.jobTypes.includes(type)} onChange={() => onChange({ ...filters, jobTypes: toggle(filters.jobTypes, type) })} className="w-4 h-4 rounded accent-accent cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-accent transition-colors">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Salary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Salary (est.)</p>
          <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">₹{filters.salaryMin}–{filters.salaryMax} LPA</span>
        </div>
        <div className="space-y-3">
          {[{ label: "Min", key: "salaryMin" as const }, { label: "Max", key: "salaryMax" as const }].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
              <input type="range" min="0" max="50" step="2" value={filters[key]}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (key === "salaryMin") onChange({ ...filters, salaryMin: Math.min(val, filters.salaryMax - 2) });
                  else onChange({ ...filters, salaryMax: Math.max(val, filters.salaryMin + 2) });
                }}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent" />
            </div>
          ))}
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Min. Rating</p>
        <div className="flex flex-col gap-2">
          {([null, 3, 4] as const).map((rating) => (
            <label key={String(rating)} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="rating" checked={filters.minRating === rating} onChange={() => onChange({ ...filters, minRating: rating })} className="w-4 h-4 accent-accent cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-accent transition-colors">{rating === null ? "Any rating" : `${rating}★ and above`}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Location</p>
        <select value={filters.location} onChange={(e) => onChange({ ...filters, location: e.target.value })}
          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer">
          <option value="">All locations</option>
          {ALL_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      {/* Experience */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Experience</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="radio" name="experience" checked={filters.experienceLevels.length === 0} onChange={() => onChange({ ...filters, experienceLevels: [] })} className="w-4 h-4 accent-accent cursor-pointer" />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-accent transition-colors">Any Experience</span>
          </label>
          {ALL_EXP_LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="experience" checked={filters.experienceLevels.length === 1 && filters.experienceLevels[0] === level} onChange={() => onChange({ ...filters, experienceLevels: [level] })} className="w-4 h-4 accent-accent cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-accent transition-colors">{level}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Company Type */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Company Type</p>
        <div className="flex gap-2 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-xl">
          {["", "Startup", "MNC"].map((type) => (
            <button key={type} onClick={() => onChange({ ...filters, companyType: type })}
              className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${filters.companyType === type ? "bg-white dark:bg-gray-600 shadow-sm text-accent" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {type || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Date Posted */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Date Posted</p>
        <div className="flex flex-col gap-2">
          {[{ label: "Any time", val: "" }, { label: "Past 24 hours", val: "24h" }, { label: "Past week", val: "7d" }, { label: "Past month", val: "30d" }].map((t) => (
            <label key={t.val} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="datePosted" checked={filters.datePosted === t.val} onChange={() => onChange({ ...filters, datePosted: t.val })} className="w-4 h-4 accent-accent cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-accent transition-colors">{t.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState("static");
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const role = getUserProfile()?.role;
    if (role === "recruiter") router.push("/select-role");
  }, [router]);

  const loadRecommendations = useCallback(async (refreshLiveJobs = false) => {
    try {
      const sessionData = sessionStorage.getItem("careerBuilderData");
      const parsed = sessionData ? JSON.parse(sessionData) : null;
      const skills: string[] = Array.isArray(parsed?.skills) ? parsed.skills : ["react", "javascript", "python"];
      const count: number = typeof parsed?.count === "number" ? parsed.count : 5;

      if (!refreshLiveJobs && parsed?.recommendations?.length > 0) {
        setJobs(parsed.recommendations);
        setWarning(null);
        setResultSource(parsed.source ?? "static");
        setKeyword(parsed.keyword ?? "");
        return;
      }

      const { data: responseBody } = await api.post("/api/recommend", {
        skills, count, job_source: "hybrid",
        refresh_live_jobs: refreshLiveJobs,
        keyword: parsed?.keyword ?? "",
      });

      const data = responseBody.data || responseBody;

      const recommendations: Job[] = data.recommendations ?? [];
      setJobs(recommendations);
      setWarning(data.warning ?? null);
      setResultSource(data.source ?? "static");
      setKeyword(data.keyword ?? "");

      sessionStorage.setItem("careerBuilderData", JSON.stringify({
        skills, count, recommendations,
        source: data.source ?? "static",
        keyword: data.keyword ?? "",
      }));
    } catch {
      setError("Failed to reach the backend. Please ensure it is running on port 5000.");
    }
  }, []);

  useEffect(() => {
    const load = async () => { await loadRecommendations(false); setLoading(false); };
    void load();
  }, [loadRecommendations]);

  const handleTrack = useCallback(async (job: { id: number; title: string; company: string; location: string; matchScore: number }) => {
    try {
      await api.post("/api/tracker", job);
      toast("Added to tracker!", "success");
    } catch {
      toast("Could not add to tracker", "error");
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadRecommendations(true);
    setRefreshing(false);
  };

  const filteredJobs = useMemo(() => {
    const seen = new Set<string>();
    const unique = jobs.filter((job) => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.filter((job) => {
      const meta = getJobMeta(job.id);
      const companyData = getCompanyData(job.company);
      const actualLocation = job.location || meta.location;
      const actualJobType = actualLocation.toLowerCase().includes("remote") 
        ? "Remote" 
        : actualLocation.toLowerCase().includes("hybrid") 
          ? "Hybrid" 
          : (meta.jobType === "Remote" ? "On-site" : meta.jobType);

      if (filters.jobTypes.length > 0 && !filters.jobTypes.includes(actualJobType)) return false;
      if (meta.salaryLpa < filters.salaryMin || meta.salaryLpa > filters.salaryMax) return false;
      if (filters.minRating !== null && companyData.rating < filters.minRating) return false;
      if (filters.location && actualLocation !== filters.location) return false;
      if (filters.experienceLevels.length > 0 && !filters.experienceLevels.includes(meta.experienceLevel)) return false;
      if (filters.companyType) {
        const MNCS = ["tcs", "infosys", "wipro", "adobe", "cognizant", "accenture", "ibm", "amazon", "microsoft", "google", "meta"];
        const isMnc = MNCS.some((m) => job.company.toLowerCase().includes(m));
        if ((isMnc ? "MNC" : "Startup") !== filters.companyType) return false;
      }
      if (filters.datePosted) {
        const daysAgo = job.id % 30;
        if (filters.datePosted === "24h" && daysAgo > 1) return false;
        if (filters.datePosted === "7d" && daysAgo > 7) return false;
        if (filters.datePosted === "30d" && daysAgo > 30) return false;
      }
      return true;
    });
  }, [jobs, filters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.jobTypes.length) n++;
    if (filters.salaryMin > 0 || filters.salaryMax < 50) n++;
    if (filters.minRating !== null) n++;
    if (filters.location) n++;
    if (filters.experienceLevels.length) n++;
    if (filters.companyType) n++;
    if (filters.datePosted) n++;
    return n;
  }, [filters]);

  if (loading) return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <ScraperLoadingState />
    </div>
  );
  if (error) return <ErrorState message={error} />;

  return (
    <div className="flex flex-col flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-bold mb-3">
            <Sparkles className="w-4 h-4" /><span>AI Matched</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Your Recommended Jobs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm sm:text-base">
            Analysed your resume and ranked live scraped jobs against it.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Live data indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 py-2 px-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-gray-900 dark:text-white font-bold">{filteredJobs.length}</span>
            {filteredJobs.length !== jobs.length && <span className="text-gray-400"> / {jobs.length}</span>}
            <span>jobs found</span>
            <span className="text-gray-400">· Updated just now</span>
          </div>

          <button type="button" onClick={() => void handleRefresh()} disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-wait disabled:opacity-70">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>

          <Link href="/upload" className="text-sm font-semibold text-accent hover:text-accent-hover hover:bg-accent/5 px-4 py-2 rounded-xl border border-accent/20 transition-all active:scale-95">
            New search
          </Link>

          <Link href="/skill-gap" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all">
            <TrendingUp className="w-4 h-4" /> Skill gaps →
          </Link>

          <button className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            onClick={() => setShowFiltersMobile((v) => !v)}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && <span className="bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* Source + keyword badges */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Radar className="h-4 w-4" />
          {resultSource === "hybrid" ? "Live + curated ranking" : resultSource === "live" ? "Live scraped jobs" : "Curated fallback jobs"}
        </div>
        {keyword && (
          <div className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            Keyword: <span className="font-semibold text-gray-900 dark:text-white">{keyword}</span>
          </div>
        )}
      </div>

      {warning && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </div>
      )}

      {/* Layout: sidebar + grid */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 overflow-y-auto">
          <FiltersPanel filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} activeCount={activeFilterCount} />
        </aside>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {showFiltersMobile && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40" onClick={() => setShowFiltersMobile(false)} />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }}
                className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-gray-900 dark:text-white">Filters</span>
                  <button onClick={() => setShowFiltersMobile(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <FiltersPanel filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} activeCount={activeFilterCount} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Job cards grid */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {refreshing ? (
            <ScraperLoadingState />
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job, idx) => {
                const meta = getJobMeta(job.id);
                const actualLocation = job.location || meta.location;
                const actualJobType = actualLocation.toLowerCase().includes("remote") 
                  ? "Remote" 
                  : actualLocation.toLowerCase().includes("hybrid") 
                    ? "Hybrid" 
                    : (meta.jobType === "Remote" ? "On-site" : meta.jobType);

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                  >
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        actualJobType === "Remote" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                          : actualJobType === "Hybrid" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                      }`}>{actualJobType}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">{meta.experienceLevel}</span>
                    </div>
                    <JobCard
                      id={job.id}
                      title={job.title}
                      company={job.company}
                      location={actualLocation}
                      matchScore={job.matchScore}
                      source={job.source}
                      description={job.description}
                      applyUrl={job.applyUrl ?? job.url}
                      matchedSkills={job.matchedSkills ?? []}
                      missingSkills={job.missingSkills}
                      salaryLpa={meta.salaryLpa}
                      onTrack={handleTrack}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <JobsContent />
    </AuthGuard>
  );
}
