"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { storeAuth, getRedirectForRole } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        setStatus("error");
        setMessage("Invalid verification link.");
      }, 0);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API}/api/auth/verify-email-link?token=${token}`, {
          credentials: "include",
        });
        const data = await res.json();
        
        if (res.ok) {
          storeAuth(data.token, {
            id:    data.user.id,
            name:  data.user.name,
            email: data.user.email,
            role:  data.user.role,
          });
          setStatus("success");
          setMessage("Your email has been verified! Redirecting…");
          setTimeout(() => router.push(getRedirectForRole(data.user.role)), 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Could not reach the server.");
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifying Email</h1>
            <p className="text-gray-500 dark:text-gray-400">Please wait while we verify your account...</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verified!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{message}</p>
            <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{message}</p>
            <Link
              href="/register"
              className="w-full inline-block bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-8 rounded-xl transition-all"
            >
              Back to Registration
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-green-500" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
