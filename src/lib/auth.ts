export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  role: "job_seeker" | "recruiter" | null;
  picture?: string;
}

const PROFILE_KEY = "user_profile";
const TOKEN_KEY   = "auth_jwt";
const COOKIE_NAME = "user_profile";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getUserProfile(): UserProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getUserProfile() && !!getStoredToken();
}

export function storeAuth(token: string, profile: UserProfile): void {
  if (!isBrowser()) return;
  if (token) {
    // Keep JWT in localStorage so axios interceptor can send Authorization header
    // for cross-origin requests where HttpOnly cookies may not be forwarded.
    localStorage.setItem(TOKEN_KEY, token);
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=604800; SameSite=Lax`;
}

export async function logout(): Promise<void> {
  if (!isBrowser()) return;
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort — continue with client-side cleanup
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem("userRole");
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
  window.location.href = "/login";
}

export function getRedirectForRole(role: string | null | undefined): string {
  if (role === "recruiter")  return "/recruiter";
  if (role === "job_seeker") return "/upload";
  return "/select-role";
}
