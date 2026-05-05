export type TrackerColumn = "Saved" | "Applied" | "Interview" | "Offer/Rejected";

export interface TrackerJob {
  id: number;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  column: TrackerColumn;
  addedAt: string;
}

export type TrackerBoard = Record<TrackerColumn, TrackerJob[]>;

export const COLUMNS: TrackerColumn[] = ["Saved", "Applied", "Interview", "Offer/Rejected"];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_jwt") ?? "") : "";
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export function emptyBoard(): TrackerBoard {
  return { Saved: [], Applied: [], Interview: [], "Offer/Rejected": [] };
}

export async function getBoard(): Promise<TrackerBoard> {
  try {
    const res = await fetch(`${API}/api/tracker`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) return emptyBoard();
    const json = await res.json();
    return (json.data ?? json) as TrackerBoard;
  } catch {
    return emptyBoard();
  }
}

export async function addJobToTracker(
  job: Omit<TrackerJob, "column" | "addedAt">,
): Promise<void> {
  await fetch(`${API}/api/tracker`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(job),
  });
}

export async function moveJob(jobId: number, toColumn: TrackerColumn): Promise<void> {
  await fetch(`${API}/api/tracker/${jobId}`, {
    method: "PATCH",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({ column: toColumn }),
  });
}

export async function removeJob(jobId: number): Promise<void> {
  await fetch(`${API}/api/tracker/${jobId}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });
}
