"use client";

import { useEffect, useState, useMemo } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getUserProfile } from "@/lib/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { getJobMeta } from "@/lib/job-meta";
import { CheckCircle, Activity, Briefcase, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

interface JobRecommendation {
  id: number;
  title: string;
  company: string;
  description: string;
  matchScore: number;
  missingSkills: string[];
  matchedSkills: string[];
  source?: string;
  applyUrl?: string;
}

interface RecommendationData {
  recommendations: JobRecommendation[];
  skills: string[];
  count?: number;
}

function DashboardContent() {
  const [noResume, setNoResume] = useState<boolean>(false);
  
  useEffect(() => {
    const raw = sessionStorage.getItem("careerBuilderData");
    setNoResume(!raw || raw === "null");
  }, []);
  const [data, setData] = useState<RecommendationData | null>(null);
  const [dbSkills, setDbSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(!noResume);
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    const role = getUserProfile()?.role;
    if (role === "recruiter") { router.push("/select-role"); return; }
    
    const sessionData = sessionStorage.getItem("careerBuilderData");
    if (sessionData) setData(JSON.parse(sessionData));

    import("@/lib/api").then(({ default: api }) => {
      api.get("/api/user/profile")
        .then(res => {
          const data = res.data?.data || res.data;
          if (data?.resume?.skills) {
            setDbSkills(data.resume.skills);
          }
        })
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));

  }, [router]);

  const recs        = useMemo(() => data?.recommendations ?? [], [data]);
  const resumeSkills = useMemo(() => dbSkills.length > 0 ? dbSkills : (data?.skills ?? []), [data, dbSkills]);

  const totalAnalyzed = recs.length > 0 ? Math.max(recs.length * 5, 250) : 0;
  const avgMatch = useMemo(
    () => Math.round(recs.reduce((a: number, r) => a + r.matchScore, 0) / (recs.length || 1)),
    [recs],
  );

  const skillsFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    recs.forEach((r) => {
      (r.missingSkills ?? []).forEach((s: string) => { freq[s] = (freq[s] || 0) + 1; });
    });
    return freq;
  }, [recs]);

  const demandedChartData = useMemo(
    () =>
      Object.entries(skillsFreq)
        .map(([skill, count]) => ({ name: skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7),
    [skillsFreq],
  );

  const skillGapData = useMemo(
    () =>
      Object.entries(skillsFreq)
        .map(([skill, count]) => ({ skill, pct: Math.round((count / (recs.length || 1)) * 100) }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 6),
    [skillsFreq, recs.length],
  );

  const pieData = useMemo(() => {
    const typesFreq: Record<string, number> = { Remote: 0, Hybrid: 0, "On-site": 0 };
    recs.forEach((r) => {
      const meta = getJobMeta(r.id);
      if (typesFreq[meta.jobType] !== undefined) typesFreq[meta.jobType] += 1;
    });
    return [
      { name: "Remote",   value: typesFreq["Remote"],   color: "#0D9488" },
      { name: "Hybrid",   value: typesFreq["Hybrid"],   color: "#3b82f6" },
      { name: "On-site",  value: typesFreq["On-site"],  color: "#f59e0b" },
    ].filter(d => d.value > 0);
  }, [recs]);

  if (noResume) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6">
          Upload your resume first to see your analytics
        </p>
        <Link href="/upload" className="btn-primary">Upload Resume</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-accent/20 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!data || recs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto text-center min-h-[70vh]">
        <div className="w-64 h-64 mb-8 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700">
          <svg className="w-32 h-32 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">No Analytics Available</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Upload your resume to generate a personalized job recommendation dashboard.</p>
        <Link href="/upload" className="btn-primary">Upload Resume</Link>
      </div>
    );
  }

  const kpis = [
    {
      label: "Jobs Analyzed",
      value: `${totalAnalyzed}+`,
      icon: <Activity className="w-6 h-6" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-500",
      border: "border-l-blue-500",
    },
    {
      label: "Avg Match Score",
      value: `${avgMatch}%`,
      icon: <CheckCircle className="w-6 h-6" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-500",
      border: "border-l-green-500",
    },
    {
      label: "Top Matches Found",
      value: recs.length,
      icon: <Briefcase className="w-6 h-6" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      iconColor: "text-purple-500",
      border: "border-l-purple-500",
    },
    {
      label: "Extracted Skills",
      value: resumeSkills.length,
      icon: <FileText className="w-6 h-6" />,
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
      iconColor: "text-orange-500",
      border: "border-l-orange-500",
    },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden bg-gradient-to-r from-accent to-teal-400 rounded-2xl px-6 sm:px-8 py-6 mb-8 shadow-lg"
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-teal-100 text-sm font-medium mb-0.5">Good to see you back</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Hello {userName}, here&apos;s your career snapshot
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-extrabold text-2xl leading-none">{avgMatch}%</p>
              <p className="text-teal-100 text-xs mt-0.5">Avg match</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-extrabold text-2xl leading-none">{recs.length}</p>
              <p className="text-teal-100 text-xs mt-0.5">Jobs found</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
      >
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={CARD_VARIANTS}
            className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 border-l-4 ${kpi.border} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-4`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* Demanded Skills Bar Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Highest Demanded Market Skills</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(13,148,136,0.05)" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} barSize={36} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Skill Gaps horizontal bar chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Top Skill Gaps</h3>
              <Link href="/skill-gap" className="text-xs font-semibold text-accent hover:underline">
                Full analysis →
              </Link>
            </div>
            <div className="h-[280px] w-full">
              {skillGapData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No skill gap data — upload your resume first.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillGapData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="skill" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={80} />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(37,99,235,0.05)" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
                    />
                    <Bar dataKey="pct" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={24} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Job Modality Pie */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Matched Job Modality</h3>
            <div className="flex flex-col md:flex-row items-center justify-center h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-row md:flex-col justify-center gap-4 mt-4 md:mt-0 md:ml-6 w-full md:w-auto shrink-0">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{d.name}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white ml-auto pl-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your Resume Skills</h3>
            <div className="flex flex-wrap gap-2">
              {resumeSkills.map((s: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-accent/10 text-accent rounded-lg text-xs font-semibold border border-accent/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-accent to-teal-400 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 -translate-x-8 translate-y-8 w-32 h-32 bg-black/10 rounded-full blur-xl" />
            <h3 className="text-lg font-bold mb-2 relative z-10">Ready to level up?</h3>
            <p className="text-teal-100 text-sm mb-5 relative z-10 leading-relaxed">
              Adding <strong className="text-white bg-black/20 px-1 rounded">{demandedChartData[0]?.name || "new skills"}</strong> could boost your match rate significantly.
            </p>
            <Link
              href="/jobs"
              className="inline-block relative z-10 bg-white text-accent px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:shadow-xl hover:scale-105 transition-all"
            >
              View Recommended Jobs
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: "/upload",    label: "Re-upload Resume",          color: "text-accent" },
                { href: "/skill-gap", label: "View Full Skill Gap Report", color: "text-purple-600 dark:text-purple-400" },
                { href: "/tracker",   label: "Application Tracker",        color: "text-blue-600 dark:text-blue-400" },
              ].map(({ href, label, color }) => (
                <Link
                  key={href}
                  href={href}
                  className={`block text-sm font-semibold ${color} hover:underline py-1`}
                >
                  {label} →
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <DashboardContent />
    </AuthGuard>
  );
}
