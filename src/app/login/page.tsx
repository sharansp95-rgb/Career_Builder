"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Briefcase, Loader2, Eye, EyeOff } from "lucide-react";
import { storeAuth, getRedirectForRole, isLoggedIn, getUserProfile } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "";

  const { data: session, status } = useSession();

  const [checking,      setChecking]      = useState(true);
  const [tab,           setTab]           = useState<"google" | "email">("google");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPw,        setShowPw]        = useState(false);

  // Redirect already-logged-in users.
  // After Google OAuth, AuthSync (mounted in the root layout) owns the backend
  // sync and redirect — this page just holds the spinner to avoid a duplicate
  // fetch race that would flash a false "Google sign-in failed" error.
  useEffect(() => {
    if (isLoggedIn()) {
      const profile = getUserProfile();
      router.replace(callbackUrl || getRedirectForRole(profile?.role));
      return;
    }

    if (status === "loading") return;

    if (status === "authenticated" && (session as any)?.googleIdToken) {
      // AuthSync handles the /api/auth/google call and redirect — stay on spinner.
      return;
    }

    setChecking(false);
  }, [router, callbackUrl, session, status]);

  if (checking) return <div className="flex-1 flex items-center justify-center p-4"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  // ── Google login ──────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    await signIn("google", { callbackUrl: returnTo });
    setGoogleLoading(false);
  };

  // ── Email login ───────────────────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }

    setEmailLoading(true);
    setError(null);

    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (res.ok) {
        storeAuth(data.token, {
          id:    data.user.id,
          name:  data.user.name,
          email: data.user.email,
          role:  data.user.role,
        });
        router.push(callbackUrl || getRedirectForRole(data.user.role));
      } else {
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("Network error. Could not reach the server.");
    } finally {
      setEmailLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  return (
    <div className="flex-1 overflow-y-auto flex flex-col p-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="m-auto w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">

        <div className="bg-accent/10 p-3 rounded-2xl mb-5">
          <Briefcase className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome Back</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-7 text-center text-sm">
          Sign in to access your personalised job recommendations.
        </p>

        {/* Tab switcher */}
        <div className="flex w-full mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {(["google", "email"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              {t === "google" ? "Google" : "Email"}
            </button>
          ))}
        </div>

        {/* Inline error */}
        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Google tab */}
        {tab === "google" && (
          <div className="w-full flex flex-col gap-4">
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
            </button>

          </div>
        )}

        {/* Email tab */}
        {tab === "email" && (
          <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {emailLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {emailLoading ? "Signing in..." : "Sign In"}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              New user? <Link href="/register" className="text-accent font-semibold hover:underline">Sign up</Link>
            </p>
          </form>
        )}


      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-4"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
