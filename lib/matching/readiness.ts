import type { Candidate, Criterion } from "@/lib/data/types";
import type { CriterionMatch } from "./criteria";

export type ReadinessLevel = "Ready" | "Needs verification" | "Blocked";

export interface Readiness {
  level: ReadinessLevel;
  /** why it is blocked (mandatory fails) */
  blockers: string[];
  /** what still has to happen before it is Ready */
  todo: string[];
}

/**
 * Ready = every mandatory criterion met, registry-verifiable licences verified,
 * no mandatory evidence that is only inferred, and interest confirmed.
 * Any mandatory fail = Blocked. Anything else = Needs verification.
 */
export function readiness(cand: Candidate, criteria: Criterion[], matches: CriterionMatch[]): Readiness {
  const byId = new Map(matches.map((m) => [m.criterionId, m]));
  const blockers: string[] = [];
  const todo: string[] = [];
  for (const c of criteria.filter((x) => x.mandatory)) {
    const m = byId.get(c.id);
    if (!m) continue;
    if (m.result === "fails") blockers.push(`${c.text}: ${m.evidence}`);
    else if (m.result === "unknown") todo.push(`Confirm: ${c.text}`);
    else {
      if (m.needsVerification) todo.push(`Verify licence with registry: ${c.text}`);
      if (m.inferredOnly) todo.push(`Inferred only, confirm with candidate: ${c.text}`);
    }
  }
  if (!cand.interestConfirmed) todo.push("Confirm candidate interest");
  const level = blockers.length ? "Blocked" : todo.length ? "Needs verification" : "Ready";
  return { level, blockers, todo };
}
