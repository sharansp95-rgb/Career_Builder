"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,       setStep]       = useState<1 | 2>(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);

  const [email,       setEmail]       = useState("");

  // ── Step 1: submit email → get reset_token ────────────────────────────────────
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res  = await fetch(`${API}/api/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Reset link sent to your email.");
        setStep(2);
      } else {
        setError(data.error || "Failed to process request.");
      }
    } catch {
      setError("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">



        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="w-full mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        <div className="bg-green-500/10 p-3 rounded-2xl mb-5">
          {step === 1 ? <Mail className="w-8 h-8 text-green-500" /> : <KeyRound className="w-8 h-8 text-green-500" />}
        </div>

        {/* ── Step 1: Email ────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Forgot Password</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">Enter your registered email to reset your password.</p>
            <form onSubmit={handleRequestReset} className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Checking..." : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: Success ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              We&apos;ve sent a password reset link to <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.<br />
              Please click the link to choose a new password.
            </p>
            <Link href="/login" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-xl transition-all">
              Go to Login
            </Link>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Remember your password?{" "}
          <Link href="/login" className="text-green-500 font-semibold hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
