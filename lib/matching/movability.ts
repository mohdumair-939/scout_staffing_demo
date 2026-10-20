import type { Candidate } from "@/lib/data/types";

export type MovabilityLevel = "Low" | "Medium" | "High" | "Confirmed";

export interface Movability {
  level: MovabilityLevel;
  /** finer ordering inside a level (higher = more likely to move) */
  rank: number;
  basis: string;
}

export const RECENT_APPLICATION_DAYS = 90;
const LATE_STAGES = new Set(["interview", "finalist", "offer"]);

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

/**
 * Rules, strongest first:
 * confirmed interest > recent active application (< 90 days) > historical late-stage candidate
 * > passive with signals > passive with no signal.
 */
export function movability(cand: Candidate, today: string): Movability {
  if (cand.interestConfirmed) {
    return { level: "Confirmed", rank: 5, basis: `Recruiter confirmed interest on ${cand.interestConfirmed.date}` };
  }
  const apps = [...cand.applications].sort((a, b) => b.date.localeCompare(a.date));
  const latest = apps[0];
  if (latest && cand.poolType === "active" && !["withdrawn", "rejected"].includes(latest.stage)) {
    const days = daysBetween(latest.date, today);
    if (days < RECENT_APPLICATION_DAYS) {
      return { level: "High", rank: 4, basis: `Applied ${days} days ago (${latest.jobTitle})` };
    }
  }
  const late = apps.find((a) => LATE_STAGES.has(a.stage));
  if (late && cand.poolType !== "passive") {
    return { level: "Medium", rank: 3, basis: `Previously reached ${late.stage} stage for ${late.jobTitle} (${late.date.slice(0, 7)})` };
  }
  if (cand.poolType === "passive" && cand.signals.length > 0) {
    const n = cand.signals.length;
    return {
      level: "Medium",
      rank: 2 + Math.min(n, 5) / 10,
      basis: `Passive, ${n} signal${n > 1 ? "s" : ""}: ${cand.signals.map((s) => s.detail).join("; ")}`,
    };
  }
  if (latest) {
    return { level: "Low", rank: 1.5, basis: `Last applied ${daysBetween(latest.date, today)} days ago` };
  }
  return { level: "Low", rank: 1, basis: "Passive, no movement signals" };
}
