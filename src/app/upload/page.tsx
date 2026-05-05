"use client";

import { useState, useEffect } from "react";
import { UploadCloud, File, X, Sparkles, FileText, CheckCircle, Cpu, Zap } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

// ── Loading overlay ────────────────────────────────────────────────────────────

const TIPS = [
  { icon: "💡", category: "Resume Tip", text: "Keep your resume to 1 page if you have less than 5 years of experience." },
  { icon: "🎤", category: "Interview Tip", text: "Research the company before your interview — check their mission and recent news." },
  { icon: "🚀", category: "Skills Tip", text: 'Add measurable achievements — e.g. "Improved API speed by 40%".' },
  { icon: "⚡", category: "Job Search Tip", text: "Apply within 3 days of a job posting — early applicants get more callbacks." },
  { icon: "✍️", category: "Resume Tip", text: "Use action verbs — Built, Designed, Led, Improved, Automated." },
];

const STEPS = ["Parsing resume…", "Extracting skills…", "Running BERT model…", "Ranking jobs…"];

function LoadingOverlay({ currentStep }: { currentStep: number }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 7000;
    const tick = (now: number) => {
      const raw = Math.min((now - start) / duration, 1);
      setProgress(Math.min((1 - Math.pow(1 - raw, 2)) * 95, 95));
      if (now - start < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 1600);
    return () => clearInterval(id);
  }, []);

  const tip = TIPS[tipIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStep === 1 ? <FileText className="w-8 h-8 text-accent" /> : <Sparkles className="w-8 h-8 text-accent" />}
        </div>
      </div>

      <p className="text-sm font-semibold text-accent mb-2 tracking-wide uppercase">{STEPS[stepIndex]}</p>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i < stepIndex ? "w-3 h-3 bg-accent" : i === stepIndex ? "w-4 h-4 bg-accent ring-2 ring-accent/30" : "w-3 h-3 bg-gray-200 dark:bg-gray-600"}`} />
        ))}
      </div>

      <div className="w-full max-w-md mb-8">
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-teal-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{Math.round(progress)}%</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tipIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="w-full max-w-md bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">{tip.icon}</p>
          <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">{tip.category}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tip.text}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── How it works ───────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  { icon: <UploadCloud className="w-7 h-7" />, title: "Upload PDF", desc: "Drop your resume (max 5 MB) and we extract the text instantly." },
  { icon: <Cpu className="w-7 h-7" />, title: "AI Extracts Skills", desc: "BERT model identifies all tech skills from your resume text." },
  { icon: <Zap className="w-7 h-7" />, title: "Get Ranked Jobs", desc: "Live jobs from LinkedIn, Indeed & Internshala ranked by match score." },
];

// ── Main page ──────────────────────────────────────────────────────────────────

function UploadContent() {
  const [file, setFile] = useState<File | null>(null);
  const [recommendations, setRecommendations] = useState(5);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (acceptedFiles, fileRejections) => {
      setError(null);
      if (fileRejections.length > 0) {
        setError(fileRejections[0].errors[0].message || "Invalid file.");
        return;
      }
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const handleSubmit = async () => {
    if (!file) { setError("Please select a PDF file first."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("File too large. Maximum size is 5 MB."); return; }

    setLoading(true);
    setError(null);

    try {
      setLoadingStep(1);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/api/upload", formData);
      const uploadData = uploadRes.data.data || uploadRes.data;
      const skills: string[] = uploadData.skills ?? [];
      if (skills.length === 0) throw new Error("No recognisable skills found. Try a more detailed PDF.");

      setLoadingStep(2);

      const { data: recRes } = await api.post("/api/recommend", {
        skills, count: recommendations, job_source: "hybrid", refresh_live_jobs: false,
      });
      const recData = recRes.data || recRes;

      sessionStorage.setItem("careerBuilderData", JSON.stringify({
        skills,
        count: recommendations,
        recommendations: recData.recommendations ?? [],
        source: recData.source ?? "static",
        keyword: recData.keyword ?? "",
        warning: recData.warning ?? null,
        resumeName: file.name,
      }));

      router.push("/jobs");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = axiosErr.response?.data?.message || axiosErr.response?.data?.error || (err instanceof Error ? err.message : "Something went wrong. Is the backend running?");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay currentStep={loadingStep} />}

      {/* ── Hero ── */}
      <section className="w-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-gray-950 dark:to-slate-900 py-16 sm:py-20 px-6">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Text */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent text-xs font-bold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Matching
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
              Your next job is<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                one upload away
              </span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              AI-powered resume matching against live job listings from LinkedIn, Indeed &amp; Internshala.
            </p>
          </motion.div>

          {/* Animated illustration */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 flex justify-center">
            <svg viewBox="0 0 360 240" className="w-full max-w-sm" aria-hidden="true">
              <rect x="60" y="30" width="240" height="160" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
              <rect x="75" y="50" width="210" height="90" rx="8" fill="#0f172a" />
              {[0,1,2].map((i) => (
                <g key={i}>
                  <rect x="85" y={58 + i * 28} width={60 + i * 20} height="14" rx="6" fill="#0D9488" opacity={0.85 - i * 0.2} />
                  <rect x="155 + i * 5" y={58 + i * 28} width={100 - i * 15} height="6" rx="3" fill="#334155" />
                  <rect x="155 + i * 5" y={68 + i * 28} width={80 - i * 10} height="4" rx="2" fill="#334155" opacity={0.6} />
                </g>
              ))}
              <rect x="85" y="152" width="210" height="6" rx="3" fill="#1e293b" />
              <rect x="85" y="152" width="150" height="6" rx="3" fill="#0D9488" opacity={0.7} />
              <text x="238" y="159" fontSize="8" fill="#6ee7b7" fontFamily="monospace">71%</text>

              {/* Floating chips */}
              {[
                { x: 10, y: 60, w: 72, label: "Python", color: "#ecfdf5", stroke: "#6ee7b7", text: "#059669" },
                { x: 280, y: 80, w: 64, label: "React", color: "#eff6ff", stroke: "#93c5fd", text: "#2563eb" },
                { x: 20, y: 130, w: 80, label: "Docker", color: "#fff7ed", stroke: "#fed7aa", text: "#ea580c" },
              ].map(({ x, y, w, label, color, stroke, text }) => (
                <g key={label}>
                  <rect x={x} y={y} width={w} height={22} rx="11" fill={color} stroke={stroke} strokeWidth="1.5" />
                  <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize="9" fill={text} fontWeight="600" fontFamily="sans-serif">{label}</text>
                </g>
              ))}
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center mb-8">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent mb-4 shadow-sm">
                {step.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <p className="font-bold text-gray-900 dark:text-white">{step.title}</p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Upload zone ── */}
      <section className="max-w-2xl mx-auto w-full px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-accent/5 border border-gray-100 dark:border-gray-700 flex flex-col items-center">

          {error && (
            <div className="w-full mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-center text-sm font-medium">
              {error}
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Upload your resume</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">PDF only · max 5 MB</p>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`w-full relative border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer outline-none ${
              isDragActive
                ? "border-accent bg-accent/5 scale-[1.01]"
                : file
                  ? "border-accent/50 bg-accent/5"
                  : "border-gray-300 dark:border-gray-600 hover:border-accent/50 bg-gray-50/50 dark:bg-gray-700/50"
            }`}
          >
            <input {...getInputProps()} disabled={loading} />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 w-full max-w-sm">
                  <div className="bg-accent/10 p-3 rounded-lg shrink-0">
                    <File className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center pointer-events-none">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4 border border-gray-100 dark:border-gray-600">
                    <UploadCloud className={`w-8 h-8 transition-colors ${isDragActive ? "text-accent" : "text-gray-400"}`} />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base text-center">
                    {isDragActive ? "Drop your PDF here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF — max 5 MB</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recommendations slider */}
          <div className="w-full mt-8">
            <div className="flex justify-between items-center mb-4">
              <label className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Recommendations to fetch</label>
              <span className="bg-accent/10 text-accent font-bold px-3 py-1 rounded-full text-sm">{recommendations} matches</span>
            </div>
            <input
              type="range" min="1" max="20" value={recommendations}
              onChange={(e) => setRecommendations(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1"><span>1</span><span>20</span></div>
          </div>

          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !file}
            className="mt-8 w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base sm:text-lg font-bold shadow-lg transition-all active:scale-95 bg-accent hover:bg-accent-hover text-white shadow-accent/20 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            <Sparkles className="w-5 h-5" />
            Find Jobs Now
          </button>
        </div>
      </section>
    </>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <UploadContent />
    </AuthGuard>
  );
}
