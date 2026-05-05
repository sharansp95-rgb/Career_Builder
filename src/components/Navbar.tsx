"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Briefcase, LogOut, Moon, Sun, Menu, X,
  LayoutDashboard, Bell, ChevronDown,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserProfile, isLoggedIn, logout as authLogout } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

const EMPLOYEE_LINKS = [
  { href: "/dashboard",     label: "Dashboard" },
  { href: "/jobs",          label: "Jobs" },
  { href: "/tracker",       label: "Tracker" },
  { href: "/skill-gap",     label: "Skill Gap" },
  { href: "/notifications", label: "Inbox" },
  { href: "/profile",       label: "Profile" },
];

const NavLink = ({ href, label, isActive }: { href: string; label: string; isActive: boolean }) => (
  <Link href={href} className="relative text-sm font-medium transition-colors">
    <span className={isActive ? "text-accent" : "text-gray-600 dark:text-gray-400 hover:text-accent dark:hover:text-accent"}>
      {label}
    </span>
    {isActive && (
      <motion.span
        layoutId="nav-underline"
        className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-accent rounded-full"
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />
    )}
  </Link>
);

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();

  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read profile from localStorage on mount and on route change.
  // Only treat user as logged-in if the auth token also exists.
  useEffect(() => {
    setProfile(isLoggedIn() ? getUserProfile() : null);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const role    = profile?.role ?? null;
  const user    = session?.user;
  const loading = status === "loading";

  const handleLogout = async () => {
    await signOut({ redirect: false });
    sessionStorage.removeItem("careerBuilderData");
    authLogout(); // clears localStorage + cookie, redirects to /login
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");



  const displayUser = user ?? (profile ? { name: profile.name, email: profile.email, image: profile.picture } : null);

  return (
    <>
      <nav className="w-full border-b border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="bg-accent/10 p-2 rounded-xl group-hover:bg-accent/20 transition-colors">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">CareerBuilder</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {role === "job_seeker" && EMPLOYEE_LINKS.map((l) => <NavLink key={l.href} {...l} isActive={isActive(l.href)} />)}
            {role === "recruiter"  && <NavLink href="/recruiter" label="Recruiter Portal" isActive={isActive("/recruiter")} />}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Role badge — non-clickable */}
            {role && (
              <span className={`hidden md:inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full select-none ${
                role === "recruiter"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}>
                {role === "recruiter" ? "Recruiter" : "Job Seeker"}
              </span>
            )}

            {/* User avatar dropdown */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : displayUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 group"
                  aria-label="User menu"
                >
                  {(displayUser as {image?: string | null}).image ? (
                    <Image
                      src={(displayUser as {image: string}).image}
                      alt={displayUser.name ?? "User"}
                      width={32} height={32}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/30 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-accent font-bold text-sm">{(displayUser.name ?? "U").charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform hidden md:block ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayUser.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayUser.email}</p>
                        {role && (
                          <p className="text-xs font-semibold mt-1" style={{ color: role === "recruiter" ? "#7c3aed" : "#2563eb" }}>
                            {role === "recruiter" ? "Recruiter" : "Job Seeker"}
                          </p>
                        )}
                      </div>
                      <div className="py-1">
                        {role === "job_seeker" && (
                          <Link
                            href="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-gray-400" />
                            Dashboard
                          </Link>
                        )}
                        {role === "job_seeker" && (
                          <Link
                            href="/notifications"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <Bell className="w-4 h-4 text-gray-400" />
                            Notifications
                          </Link>
                        )}
                        {role === "job_seeker" && (
                          <Link
                            href="/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                        <button
                          onClick={() => { setDropdownOpen(false); void handleLogout(); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm py-1.5 px-4">Sign In</Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Open menu"
            >
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-900 dark:text-white">Menu</span>
                <button onClick={() => setDrawerOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {displayUser && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  {(displayUser as {image?: string | null}).image ? (
                    <Image src={(displayUser as {image: string}).image} alt={displayUser.name ?? ""} width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-accent/30" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-accent font-bold">{(displayUser.name ?? "U").charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayUser.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayUser.email}</p>
                    {role && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: role === "recruiter" ? "#7c3aed" : "#2563eb" }}>
                        {role === "recruiter" ? "Recruiter" : "Job Seeker"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {(role === "job_seeker"
                  ? EMPLOYEE_LINKS
                  : role === "recruiter"
                    ? [{ href: "/recruiter", label: "Recruiter Portal" }]
                    : []
                ).map(({ href, label }) => (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive(href) ? "bg-accent/10 text-accent" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="px-4 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                {displayUser ? (
                  <button
                    onClick={() => { setDrawerOpen(false); void handleLogout(); }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                ) : (
                  <Link href="/login" className="btn-primary w-full text-center text-sm py-2.5">Sign In</Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
