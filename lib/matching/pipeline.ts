import type { Candidate, Credential, Criterion, Family, RegistryRecord, SourceId } from "@/lib/data/types";
import { evaluateAll, distanceMiles, type CriterionMatch, type MatchContext } from "./criteria";
import { fitScore, type FitBreakdown } from "./fit";
import { movability, type Movability } from "./movability";
import { readiness, type Readiness, type ReadinessLevel } from "./readiness";
import { SEARCH_FAMILIES } from "./synonyms";

export interface CandidateOverride {
  /** credential index → credential after a registry check */
  verified?: Record<number, Credential>;
  interestConfirmed?: { date: string; note: string };
  decision?: "accepted" | "rejected";
  rejectReason?: string;
  rejectNote?: string;
}

export interface ScoredCandidate {
  cand: Candidate;
  matches: CriterionMatch[];
  fit: FitBreakdown;
  movability: Movability;
  readiness: Readiness;
  distance?: number;
  isActive: boolean;
}

export const SEARCH_RADIUS_MILES = 150;

// ---------------------------------------------------------------- duplicates

/** Merge records of the same person (same personKey) found in different sources. */
export function mergeDuplicates(cands: Candidate[]): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  const out: Candidate[] = [];
  for (const c of cands) {
    if (!c.personKey) {
      out.push(c);
      continue;
    }
    const g = groups.get(c.personKey);
    if (g) g.push(c);
    else {
      groups.set(c.personKey, [c]);
      out.push(c); // placeholder keeps original ordering
    }
  }
  return out.map((c) => {
    const g = c.personKey ? groups.get(c.personKey)! : [c];
    return g.length > 1 ? mergeGroup(g) : c;
  });
}

function mergeGroup(records: Candidate[]): Candidate {
  const base = records.find((r) => r.poolType !== "passive") ?? records[0];
  const m: Candidate = structuredClone(base);
  for (const o of records) {
    if (o === base) continue;
    for (const s of o.sources) if (!m.sources.some((x) => x.source === s.source)) m.sources.push(s);
    if (o.lastActivity > m.lastActivity && o.currentEmployer.value !== m.currentEmployer.value) {
      const newer = o.workHistory.find((w) => w.end === null);
      if (newer) {
        m.workHistory = m.workHistory.map((w) => (w.end === null ? { ...w, end: newer.start } : w));
        m.workHistory.unshift(newer);
      }
      m.currentTitle = o.currentTitle;
      m.currentEmployer = o.currentEmployer;
      m.location = o.location;
    }
    for (const s of o.skills) if (!m.skills.some((x) => x.name === s.name)) m.skills.push(s);
    for (const cr of o.credentials) if (!m.credentials.some((x) => x.code === cr.code)) m.credentials.push(cr);
    m.signals.push(...o.signals);
    if (o.lastActivity > m.lastActivity) m.lastActivity = o.lastActivity;
  }
  m.mergedFrom = records.map((r) => r.id);
  return m;
}

// ---------------------------------------------------------------- overrides

/** Apply recruiter actions (registry checks, confirmed interest) to a candidate. */
export function applyOverride(cand: Candidate, ov: CandidateOverride | undefined): Candidate {
  if (!ov || (!ov.verified && !ov.interestConfirmed)) return cand;
  const c: Candidate = structuredClone(cand);
  if (ov.verified) {
    for (const [idx, cred] of Object.entries(ov.verified)) c.credentials[Number(idx)] = cred;
  }
  if (ov.interestConfirmed) {
    c.interestConfirmed = ov.interestConfirmed;
    // the recruiter call confirms inferred profile facts with the candidate
    const note = "Confirmed with candidate on recruiter call";
    const upgrade = <T extends { status: string; note?: string; date?: string }>(f: T): T =>
      f.status === "inferred" ? { ...f, status: "self_reported", note, date: ov.interestConfirmed!.date } : f;
    c.currentTitle = upgrade(c.currentTitle);
    c.currentEmployer = upgrade(c.currentEmployer);
    c.location = upgrade(c.location);
    c.workHistory = c.workHistory.map(upgrade);
    c.skills = c.skills.map(upgrade);
    c.education = c.education.map(upgrade);
    c.credentials = c.credentials.map((cr) => (cr.status === "inferred" ? { ...cr, status: "self_reported", note } : cr));
    c.languages = c.languages.map(upgrade);
    if (c.shiftPreference) c.shiftPreference = upgrade(c.shiftPreference);
    if (c.willingToRelocate) c.willingToRelocate = upgrade(c.willingToRelocate);
  }
  return c;
}

