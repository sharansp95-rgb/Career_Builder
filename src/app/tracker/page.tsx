"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Kanban, X, GripVertical, Bookmark, Briefcase, MessageSquare, Trophy,
} from "lucide-react";
import Link from "next/link";
import { COLUMNS, type TrackerBoard, type TrackerColumn, type TrackerJob } from "@/lib/tracker";
import api from "@/lib/api";

const COLUMN_STYLES: Record<TrackerColumn, { border: string; bg: string; icon: React.ReactNode }> = {
  "Saved": {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    icon: <Bookmark className="w-4 h-4 text-blue-500" />,
  },
  "Applied": {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    icon: <Briefcase className="w-4 h-4 text-amber-500" />,
  },
  "Interview": {
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    icon: <MessageSquare className="w-4 h-4 text-violet-500" />,
  },
  "Offer/Rejected": {
    border: "border-green-200 dark:border-green-800",
    bg: "bg-green-50 dark:bg-green-900/20",
    icon: <Trophy className="w-4 h-4 text-green-500" />,
  },
};

function JobChip({ job, onRemove, isDragging = false }: { job: TrackerJob; onRemove: (id: number) => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const scoreColor = job.matchScore >= 70 ? "text-green-600" : job.matchScore >= 40 ? "text-orange-500" : "text-red-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-2 shadow-sm flex items-center gap-2 group min-h-[60px] ${isDragging ? "opacity-50" : ""}`}
    >
      <button {...attributes} {...listeners} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{job.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] font-bold ${scoreColor}`}>{job.matchScore}% match</span>
          <span className="text-[11px] text-gray-400">{job.location}</span>
        </div>
      </div>
      <button onClick={() => onRemove(job.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-gray-400 hover:text-red-500 shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function KanbanColumn({ column, jobs, onRemove }: { column: TrackerColumn; jobs: TrackerJob[]; onRemove: (id: number) => void }) {
  const { border, bg, icon } = COLUMN_STYLES[column];
  return (
    <div className={`flex flex-col rounded-2xl border ${border} ${bg} min-h-[300px] w-full flex-1`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit">
        {icon}
        <span className="font-bold text-sm text-gray-800 dark:text-white">{column}</span>
        <span className="ml-auto bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
          {jobs.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {jobs.map((job) => (
              <motion.div key={job.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <JobChip job={job} onRemove={onRemove} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
        {jobs.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Drop jobs here</p>
        )}
      </div>
    </div>
  );
}

function TrackerContent() {
  const [board, setBoard] = useState<TrackerBoard>({ Saved: [], Applied: [], Interview: [], "Offer/Rejected": [] });
  const [activeJob, setActiveJob] = useState<TrackerJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get("/api/tracker");
      const data = res.data?.data || res.data;
      setBoard(data);
    } catch {
      // keep empty board on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchBoard(); }, [fetchBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(MouseSensor)
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    for (const col of COLUMNS) {
      const job = board[col].find((j) => j.id === Number(active.id));
      if (job) { setActiveJob(job); break; }
    }
  }, [board]);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveJob(null);
    if (!over) return;

    const fromCol = COLUMNS.find((col) => board[col].some((j) => j.id === Number(active.id)));
    const toCol = COLUMNS.find((col) => col === over.id || board[col].some((j) => j.id === Number(over.id)));

    if (!fromCol || !toCol || fromCol === toCol) return;

    // Optimistic update
    const job = board[fromCol].find((j) => j.id === Number(active.id))!;
    setBoard((prev) => {
      const next = { ...prev };
      next[fromCol] = prev[fromCol].filter((j) => j.id !== job.id);
      next[toCol] = [...prev[toCol], { ...job, column: toCol }];
      return next;
    });
    void api.patch(`/api/tracker/${Number(active.id)}`, { column: toCol }).catch(() => void fetchBoard());
  }, [board, fetchBoard]);

  const handleRemove = useCallback((id: number) => {
    setBoard((prev) => {
      const next = { ...prev };
      for (const col of COLUMNS) next[col] = prev[col].filter((j) => j.id !== id);
      return next;
    });
    void api.delete(`/api/tracker/${id}`).catch(() => void fetchBoard());
  }, [fetchBoard]);

  const totalJobs = COLUMNS.reduce((acc, col) => acc + board[col].length, 0);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-10 h-10 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Kanban className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Application Tracker</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalJobs} job{totalJobs !== 1 ? "s" : ""} tracked · Drag cards between columns to update status
            </p>
          </div>
        </div>
        <Link href="/jobs" className="btn-primary text-sm">
          + Add from Jobs
        </Link>
      </div>

      {totalJobs === 0 ? (
        <div className="text-center py-20">
          <Kanban className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-3">No jobs tracked yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Click &ldquo;+ Track&rdquo; on any job card to start tracking your application pipeline.
          </p>
          <Link href="/jobs" className="btn-primary">Browse Jobs</Link>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} column={col} jobs={board[col]} onRemove={handleRemove} />
            ))}
          </div>

          <DragOverlay>
            {activeJob && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-3 shadow-2xl opacity-90 w-64">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{activeJob.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activeJob.company}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

export default function TrackerPage() {
  return (
    <AuthGuard requiredRole="job_seeker">
      <TrackerContent />
    </AuthGuard>
  );
}
