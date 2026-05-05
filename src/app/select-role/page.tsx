"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, UserSearch, Loader2 } from "lucide-react";
import { getUserProfile, storeAuth, getRedirectForRole } from "@/lib/auth";
import api from "@/lib/api";

export default function SelectRolePage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<"job_seeker" | "recruiter" | "">("");

  useEffect(() => {
    // If already logged in with a role, redirect away — role cannot be changed
    const profile = getUserProfile();
    if (profile?.role) {
      router.replace(getRedirectForRole(profile.role));
    }
  }, [router]);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/api/auth/set-role", { role: selected });
      const data = res.data;

      const profile = getUserProfile();
      storeAuth(data.token, {
        id:    profile?.id,
        name:  profile?.name ?? "",
        email: profile?.email ?? "",
        role:  data.role,
      });
      router.push(getRedirectForRole(data.role));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || "Failed to set role or network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
          Choose Your Role
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
          This is a one-time selection. Your role cannot be changed after you confirm.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
        <button
          onClick={() => setSelected("job_seeker")}
          className={`group relative flex flex-col items-center p-8 rounded-3xl border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left ${selected === "job_seeker" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-green-400"}`}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${selected === "job_seeker" ? "bg-green-100 dark:bg-green-900/40" : "bg-green-50 dark:bg-green-900/30"}`}>
            <Briefcase className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Job Seeker</h2>
          <ul className="text-gray-500 dark:text-gray-400 text-sm space-y-1 text-center">
            <li>• Upload resume & get AI job matches</li>
            <li>• View skill gap analysis</li>
            <li>• Receive recruiter notifications</li>
          </ul>
        </button>

        <button
          onClick={() => setSelected("recruiter")}
          className={`group relative flex flex-col items-center p-8 rounded-3xl border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left ${selected === "recruiter" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-400"}`}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${selected === "recruiter" ? "bg-blue-100 dark:bg-blue-900/40" : "bg-blue-50 dark:bg-blue-900/30"}`}>
            <UserSearch className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Recruiter</h2>
          <ul className="text-gray-500 dark:text-gray-400 text-sm space-y-1 text-center">
            <li>• Post job requirements</li>
            <li>• Search & rank candidates by fit</li>
            <li>• Shortlist top talent</li>
          </ul>
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400 max-w-md mb-6">
        <span className="shrink-0 mt-0.5">⚠</span>
        <span><strong>Your role cannot be changed after confirmation.</strong> Choose carefully.</span>
      </div>

      <button
        onClick={() => void handleConfirm()}
        disabled={!selected || loading}
        className="flex items-center justify-center gap-2 px-10 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Saving..." : "Confirm Role"}
      </button>
    </div>
  );
}
