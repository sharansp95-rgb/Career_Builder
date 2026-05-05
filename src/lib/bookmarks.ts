const KEY = "careerBuilderBookmarks";
export const BOOKMARKS_CHANGED = "careerBuilderBookmarksChanged";

export interface BookmarkedJob {
  id: number;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  source?: string;
  description?: string;
  applyUrl?: string;
}

export function getBookmarks(): BookmarkedJob[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as BookmarkedJob[];
  } catch {
    return [];
  }
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().some((j) => j.id === id);
}

export function toggleBookmark(job: BookmarkedJob): "saved" | "removed" {
  const current = getBookmarks();
  const exists = current.some((j) => j.id === job.id);
  if (exists) {
    localStorage.setItem(KEY, JSON.stringify(current.filter((j) => j.id !== job.id)));
  } else {
    localStorage.setItem(KEY, JSON.stringify([...current, job]));
  }
  window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED));
  return exists ? "removed" : "saved";
}
