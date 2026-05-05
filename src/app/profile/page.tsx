"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import api from "@/lib/api";
import { Mail, Shield, FileText, Calendar, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface ProfileData {
  name: string;
  email: string;
  role: string;
  resume: {
    text: string;
    skills: string[];
    file_name: string;
    uploaded_at: string;
  } | null;
}

function ProfileContent() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: responseBody } = await api.get("/api/user/profile");
        setProfile(responseBody.data || responseBody);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-accent/20 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center min-h-[60vh]">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        
        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-6 text-center sm:text-left">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-accent">{profile.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 flex flex-col items-center sm:items-start">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{profile.name}</h1>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile.email}</div>
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> <span className="capitalize">{profile.role.replace("_", " ")}</span></div>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 px-2">Your Resume</h2>
        
        {profile.resume ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Resume File Info */}
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-800/50">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={profile.resume.file_name}>{profile.resume.file_name || "Resume PDF"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(profile.resume.uploaded_at + "Z").toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Link href="/upload" className="w-full text-center py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors">
                Replace Resume
              </Link>
            </div>

            {/* Extracted Skills */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-gray-900 dark:text-white">Extracted Skills</h3>
              </div>
              {profile.resume.skills && profile.resume.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.resume.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-semibold border border-accent/20">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No skills could be extracted.</p>
              )}
            </div>
            
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Resume Uploaded</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
              Upload your resume to extract skills and start getting personalized job recommendations.
            </p>
            <Link href="/upload" className="btn-primary">
              Upload Resume
            </Link>
          </div>
        )}

      </motion.div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <ProfileContent />
    </AuthGuard>
  );
}
