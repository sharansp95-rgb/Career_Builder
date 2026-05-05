"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Briefcase, Mail } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import api from "@/lib/api";

interface Notification {
  id: number;
  user_id: string;
  message: string;
  company: string | null;
  job_title: string | null;
  required_skills: string | null;
  recruiter_email: string | null;
  recruiter_name: string | null;
  is_read: number;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationCard({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: number) => void;
}) {
  const skills = notif.required_skills
    ? notif.required_skills.split(/,\s*/).filter(Boolean)
    : [];

  return (
    <button
      onClick={() => { if (!notif.is_read) onRead(notif.id); }}
      style={notif.is_read ? undefined : { borderLeft: "4px solid #3b82f6" }}
      className={`group w-full text-left bg-white dark:bg-gray-800 sm:rounded-2xl shadow-sm hover:shadow-md transition-all p-4 sm:p-6 border-y sm:border ${
        notif.is_read
          ? "border-gray-100 dark:border-gray-700"
          : "border-gray-100 dark:border-gray-700"
      }`}
    >
      <div className="flex gap-4 items-start">
        {/* Dot */}
        <span
          className={`shrink-0 mt-2 w-2.5 h-2.5 rounded-full transition-colors ${
            notif.is_read ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-500 animate-pulse"
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Badge */}
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-500 mb-1">
            You were shortlisted!
          </p>

          {/* Role */}
          {notif.job_title && (
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight mb-0.5">
              {notif.job_title}
            </h3>
          )}

          {/* Company */}
          {notif.company && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium mb-3">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              {notif.company}
            </div>
          )}

          {/* Required skills chips */}
          {skills.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                Required Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recruiter info */}
          {(notif.recruiter_name || notif.recruiter_email) && (
            <div className="flex flex-col gap-0.5 text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              {notif.recruiter_name && (
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  From: {notif.recruiter_name}
                </span>
              )}
              {notif.recruiter_email && (
                <a
                  href={`mailto:${notif.recruiter_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-green-600 dark:text-green-400 hover:underline font-semibold"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {notif.recruiter_email}
                </a>
              )}
            </div>
          )}

          {/* Timestamp + unread badge */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
            <span>{timeAgo(notif.created_at)}</span>
            {!notif.is_read && (
              <span className="text-blue-500 font-semibold">• Unread — click to mark read</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/api/get_notifications");
      const data = res.data.data || res.data;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent — optimistic update already applied
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-0 sm:px-4 py-6 sm:py-12">
      <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-green-500" />
            Inbox
            {unreadCount > 0 && (
              <span className="text-base font-bold bg-green-500 text-white px-2.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Shortlist requests and interview invitations from recruiters.</p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-white dark:bg-gray-700 shadow-sm rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No notifications yet.</h3>
          <p className="text-gray-500">Keep applying — recruiters will reach out here.</p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="flex flex-col gap-4">
          {notifications.map((notif) => (
            <NotificationCard key={notif.id} notif={notif} onRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <NotificationsContent />
    </AuthGuard>
  );
}