// ---------------------------------------------------------------- search + scoring

export function inSearchScope(cand: Candidate, family: Family, ctx: MatchContext, enabled: Set<SourceId>): boolean {
  if (!SEARCH_FAMILIES[family].includes(cand.family)) return false;
  if (!cand.sources.some((s) => enabled.has(s.source))) return false;
  if (!ctx.job) return true;
  const d = distanceMiles(cand, ctx.job)!;
  return d <= SEARCH_RADIUS_MILES || Boolean(cand.willingToRelocate?.value);
}

export function scoreCandidate(cand: Candidate, criteria: Criterion[], ctx: MatchContext): ScoredCandidate {
  const matches = evaluateAll(criteria, cand, ctx);
  return {
    cand,
    matches,
    fit: fitScore(criteria, matches),
    movability: movability(cand, ctx.today),
    readiness: readiness(cand, criteria, matches),
    distance: distanceMiles(cand, ctx.job),
    isActive: cand.poolType !== "passive",
  };
}

export function scorePool(
  all: Candidate[],
  criteria: Criterion[],
  ctx: MatchContext,
  enabled: Set<SourceId>,
  overrides: Record<string, CandidateOverride> = {},
): ScoredCandidate[] {
  return mergeDuplicates(all)
    .filter((c) => inSearchScope(c, ctx.family, ctx, enabled))
    .map((c) => scoreCandidate(applyOverride(c, overrides[c.id]), criteria, ctx));
}

export const READINESS_ORDER: Record<ReadinessLevel, number> = { Ready: 2, "Needs verification": 1, Blocked: 0 };

export type SortKey = "fit" | "readiness" | "movability" | "distance";

/** Default ranking: fit, then readiness, then movability. */
export function rank(list: ScoredCandidate[], key: SortKey = "fit"): ScoredCandidate[] {
  const byFit = (a: ScoredCandidate, b: ScoredCandidate) => b.fit.score - a.fit.score;
  const byReady = (a: ScoredCandidate, b: ScoredCandidate) => READINESS_ORDER[b.readiness.level] - READINESS_ORDER[a.readiness.level];
  const byMove = (a: ScoredCandidate, b: ScoredCandidate) => b.movability.rank - a.movability.rank;
  const byDist = (a: ScoredCandidate, b: ScoredCandidate) => (a.distance ?? 9999) - (b.distance ?? 9999);
  const chains: Record<SortKey, Array<typeof byFit>> = {
    fit: [byFit, byReady, byMove],
    readiness: [byReady, byFit, byMove],
    movability: [byMove, byFit, byReady],
    distance: [byDist, byFit],
  };
  return [...list].sort((a, b) => {
    for (const f of chains[key]) {
      const d = f(a, b);
      if (d) return d;
    }
    return a.cand.name.localeCompare(b.cand.name);
  });
}

// ---------------------------------------------------------------- registry

export function findRegistryRecord(registry: RegistryRecord[], candName: string, cred: Credential): RegistryRecord | undefined {
  if (cred.number) {
    const byNumber = registry.find((r) => r.number === cred.number && r.code === cred.code);
    if (byNumber) return byNumber;
  }
  return registry.find((r) => r.code === cred.code && r.name === candName && (!cred.state || r.state === cred.state));
}

export function credentialFromRegistry(cred: Credential, rec: RegistryRecord | undefined, checked: string): Credential {
  if (!rec) {
    return {
      ...cred,
      status: "verified",
      date: checked,
      claimedStatus: "inactive",
      evidence: `No matching record found in registry · checked ${checked}`,
    };
  }
  const status = rec.status === "good_standing" ? "active" : rec.status;
  const shown = rec.status === "good_standing" ? "Active, in good standing" : rec.status.charAt(0).toUpperCase() + rec.status.slice(1);
  return {
    ...cred,
    status: "verified",
    source: rec.registry,
    date: checked,
    number: rec.number,
    state: rec.state,
    expiry: rec.expiry,
    claimedStatus: status,
    evidence: `${rec.registryName} · #${rec.number} · ${shown} · expires ${rec.expiry}${rec.discipline ? ` · ${rec.discipline}` : ""} · checked ${checked}`,
  };
}
