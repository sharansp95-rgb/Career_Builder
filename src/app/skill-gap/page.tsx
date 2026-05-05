"use client";

import { useEffect, useState, useMemo } from "react";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, BookOpen, ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

interface SkillGap {
  skill: string;
  jobCount: number;
  resources: { label: string; url: string }[];
}

// Hardcoded learning resources mapped to skill keywords
const RESOURCE_MAP: Record<string, { label: string; url: string }[]> = {
  default: [
    { label: "Coursera", url: "https://www.coursera.org/search?query=" },
    { label: "YouTube", url: "https://www.youtube.com/results?search_query=" },
  ],
  "machine learning": [
    { label: "Coursera — ML Specialisation", url: "https://www.coursera.org/specializations/machine-learning-introduction" },
    { label: "YouTube — StatQuest", url: "https://www.youtube.com/c/joshstarmer" },
  ],
  "deep learning": [
    { label: "Coursera — Deep Learning Specialisation", url: "https://www.coursera.org/specializations/deep-learning" },
    { label: "YouTube — Andrej Karpathy", url: "https://www.youtube.com/@AndrejKarpathy" },
  ],
  "natural language processing": [
    { label: "Coursera — NLP Specialisation", url: "https://www.coursera.org/specializations/natural-language-processing" },
    { label: "YouTube — Hugging Face", url: "https://www.youtube.com/@HuggingFace" },
  ],
  "docker": [
    { label: "Play with Docker", url: "https://labs.play-with-docker.com/" },
    { label: "YouTube — TechWorld with Nana", url: "https://www.youtube.com/@TechWorldwithNana" },
  ],
  "kubernetes": [
    { label: "Kubernetes Official Docs", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" },
    { label: "YouTube — TechWorld with Nana", url: "https://www.youtube.com/@TechWorldwithNana" },
  ],
  "aws": [
    { label: "AWS Free Tier + Training", url: "https://aws.amazon.com/training/" },
    { label: "YouTube — Stephane Maarek", url: "https://www.youtube.com/results?search_query=stephane+maarek+aws" },
  ],
  "react": [
    { label: "Official React Docs", url: "https://react.dev/learn" },
    { label: "YouTube — Web Dev Simplified", url: "https://www.youtube.com/@WebDevSimplified" },
  ],
  "typescript": [
    { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    { label: "YouTube — Matt Pocock", url: "https://www.youtube.com/@mattpocockuk" },
  ],
  "postgresql": [
    { label: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/" },
    { label: "YouTube — Amigoscode", url: "https://www.youtube.com/results?search_query=amigoscode+postgresql" },
  ],
  "python": [
    { label: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/" },
    { label: "YouTube — Corey Schafer", url: "https://www.youtube.com/@coreyms" },
  ],
  "graphql": [
    { label: "GraphQL Official Docs", url: "https://graphql.org/learn/" },
    { label: "YouTube — Traversy Media", url: "https://www.youtube.com/results?search_query=graphql+traversy+media" },
  ],
};

function getResources(skill: string): { label: string; url: string }[] {
  const key = skill.toLowerCase();
  for (const [k, resources] of Object.entries(RESOURCE_MAP)) {
    if (k !== "default" && key.includes(k)) return resources;
  }
  // Build generic links using the skill name
  return [
    { label: `Coursera — ${skill}`, url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
    { label: `YouTube — ${skill} tutorial`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " tutorial")}` },
  ];
}

function SkillGapContent() {
  const [noResume, setNoResume] = useState<boolean>(false);
  
  useEffect(() => {
    const raw = sessionStorage.getItem("careerBuilderData");
    setNoResume(!raw || raw === "null");
  }, []);
  const [skills, setSkills] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<{ missingSkills?: string[]; title?: string }[]>([]);
  const [topJobTitle, setTopJobTitle] = useState("your target role");

  useEffect(() => {
    const raw = sessionStorage.getItem("careerBuilderData");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setSkills(parsed.skills ?? []);
      setRecommendations(parsed.recommendations ?? []);
      if (parsed.recommendations?.[0]?.title) setTopJobTitle(parsed.recommendations[0].title);
    } catch {
      // ignore
    }
  }, []);

  const skillGaps = useMemo<SkillGap[]>(() => {
    if (!recommendations.length) return [];
    const freq: Record<string, number> = {};
    const resumeSkillsLower = new Set(skills.map((s) => s.toLowerCase()));

    recommendations.slice(0, 5).forEach((rec) => {
      (rec.missingSkills ?? []).forEach((s) => {
        const key = s.toLowerCase();
        if (!resumeSkillsLower.has(key)) {
          freq[s] = (freq[s] ?? 0) + 1;
        }
      });
    });

    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .map(([skill, jobCount]) => ({ skill, jobCount, resources: getResources(skill) }));
  }, [skills, recommendations]);

  const hasData = skills.length > 0 || recommendations.length > 0;

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

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-accent transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Skill Gap Analysis</h1>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm sm:text-base">
        Skills required in your top 5 matched jobs that are missing from your resume.
      </p>

      {!hasData ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">No resume data found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Upload your resume first to see your skill gaps.</p>
          <Link href="/upload" className="btn-primary">Upload Resume</Link>
        </div>
      ) : skillGaps.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">No significant skill gaps!</h2>
          <p className="text-green-700 dark:text-green-400 text-sm">Your resume already covers the top required skills. Great job!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {skillGaps.map((gap, idx) => (
            <motion.div
              key={gap.skill}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.35 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Rank badge */}
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{gap.skill}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Required by <span className="font-semibold text-indigo-600 dark:text-indigo-400">{gap.jobCount}</span> of your top 5 matches
                    </p>
                    {/* Demand bar */}
                    <div className="mt-2 h-1.5 w-48 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                        style={{ width: `${(gap.jobCount / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Learn it</p>
                  {gap.resources.map((res) => (
                    <a key={res.url} href={res.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors">
                      <ExternalLink className="w-3 h-3" />{res.label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-xl font-bold mb-2">Ready to close the gap?</h3>
            <p className="text-indigo-100 text-sm mb-6">
              Ask CareerBot for a personalised study plan to get job-ready for <strong>{topJobTitle}</strong>.
            </p>
            <Link href="/jobs" className="inline-block bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-xl hover:scale-105 transition-all">
              Back to Jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillGapPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <SkillGapContent />
    </AuthGuard>
  );
}
