import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  recruiter:  ["/recruiter"],
  job_seeker: ["/upload", "/jobs", "/dashboard", "/skill-gap", "/tracker", "/notifications"],
};

// Routes that require login but have no role restriction
const AUTH_ONLY = ["/select-role"];

export const proxy = auth((req) => {
  const hasProfileCookie = !!req.cookies.get("user_profile")?.value;
  const isLoggedIn = !!req.auth || hasProfileCookie;
  const pathname   = req.nextUrl.pathname;

  // Parse the user_profile cookie set by storeAuth()
  const rawCookie  = req.cookies.get("user_profile")?.value ?? "";
  let userRole: string | null = null;
  if (rawCookie) {
    try {
      userRole = JSON.parse(decodeURIComponent(rawCookie))?.role ?? null;
    } catch {
      userRole = null;
    }
  }

  // Redirect unauthenticated users attempting to reach any protected path
  const allProtected = [
    ...AUTH_ONLY,
    ...Object.values(ROLE_ROUTES).flat(),
  ];
  const isProtected = allProtected.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access: redirect to /unauthorized if wrong role
  for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
    if (routes.some((r) => pathname.startsWith(r))) {
      if (isLoggedIn && userRole && userRole !== role) {
        return NextResponse.redirect(new URL("/unauthorized", req.nextUrl.origin));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|unauthorized).*)'],
};
