import type { Criterion } from "@/lib/data/types";
import type { CriterionMatch, MatchResult } from "./criteria";

/** Credit per result. Unknown is partial credit: never a pass, never a fail. */
const CREDIT: Record<"mandatory" | "preferred", Record<MatchResult, number>> = {
  mandatory: { meets: 1, unknown: 0.4, fails: 0 },
  preferred: { meets: 1, unknown: 0.25, fails: 0 },
};

/** Mandatory criteria carry 75% of the score; failing any mandatory caps fit at 49. */
export const MANDATORY_WEIGHT = 75;
export const FAIL_CAP = 49;

export interface FitBreakdown {
  score: number;
  mandatoryMet: number;
  mandatoryTotal: number;
  mandatoryUnknown: number;
  mandatoryFailed: number;
  preferredMet: number;
  preferredTotal: number;
}

export function fitScore(criteria: Criterion[], matches: CriterionMatch[]): FitBreakdown {
  const byId = new Map(matches.map((m) => [m.criterionId, m]));
  const mand = criteria.filter((c) => c.mandatory);
  const pref = criteria.filter((c) => !c.mandatory);
  const avg = (list: Criterion[], kind: "mandatory" | "preferred") =>
    list.length ? list.reduce((s, c) => s + CREDIT[kind][byId.get(c.id)?.result ?? "unknown"], 0) / list.length : 0;
  const count = (list: Criterion[], r: MatchResult) => list.filter((c) => byId.get(c.id)?.result === r).length;

  const m = avg(mand, "mandatory");
  const p = avg(pref, "preferred");
  let score: number;
  if (!mand.length && !pref.length) score = 0;
  else if (!pref.length) score = 100 * m;
  else if (!mand.length) score = 100 * p;
  else score = MANDATORY_WEIGHT * m + (100 - MANDATORY_WEIGHT) * p;

  const failed = count(mand, "fails");
  if (failed > 0) score = Math.min(score, FAIL_CAP);
  return {
    score: Math.round(score),
    mandatoryMet: count(mand, "meets"),
    mandatoryTotal: mand.length,
    mandatoryUnknown: count(mand, "unknown"),
    mandatoryFailed: failed,
    preferredMet: count(pref, "meets"),
    preferredTotal: pref.length,
  };
}
