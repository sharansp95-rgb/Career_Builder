"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserProfile } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  requiredRole?: "job_seeker" | "recruiter";
}

export default function AuthGuard({ children, requiredRole }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    if (requiredRole) {
      const profile = getUserProfile();
      if (profile?.role !== requiredRole) {
        router.replace("/unauthorized");
        return;
      }
    }
    setReady(true);
  }, [router, requiredRole]);

  if (!ready) return null;
  return <>{children}</>;
}
