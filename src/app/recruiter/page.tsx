"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Users, Loader2, BookmarkCheck, Activity, Briefcase, FileText, X, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "@/components/Toast";
import api from "@/lib/api";
import { getUserProfile } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

interface ShortlistedCandidate {
  notification_id: number;
  job_title: string;
  company: string;
  shortlisted_at: string;
  candidate_id: number;
  candidate_name: string;
  candidate_email?: string;
  skills: string[];
  resume_snippet: string;
  resume_text?: string;
}

interface Candidate {
  id: number;
  name: string;
  email?: string;
  experience: string;
  matchScore: number;
  missingSkills?: string[];
  matchedSkills?: string[];
  resume_text?: string;
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

function RecruiterDashboardView({ shortlisted }: { shortlisted: ShortlistedCandidate[] }) {
  const profile = getUserProfile();
  const userName = profile?.name?.split(" ")[0] ?? "Recruiter";

  const totalShortlisted = shortlisted.length;

  const uniqueSkillsCount = useMemo(() => {
    const allSkills = new Set<string>();
    shortlisted.forEach(c => c.skills?.forEach(s => allSkills.add(s.toLowerCase())));
    return allSkills.size;
  }, [shortlisted]);

  const uniqueJobsCount = useMemo(() => {
    const allJobs = new Set<string>();
    shortlisted.forEach(c => allJobs.add(c.job_title.toLowerCase()));
    return allJobs.size;
  }, [shortlisted]);

  const topSkillsData = useMemo(() => {
    const freq: Record<string, number> = {};
    shortlisted.forEach(c => {
      c.skills?.forEach(s => {
        const lower = s.toLowerCase();
        freq[lower] = (freq[lower] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [shortlisted]);

  const jobTitlesData = useMemo(() => {
    const freq: Record<string, number> = {};
    shortlisted.forEach(c => {
      freq[c.job_title] = (freq[c.job_title] || 0) + 1;
    });
    const colors = ["#0D9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];
    return Object.entries(freq)
      .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [shortlisted]);

  const kpis = [
    {
      label: "Candidates Shortlisted",
      value: totalShortlisted,
      icon: <Users className="w-6 h-6" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-500",
      border: "border-l-blue-500",
    },
    {
      label: "Unique Skills Sourced",
      value: uniqueSkillsCount,
      icon: <FileText className="w-6 h-6" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-500",
      border: "border-l-green-500",
    },
    {
      label: "Unique Roles Filled",
      value: uniqueJobsCount,
      icon: <Briefcase className="w-6 h-6" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      iconColor: "text-purple-500",
      border: "border-l-purple-500",
    },
  ];

  if (totalShortlisted === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-24 h-24 mb-6 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700">
          <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Analytics Yet</h2>
        <p className="text-gray-500 max-w-md">Your dashboard will populate with insights once you start shortlisting candidates from the search tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full mt-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl px-6 sm:px-8 py-6 shadow-lg"
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-0.5">Recruiter Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Hello {userName}, here&apos;s your recruitment snapshot
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-extrabold text-2xl leading-none">{totalShortlisted}</p>
              <p className="text-blue-100 text-xs mt-0.5">Shortlisted</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={CARD_VARIANTS}
            className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 border-l-4 ${kpi.border} shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4`}
          >
            <div className={`w-12 h-12 rounded-full ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor} shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Most Sourced Skills</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkillsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: "rgba(37,99,235,0.05)" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={36} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Roles Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Shortlisted Roles Breakdown</h3>
          <div className="flex flex-col md:flex-row items-center justify-center h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobTitlesData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={800}
                >
                  {jobTitlesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-row md:flex-col flex-wrap justify-center gap-3 mt-4 md:mt-0 md:ml-6 w-full md:w-auto shrink-0 max-h-[200px] overflow-y-auto">
              {jobTitlesData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 max-w-[120px] truncate" title={d.name}>{d.name}</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white ml-auto pl-2">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruiterContent() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "shortlisted">("dashboard");
  const [selectedCandidate, setSelectedCandidate] = useState<ShortlistedCandidate | null>(null);
  const [shortlisted, setShortlisted] = useState<ShortlistedCandidate[]>([]);
  const [loadingShortlisted, setLoadingShortlisted] = useState(false);

  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [candidates,    setCandidates]    = useState<Candidate[]>([]);
  const [jobTitle,      setJobTitle]      = useState("");
  const [company,       setCompany]       = useState("");
  const [requirements,  setRequirements]  = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);

  const PAGE_SIZE = 10;

  const fetchPage = async (page: number, append: boolean) => {
    const { data: responseBody } = await api.post("/api/recruit_candidates", {
      jobDescription: requirements,
      page,
      page_size: PAGE_SIZE,
    });
    const data = responseBody.data || responseBody;
    const newCandidates: Candidate[] = data.candidates ?? [];
    setCandidates(prev => append ? [...prev, ...newCandidates] : newCandidates);
    setHasMore(data.has_more ?? false);
    setTotal(data.total ?? newCandidates.length);
    setCurrentPage(page);
  };

  const handleSearch = async () => {
    if (!requirements || !jobTitle) return;

    setLoading(true);
    try {
      await fetchPage(1, false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.error ?? "Failed to search candidates";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchPage(currentPage + 1, true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast(axiosErr?.response?.data?.error ?? "Failed to load more", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (activeTab === "shortlisted" || activeTab === "dashboard") {
      const fetchShortlisted = async () => {
        setLoadingShortlisted(true);
        try {
          const { data } = await api.get("/api/recruiter/shortlisted");
          setShortlisted(data.data?.shortlisted || data.shortlisted || []);
        } catch (err) {
          toast("Failed to load shortlisted candidates", "error");
        } finally {
          setLoadingShortlisted(false);
        }
      };
      void fetchShortlisted();
    }
  }, [activeTab]);

  const handleShortlist = async (candidateId: number) => {
    const profile = getUserProfile();
    if (!profile) { toast("Not logged in", "error"); return; }

    const candidate = candidates.find(c => c.id === candidateId);

    try {
      await api.post("/api/shortlist", {
        candidate_id:    String(candidateId),
        job_title:       jobTitle,
        company:         company || "Our Company",
        recruiter_name:  profile.name,
        recruiter_email: profile.email,
        required_skills: candidate?.matchedSkills ?? [],
      });
      toast("Candidate shortlisted successfully!", "success");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.error ?? "Failed to shortlist";
      toast(msg, "error");
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
      <div className="mb-8 border-b pb-8 border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-3">
            <Users className="w-4 h-4" />
            <span>Recruiter Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Find Top Talent</h1>
          <p className="text-gray-500 mt-2">Enter your job requirements to semantically match candidates.</p>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 font-bold rounded-xl transition-colors ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-2 font-bold rounded-xl transition-colors ${activeTab === "search" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              Search Candidates
            </button>
            <button
              onClick={() => setActiveTab("shortlisted")}
              className={`px-4 py-2 font-bold rounded-xl transition-colors ${activeTab === "shortlisted" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              Shortlisted Candidates
            </button>
          </div>
        </div>

        {activeTab === "dashboard" && <RecruiterDashboardView shortlisted={shortlisted} />}

        {activeTab === "search" && (
        <form onSubmit={(e) => { e.preventDefault(); void handleSearch(); }} className="w-full md:w-[500px] flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <input
            required
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none"
            placeholder="Job Title (e.g., Frontend React Dev)"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <input
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none"
            placeholder="Company Name (e.g., Acme Corp)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <textarea
            required
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none"
            placeholder="Paste Job Requirements / Skills here..."
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Analyzing candidates..." : "Match Candidates"}
          </button>
        </form>
        )}
      </div>

      {activeTab === "search" && (
        <>
      {candidates.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
          Showing <span className="font-bold text-gray-900 dark:text-white">{candidates.length}</span> of{" "}
          <span className="font-bold text-gray-900 dark:text-white">{total}</span> candidates
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{candidate.name}</h3>
                  </div>
                </div>
                <div className="relative flex items-center justify-center w-10 h-10 text-green-500">
                  <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-200 dark:text-gray-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="stroke-current transition-all duration-1000 ease-out" strokeWidth="3" strokeDasharray={`${candidate.matchScore}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300">{candidate.matchScore}%</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{candidate.resume_text}</p>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">Matched Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.matchedSkills?.map((s) => (
                      <span key={s} className="text-[10px] uppercase font-bold px-1.5 py-[2px] bg-green-50 text-green-600 rounded border border-green-200">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">Missing Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.missingSkills?.length
                      ? candidate.missingSkills.map((s) => (
                          <span key={s} className="text-[10px] uppercase font-bold px-1.5 py-[2px] bg-red-50 text-red-500 rounded border border-red-200">{s}</span>
                        ))
                      : <span className="text-[10px] text-gray-400 italic">None</span>}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => void handleShortlist(candidate.id)}
              className="w-full min-h-[44px] py-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 hover:border-blue-600 font-bold rounded-xl transition-colors text-sm"
            >
              Shortlist Candidate
            </button>
          </div>
        ))}

        {!loading && candidates.length === 0 && (
          <div className="col-span-full py-20 flex flex-col flex-1 items-center justify-center text-center">
            <Search className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Candidates Found</h3>
            <p className="text-gray-500 text-sm">Enter requirements and search to view semantic matches.</p>
          </div>
        )}
      </div>

      {candidates.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {hasMore ? (
            <button
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-70 transition-colors"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : (
            <p className="text-sm text-gray-400 font-medium">All {total} candidates loaded</p>
          )}
        </div>
      )}
        </>
      )}

      {activeTab === "shortlisted" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingShortlisted ? (
            <div className="col-span-full py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : shortlisted.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col flex-1 items-center justify-center text-center">
              <BookmarkCheck className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No Shortlisted Candidates</h3>
              <p className="text-gray-500 text-sm">You haven't shortlisted anyone yet.</p>
            </div>
          ) : (
            shortlisted.map((s) => (
              <div key={s.notification_id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-blue-100 dark:border-blue-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {s.candidate_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{s.candidate_name}</h3>
                        <p className="text-xs text-gray-500">{s.candidate_email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-500 mb-1">Shortlisted For</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.job_title} @ {s.company}</p>
                    <p className="text-[10px] text-gray-400 mt-1">On {new Date(s.shortlisted_at).toLocaleDateString()}</p>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{s.resume_snippet}</p>

                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="text-xs font-bold text-gray-400 mb-1">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {s.skills?.map((skill) => (
                          <span key={skill} className="text-[10px] uppercase font-bold px-1.5 py-[2px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setSelectedCandidate(s)}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <FileText className="w-4 h-4" /> View Resume
                    </button>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${s.candidate_email}&su=${encodeURIComponent(`Regarding your application for ${s.job_title} at ${s.company}`)}`}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    >
                      <Mail className="w-4 h-4" /> Email Candidate
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal for Full Resume */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{selectedCandidate.candidate_name}'s Resume</h3>
                <p className="text-xs text-gray-500">{selectedCandidate.candidate_email}</p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedCandidate.resume_text ? (
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  {selectedCandidate.resume_text}
                </div>
              ) : (
                <p className="text-gray-500 text-center italic py-10">No full resume text available.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedCandidate.candidate_email}&su=${encodeURIComponent(`Regarding your application for ${selectedCandidate.job_title} at ${selectedCandidate.company}`)}`}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" /> Contact {selectedCandidate.candidate_name.split(' ')[0]}
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function RecruiterPage() {
  return (
    <AuthGuard requiredRole="recruiter">
      <RecruiterContent />
    </AuthGuard>
  );
}
