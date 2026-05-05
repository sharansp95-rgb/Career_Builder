"use client";

/**
 * AuthSync — mounts invisibly inside the layout.
 * After NextAuth completes a Google sign-in it exchanges the Google id_token
 * for a backend JWT once, stores it and the user profile, then redirects to
 * role selection if the Google account has no role set yet.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { storeAuth, getUserProfile } from "@/lib/auth";

export function AuthSync() {
  const { data: session } = useSession();
  const router            = useRouter();

  useEffect(() => {
    if (!session) return;

    // Already have a backend profile — just make sure profile cookie is in sync
    const existingProfile = getUserProfile();
    if (existingProfile) {
      if (!document.cookie.includes("user_profile=")) {
        storeAuth("", existingProfile);
      }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleIdToken = (session as any).googleIdToken as string | null;
    if (!googleIdToken) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

    fetch(`${apiUrl}/api/auth/google`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify({ token: googleIdToken }),
    })
      .then((r) => r.json())
      .then((data: { token?: string; user?: { id?: number; name?: string; email?: string; role?: string | null; picture?: string; needs_role_selection?: boolean } }) => {
        if (data.token && data.user) {
          const { id, name = "", email = "", role, picture, needs_role_selection } = data.user;
          // Store backend JWT + profile in localStorage and cookie
          storeAuth(data.token, {
            id,
            name,
            email,
            role: role as "job_seeker" | "recruiter" | null,
            picture,
          });

          if (needs_role_selection) {
            router.push("/select-role");
          }
        }
      })
      .catch(() => {
        // Backend unavailable — silent fail; pages handle missing token
      });
  }, [session, router]);

  return null;
}
