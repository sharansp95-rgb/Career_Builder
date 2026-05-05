"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Briefcase, UserSearch, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { storeAuth, getRedirectForRole } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",   color: "bg-red-500"    };
  if (score === 2) return { level: 2, label: "Medium", color: "bg-yellow-400" };
  return               { level: 3, label: "Strong",  color: "bg-green-500"  };
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [role, setRole] = useState<"job_seeker" | "recruiter" | "">("");

  const strength = password ? getStrength(password) : null;

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) errs.email = "Invalid email format";
    if (!password)     errs.password = "Password is required";
    else if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      errs.password = "Min 8 chars, one uppercase letter, one number";
    if (password !== confirm) errs.confirm = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError("Please select a role to continue."); return; }

    setLoading(true);
    setError(null);

    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requires_verification) {
          setStep(3);
        } else {
          storeAuth(data.token, {
            id:    data.user.id,
            name:  data.user.name,
            email: data.user.email,
            role:  data.user.role,
          });
          router.push(getRedirectForRole(data.user.role));
        }
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch {
      setError("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };



  const ErrorBox = ({ msg }: { msg: string }) => (
    <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
      {msg}
    </div>
  );

  const StepIndicator = () => {
    if (step === 3) return null;
    return (
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step  ? "bg-green-500 text-white" :
              s === step? "bg-green-500 text-white ring-4 ring-green-100 dark:ring-green-900/40" :
                          "bg-gray-200 dark:bg-gray-700 text-gray-500"
            }`}>{s < step ? "✓" : s}</div>
            {s < 2 && <div className={`h-px w-8 ${s < step ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-500">Step {step} of 2</span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col p-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="m-auto w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">

        <StepIndicator />
        {error && <ErrorBox msg={error} />}

        {/* ── STEP 1: Account details ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="bg-green-500/10 p-3 rounded-2xl mb-4">
              <UserPlus className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create Account</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-sm">Enter your details to get started.</p>

            <form onSubmit={handleNext} className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  onBlur={() => { if (!name.trim()) setFieldErrors(p => ({ ...p, name: "Full name is required" })); }}
                  className={`w-full border rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${fieldErrors.name ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"}`}
                  placeholder="John Doe"
                />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => { if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) setFieldErrors(p => ({ ...p, email: "Valid email required" })); }}
                  className={`w-full border rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${fieldErrors.email ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"}`}
                  placeholder="you@example.com"
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${fieldErrors.password ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"}`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && strength && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1.5">
                      {[1,2,3].map(l => (
                        <div key={l} className={`flex-1 rounded-full transition-colors ${strength.level >= l ? strength.color : "bg-gray-200 dark:bg-gray-600"}`} />
                      ))}
                    </div>
                    <p className="text-xs mt-1 text-gray-500">Strength: <span className="font-semibold">{strength.label}</span></p>
                  </div>
                )}
                {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => { if (confirm && password !== confirm) setFieldErrors(p => ({ ...p, confirm: "Passwords do not match" })); }}
                  className={`w-full border rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${fieldErrors.confirm ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"}`}
                  placeholder="••••••••"
                />
                {fieldErrors.confirm && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm}</p>}
              </div>

              <button
                type="submit"
                disabled={!name || !email || !password || !confirm}
                className="mt-2 w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                Next →
              </button>
            </form>
          </>
        )}

        {/* ── STEP 2: Role selection ──────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Choose Your Role</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-sm">Select the role that best describes you.</p>

            <form onSubmit={handleRegister} className="w-full flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("job_seeker")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${role === "job_seeker" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 hover:border-green-300"}`}
                >
                  <Briefcase className={`w-8 h-8 ${role === "job_seeker" ? "text-green-500" : "text-gray-400"}`} />
                  <div className="text-left w-full">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">Job Seeker</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      <li>• Upload resume</li>
                      <li>• AI job matches</li>
                      <li>• Get shortlisted</li>
                    </ul>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("recruiter")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${role === "recruiter" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-blue-300"}`}
                >
                  <UserSearch className={`w-8 h-8 ${role === "recruiter" ? "text-blue-500" : "text-gray-400"}`} />
                  <div className="text-left w-full">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">Recruiter</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      <li>• Search candidates</li>
                      <li>• Shortlist talent</li>
                      <li>• Post requirements</li>
                    </ul>
                  </div>
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span><strong>Your role cannot be changed after registration.</strong> Choose carefully.</span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={!role || loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              We&apos;ve sent a verification link to <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.<br />
              Please click the link to verify your account before logging in.
            </p>
            <Link href="/login" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-xl transition-all">
              Go to Login
            </Link>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-green-500 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
