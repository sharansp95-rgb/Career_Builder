"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, UploadCloud, Target } from "lucide-react";
import { getUserProfile, getRedirectForRole } from "@/lib/auth";

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg mx-auto"
      aria-hidden="true"
    >
      {/* Desk */}
      <rect x="60" y="240" width="400" height="14" rx="7" fill="#E5E7EB" />
      <rect x="110" y="254" width="18" height="60" rx="5" fill="#D1D5DB" />
      <rect x="392" y="254" width="18" height="60" rx="5" fill="#D1D5DB" />

      {/* Monitor */}
      <rect x="160" y="120" width="200" height="128" rx="12" fill="#1F2937" />
      <rect x="168" y="128" width="184" height="106" rx="8" fill="#111827" />
      <rect x="225" y="248" width="70" height="10" rx="4" fill="#374151" />
      <rect x="210" y="254" width="100" height="6" rx="3" fill="#4B5563" />

      {/* Screen content — job cards on monitor */}
      <rect x="176" y="136" width="80" height="20" rx="4" fill="#1D9E75" opacity="0.85" />
      <rect x="264" y="136" width="80" height="20" rx="4" fill="#1D9E75" opacity="0.55" />
      <rect x="176" y="163" width="168" height="6" rx="3" fill="#374151" />
      <rect x="176" y="175" width="130" height="5" rx="2.5" fill="#374151" />
      <rect x="176" y="187" width="148" height="5" rx="2.5" fill="#374151" />
      <rect x="176" y="200" width="110" height="5" rx="2.5" fill="#374151" />
      {/* Match bar */}
      <rect x="176" y="215" width="168" height="6" rx="3" fill="#1F2937" />
      <rect x="176" y="215" width="118" height="6" rx="3" fill="#1D9E75" opacity="0.7" />
      <text x="298" y="221" fontSize="5" fill="#6EE7B7" fontFamily="monospace">70%</text>

      {/* Person sitting */}
      {/* Head */}
      <circle cx="112" cy="148" r="22" fill="#FBBF24" />
      {/* Hair */}
      <path d="M90 140 Q112 118 134 140" fill="#92400E" />
      {/* Body */}
      <rect x="90" y="170" width="44" height="55" rx="10" fill="#1D9E75" />
      {/* Arms */}
      <path d="M90 185 Q70 195 72 220" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
      <path d="M134 185 Q154 195 152 220" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
      {/* Legs */}
      <path d="M100 225 L96 268" stroke="#374151" strokeWidth="10" strokeLinecap="round" />
      <path d="M124 225 L128 268" stroke="#374151" strokeWidth="10" strokeLinecap="round" />
      {/* Chair */}
      <rect x="76" y="222" width="72" height="12" rx="6" fill="#6B7280" />
      <path d="M88 234 L88 268" stroke="#6B7280" strokeWidth="8" strokeLinecap="round" />
      <path d="M132 234 L132 268" stroke="#6B7280" strokeWidth="8" strokeLinecap="round" />

      {/* Resume doc floating left */}
      <g transform="rotate(-8,60,170)">
        <rect x="28" y="152" width="64" height="82" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        <rect x="36" y="165" width="48" height="5" rx="2" fill="#1D9E75" />
        <rect x="36" y="176" width="38" height="4" rx="2" fill="#D1D5DB" />
        <rect x="36" y="185" width="44" height="4" rx="2" fill="#D1D5DB" />
        <rect x="36" y="194" width="32" height="4" rx="2" fill="#D1D5DB" />
        <rect x="36" y="206" width="48" height="4" rx="2" fill="#D1D5DB" />
        <rect x="36" y="215" width="40" height="4" rx="2" fill="#D1D5DB" />
        <text x="36" y="160" fontSize="6" fill="#6B7280" fontFamily="sans-serif" fontWeight="bold">RESUME</text>
      </g>

      {/* AI sparkle badge */}
      <circle cx="310" cy="108" r="22" fill="#1D9E75" opacity="0.12" />
      <circle cx="310" cy="108" r="15" fill="#1D9E75" opacity="0.2" />
      <text x="302" y="113" fontSize="14">✦</text>

      {/* Floating skill chips */}
      <rect x="340" y="150" width="74" height="20" rx="10" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="1.5" />
      <text x="355" y="164" fontSize="8" fill="#059669" fontFamily="sans-serif" fontWeight="600">Python</text>
      <rect x="352" y="176" width="64" height="20" rx="10" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
      <text x="364" y="190" fontSize="8" fill="#2563EB" fontFamily="sans-serif" fontWeight="600">React</text>
      <rect x="336" y="202" width="84" height="20" rx="10" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5" />
      <text x="348" y="216" fontSize="8" fill="#EA580C" fontFamily="sans-serif" fontWeight="600">Machine ML</text>

      {/* Stars / sparkles top right */}
      <text x="460" y="80" fontSize="16" fill="#FCD34D">★</text>
      <text x="476" y="55" fontSize="10" fill="#FCD34D">★</text>
      <text x="490" y="72" fontSize="12" fill="#1D9E75">✦</text>
    </svg>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const profile = mounted ? getUserProfile() : null;
  const getStartedLink = profile?.role ? getRedirectForRole(profile.role) : "/upload";
  const getStartedText = profile?.role ? "Go to my dashboard" : "Get Started";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-12 text-center relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 sm:w-96 h-64 sm:h-96 bg-green-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full z-10">
        {/* Two-column layout on large screens */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

          {/* Left — text */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-accent/10 text-green-accent text-xs sm:text-sm font-medium">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Smarter Job Matching</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white drop-shadow-sm leading-tight">
              Upload your resume.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-accent to-emerald-400">
                Meet your future.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed">
              Our BERT-powered recommendation engine analyses your experience to find
              the perfect job matches instantly. No more endless searching.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href={getStartedLink}
                className="group flex items-center justify-center gap-2 bg-green-accent hover:bg-green-accent-hover text-white px-8 py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg shadow-green-accent/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
              >
                <UploadCloud className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {getStartedText}
              </Link>
              {profile?.role !== "recruiter" && (
                <Link
                  href="/jobs"
                  className="group flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-8 py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  Explore Jobs
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-400 dark:text-gray-500 font-medium pt-2">
              <span>✦ BERT-powered matching</span>
              <span>✦ Real-time job scraping</span>
              <span>✦ Star-rated companies</span>
            </div>
          </div>

          {/* Right — illustration */}
          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-accent/5 to-emerald-400/5 rounded-3xl" />
              <HeroIllustration />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0">
          {[
            { value: "10K+", label: "Jobs Matched" },
            { value: "95%", label: "Accuracy" },
            { value: "50+", label: "Companies" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <p className="text-2xl font-extrabold text-green-accent">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
