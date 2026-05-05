"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Link</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">This password reset link is invalid or missing.</p>
          <Link href="/forgot-password" className="text-green-500 hover:underline font-semibold">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword !== confirmPw) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reset_token: token, new_password: newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Password reset successful! Redirecting to login…");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(data.error || "Reset failed. The link might have expired.");
      }
    } catch {
      setError("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 dark:border-gray-700 p-8">
        
        {success ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{success}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">New Password</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Choose a strong password for your account.</p>
            
            {error && (
              <div className="w-full mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                    placeholder="Min 8 chars, one uppercase, one number"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 mt-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-green-500" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
