"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getUserProfile, getRedirectForRole } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function UnauthorizedPage() {
  const [dashboard, setDashboard] = useState<string>("/select-role");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const profile = getUserProfile();
    setDashboard(getRedirectForRole(profile?.role ?? null));
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShieldX className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Access Denied</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
        You don&apos;t have permission to access this page. It may be restricted to a different role.
      </p>
      {mounted ? (
        <Link
          href={dashboard}
          className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-sm"
        >
          Go to my dashboard
        </Link>
      ) : (
        <div className="inline-flex items-center justify-center px-6 py-3 bg-accent/50 text-white/50 font-bold rounded-xl shadow-sm cursor-not-allowed">
          Loading...
        </div>
      )}
    </div>
  );
}
