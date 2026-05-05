/**
 * Deterministic dummy metadata for job cards.
 * Each job gets stable values based on its id so filters work consistently.
 */

export type JobType = "Remote" | "Hybrid" | "On-site";
export type ExperienceLevel = "Fresher" | "1-3 yrs" | "3-5 yrs" | "5+ yrs";

export interface JobMeta {
  jobType: JobType;
  salaryLpa: number;       // in LPA (lakhs per annum)
  experienceLevel: ExperienceLevel;
  location: string;
}

const JOB_TYPES: JobType[] = ["Remote", "Hybrid", "On-site"];
const EXP_LEVELS: ExperienceLevel[] = ["Fresher", "1-3 yrs", "3-5 yrs", "5+ yrs"];
const LOCATIONS = [
  "Bangalore", "Mumbai", "Delhi", "Hyderabad",
  "Pune", "Chennai", "Remote",
];

export function getJobMeta(id: number): JobMeta {
  // Use different primes so the values feel independent
  const a = Math.abs(id * 7 + 13);
  const b = Math.abs(id * 11 + 5);
  const c = Math.abs(id * 3 + 17);
  const d = Math.abs(id * 19 + 2);

  return {
    jobType: JOB_TYPES[a % JOB_TYPES.length],
    // Salary is derived deterministically from job id so the same job always
    // shows the same figure. It is not real — displayed as an estimate only.
    salaryLpa: 4 + (b % 43),          // 4 – 46 LPA
    experienceLevel: EXP_LEVELS[c % EXP_LEVELS.length],
    location: LOCATIONS[d % LOCATIONS.length],
  };
}
