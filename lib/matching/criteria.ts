import type { Candidate, Credential, Criterion, Family, FactStatus, Provenance } from "@/lib/data/types";
import { haversineMiles, statesIn, type GeoPoint } from "./distance";
import {
  CREDENTIALS,
  DOMAINS,
  EDU_FIELDS,
  EDU_RANK,
  EDU_TERMS,
  LANGUAGES,
  SCHEDULE,
  SCHEDULE_CONFLICTS,
  SKILLS,
  STOPWORDS,
  credentialCodesIn,
  domainsIn,
  findTerms,
  hasTerm,
  norm,
  skillsIn,
} from "./synonyms";

export type MatchResult = "meets" | "fails" | "unknown";

export interface CriterionMatch {
  criterionId: string;
  result: MatchResult;
  evidence: string;
  /** provenance of the facts used as evidence */
  provenance: Provenance[];
  /** a registry-verifiable credential that has not been verified yet */
  needsVerification?: { code: string; credentialIndex: number };
  /** evidence rests only on inferred facts */
  inferredOnly?: boolean;
}

export interface MatchContext {
  family: Family;
  /** job location; undefined when the location couldn't be resolved */
  job?: GeoPoint & { city: string; state: string };
  /** ISO date used as "today" for expiry / recency */
  today: string;
}

/** Credentials that also satisfy a required code. */
const EQUIVALENT: Record<string, string[]> = {
  JOURNEYMAN_ELECTRICIAN: ["JOURNEYMAN_ELECTRICIAN", "MASTER_ELECTRICIAN"],
  OSHA_10: ["OSHA_10", "OSHA_30"],
};

const ACTIVE_STATES = new Set(["active", "good_standing"]);

function prov(p: Provenance): Provenance {
  return { status: p.status, source: p.source, date: p.date };
}

function onlyInferred(ps: Provenance[]): boolean {
  return ps.length > 0 && ps.every((p) => p.status === "inferred");
}

export function distanceMiles(cand: Candidate, job?: GeoPoint): number | undefined {
  if (!job) return undefined;
  return Math.round(haversineMiles(cand.location.value, job));
}

/** Canonical skill names a candidate has, mapped to the facts that support them. */
export function candidateSkillMap(cand: Candidate): Map<string, Provenance> {
  const out = new Map<string, Provenance>();
  for (const s of cand.skills) {
    const keys = SKILLS[s.name] ? [s.name] : [];
    for (const k of [...keys, ...skillsIn(s.name)]) if (!out.has(k)) out.set(k, prov(s));
  }
  return out;
}

function firstNumber(text: string): number | undefined {
  const m = text.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : undefined;
}

// ---------------------------------------------------------------- per category

function evalCredential(c: Criterion, cand: Candidate, ctx: MatchContext, codes: string[]): CriterionMatch {
  const requiredStates = /mobility|any (u\.?s\.? )?state/i.test(c.text) ? [] : statesIn(c.text);
  const compactOk = /compact|multistate/i.test(c.text);
  const parts: { result: MatchResult; evidence: string; provenance: Provenance[]; nv?: CriterionMatch["needsVerification"] }[] = [];

  for (const code of codes) {
    const def = CREDENTIALS[code];
    const accepted = EQUIVALENT[code] ?? [code];
    const held = cand.credentials
      .map((cr, i) => ({ cr, i }))
      .filter(({ cr }) => accepted.includes(cr.code));
    if (held.length === 0) {
      parts.push(
        cand.complete.credentials
          ? { result: "fails", evidence: `No ${def?.name ?? code} on profile`, provenance: [] }
          : { result: "unknown", evidence: `${def?.name ?? code}: not in available data`, provenance: [] },
      );
      continue;
    }
    // best = active first, then the most recent expiry
    const scored = held
      .map(({ cr, i }) => ({ cr, i, state: effectiveState(cr, ctx.today) }))
      .sort((a, b) => Number(ACTIVE_STATES.has(b.state)) - Number(ACTIVE_STATES.has(a.state)) || (b.cr.expiry ?? "").localeCompare(a.cr.expiry ?? ""));
    const { cr, i, state } = scored[0];
    const where = cr.state ? ` (${cr.state})` : "";
    const label = `${CREDENTIALS[cr.code]?.name ?? cr.name}${where}`;
    if (!ACTIVE_STATES.has(state)) {
      const when = cr.expiry ? ` ${state === "expired" ? "on" : "since"} ${cr.expiry}` : "";
      parts.push({ result: "fails", evidence: `${label} is ${state}${when}${cr.status === "verified" ? " (registry)" : ""}`, provenance: [prov(cr)] });
      continue;
    }
    if (requiredStates.length && cr.state && !requiredStates.includes(cr.state)) {
      const multistate = /multistate|compact/i.test(cr.name);
      if (!(compactOk && multistate)) {
        parts.push({ result: "fails", evidence: `${label}; role requires ${requiredStates.join(" or ")}`, provenance: [prov(cr)] });
        continue;
      }
    }
    const verifiable = Boolean(def?.registry);
    const expiry = cr.expiry ? `, expires ${cr.expiry}` : "";
    parts.push({
      result: "meets",
      evidence: `${label} active${expiry}`,
      provenance: [prov(cr)],
      nv: verifiable && cr.status !== "verified" ? { code: cr.code, credentialIndex: i } : undefined,
    });
  }

  const result: MatchResult = parts.some((p) => p.result === "fails") ? "fails" : parts.some((p) => p.result === "unknown") ? "unknown" : "meets";
  const provenance = parts.flatMap((p) => p.provenance);
  return {
    criterionId: c.id,
    result,
    evidence: parts.map((p) => p.evidence).join("; "),
    provenance,
    needsVerification: parts.find((p) => p.nv)?.nv,
    inferredOnly: result === "meets" && onlyInferred(provenance),
  };
}

export function effectiveState(cr: Credential, today: string): string {
  if (cr.claimedStatus === "active" && cr.expiry && cr.expiry < today) return "expired";
  return cr.claimedStatus;
}

function toMonthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function relevantYears(cand: Candidate, domains: string[], today: string): { years: number; provenance: Provenance[]; titles: string[] } {
  const nowYm = today.slice(0, 7);
  const entries = cand.workHistory.filter((w) => {
    if (!domains.length) return true;
    const text = norm(`${w.title} ${w.summary}`);
    return domains.every((d) => DOMAINS[d].some((alias) => hasTerm(text, alias)));
  });
  // merge overlapping intervals (month granularity)
  const intervals = entries
    .map((w) => [toMonthIndex(w.start), toMonthIndex(w.end ?? nowYm)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let months = 0;
  let cur: [number, number] | null = null;
  for (const iv of intervals) {
    if (!cur || iv[0] > cur[1]) {
      if (cur) months += cur[1] - cur[0];
      cur = [...iv];
    } else cur[1] = Math.max(cur[1], iv[1]);
  }
  if (cur) months += cur[1] - cur[0];
  return { years: Math.round((months / 12) * 10) / 10, provenance: entries.map(prov), titles: entries.map((e) => e.title) };
}

function evalExperience(c: Criterion, cand: Candidate, ctx: MatchContext): CriterionMatch {
  const need = Number(c.value) || firstNumber(c.text) || 1;
  if (cand.workHistory.length === 0) {
    return { criterionId: c.id, result: "unknown", evidence: "No work history available", provenance: [] };
  }
  const domains = domainsIn(c.text);
  const { years, provenance, titles } = relevantYears(cand, domains, ctx.today);
  const scope = domains.length ? "relevant" : "total";
  if (years >= need) {
    return {
      criterionId: c.id,
      result: "meets",
      evidence: `${years} yrs ${scope} (${[...new Set(titles)].slice(0, 2).join(", ")})`,
      provenance,
      inferredOnly: onlyInferred(provenance),
    };
  }
  return {
    criterionId: c.id,
    result: "fails",
    evidence: years > 0 ? `${years} yrs ${scope}; needs ${need}+` : `No ${scope} experience found; needs ${need}+`,
    provenance,
  };
}

function evalEducation(c: Criterion, cand: Candidate): CriterionMatch {
  const text = c.text;
  const levels = (Object.keys(EDU_TERMS) as (keyof typeof EDU_TERMS)[]).filter((l) => EDU_TERMS[l].some((t) => hasTerm(norm(text), t)));
  if (c.value && c.value in EDU_RANK && !levels.includes(c.value as keyof typeof EDU_RANK)) levels.push(c.value as keyof typeof EDU_RANK);
  if (!levels.length) levels.push("bachelor");
  const required = levels.sort((a, b) => EDU_RANK[a] - EDU_RANK[b])[/\bor\b/i.test(text) ? 0 : levels.length - 1];
  // "certificate or bachelor's degree" → any field; "or related" → any field
  const multiLevel = levels.length > 1 && /\bor\b/i.test(text);
  const fields = /related/i.test(text) || multiLevel ? [] : findTerms(text.replace(/\bBSN\b/g, "nursing"), EDU_FIELDS);
  if (cand.education.length === 0) {
    return cand.complete.education
      ? { criterionId: c.id, result: "fails", evidence: "No degree on profile", provenance: [] }
      : { criterionId: c.id, result: "unknown", evidence: "Education not in available data", provenance: [] };
  }
  const levelOk = (lvl: keyof typeof EDU_RANK) => (required === "jd" ? lvl === "jd" : EDU_RANK[lvl] >= EDU_RANK[required]);
  const fieldOk = (e: Candidate["education"][number]) =>
    fields.length === 0 || fields.some((f) => EDU_FIELDS[f].some((alias) => hasTerm(norm(`${e.field} ${e.degree}`), alias)));
  const match = cand.education.find((e) => levelOk(e.level) && fieldOk(e));
  if (match) {
    return { criterionId: c.id, result: "meets", evidence: `${match.degree}, ${match.school}`, provenance: [prov(match)], inferredOnly: match.status === "inferred" };
  }
  const best = [...cand.education].sort((a, b) => EDU_RANK[b.level] - EDU_RANK[a.level])[0];
  const why = levelOk(best.level) ? `field differs (needs ${fields.join(" or ")})` : "lower level than required";
  return { criterionId: c.id, result: "fails", evidence: `${best.degree}: ${why}`, provenance: [prov(best)] };
}

function evalLocation(c: Criterion, cand: Candidate, ctx: MatchContext): CriterionMatch {
  const p = [prov(cand.location)];
  if (/remote/i.test(c.text) && !/hybrid|on.?site|office/i.test(c.text)) {
    return { criterionId: c.id, result: "meets", evidence: "Remote role", provenance: p };
  }
  if (!ctx.job) return { criterionId: c.id, result: "unknown", evidence: "Job location not recognised", provenance: p };
  const radius = Number(c.value) || Number(c.text.match(/(\d+)\s*mi/i)?.[1]) || 50;
  const d = distanceMiles(cand, ctx.job)!;
  const where = `${cand.location.value.city}, ${cand.location.value.state}`;
  if (d <= radius) return { criterionId: c.id, result: "meets", evidence: `${where}: ${d} mi from ${ctx.job.city}`, provenance: p };
  if (cand.willingToRelocate?.value) {
    return {
      criterionId: c.id,
      result: "meets",
      evidence: `${where}: ${d} mi away, willing to relocate`,
      provenance: [...p, prov(cand.willingToRelocate)],
      inferredOnly: cand.willingToRelocate.status === "inferred",
    };
  }
  return { criterionId: c.id, result: "fails", evidence: `${where}: ${d} mi away (limit ${radius} mi)`, provenance: p };
}

function evalSchedule(c: Criterion, cand: Candidate): CriterionMatch {
  const pref = cand.shiftPreference;
  if (!pref) return { criterionId: c.id, result: "unknown", evidence: "Schedule preference unknown", provenance: [] };
  const req = findTerms(c.text, SCHEDULE);
  const has = findTerms(pref.value, SCHEDULE);
  const flexible = /\bany\b|flexible|open to/i.test(pref.value);
  const conflict = SCHEDULE_CONFLICTS.find(([r, p]) => req.includes(r) && has.includes(p) && !has.includes(r));
  const p = [prov(pref)];
  if (conflict && !flexible) return { criterionId: c.id, result: "fails", evidence: `Prefers: ${pref.value}`, provenance: p };
  if (flexible || req.some((r) => has.includes(r)) || req.length === 0) {
    return { criterionId: c.id, result: "meets", evidence: `Prefers: ${pref.value}`, provenance: p, inferredOnly: pref.status === "inferred" };
  }
  return { criterionId: c.id, result: "unknown", evidence: `Prefers: ${pref.value} (unclear fit)`, provenance: p };
}

function evalLanguage(c: Criterion, cand: Candidate): CriterionMatch {
  const wanted = LANGUAGES.filter((l) => hasTerm(norm(`${c.text} ${c.value}`), l));
  if (!wanted.length) wanted.push("english");
  const have = (l: string) => cand.languages.find((f) => f.value.toLowerCase() === l);
  const missing = wanted.filter((l) => !have(l));
  const p = wanted.map(have).filter(Boolean).map((f) => prov(f!));
  if (!missing.length) return { criterionId: c.id, result: "meets", evidence: `Speaks ${wanted.map(cap).join(", ")}`, provenance: p, inferredOnly: onlyInferred(p) };
  return cand.complete.languages
    ? { criterionId: c.id, result: "fails", evidence: `No ${missing.map(cap).join(", ")} listed`, provenance: p }
    : { criterionId: c.id, result: "unknown", evidence: `${missing.map(cap).join(", ")}: not in available data`, provenance: p };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function evalPhysical(c: Criterion, cand: Candidate): CriterionMatch {
  const f = cand.physical;
  if (!f) return { criterionId: c.id, result: "unknown", evidence: "Physical requirements not discussed yet", provenance: [] };
  const need = Number(c.text.match(/(\d+)\s*(lb|lbs|pounds)/i)?.[1] ?? c.value) || undefined;
  const can = Number(f.value.match(/(\d+)\s*(lb|lbs|pounds)/i)?.[1]) || undefined;
  if ((need && can && can < need) || /restriction|cannot|unable/i.test(f.value)) {
    return { criterionId: c.id, result: "fails", evidence: f.value, provenance: [prov(f)] };
  }
  return { criterionId: c.id, result: "meets", evidence: f.value, provenance: [prov(f)], inferredOnly: f.status === "inferred" };
}

function evalBackground(c: Criterion, cand: Candidate): CriterionMatch {
  const f = cand.background;
  if (!f) return { criterionId: c.id, result: "unknown", evidence: "Background / record not checked yet", provenance: [] };
  const v = f.value;
  const clean = /\bclean\b|cleared|passed|no violations|0 violations/i.test(v);
  const bad = /dui|dwi|felony|accident|\b[3-9] (moving )?violations/i.test(v);
  if (bad && !clean) return { criterionId: c.id, result: "fails", evidence: v, provenance: [prov(f)] };
  if (clean) return { criterionId: c.id, result: "meets", evidence: v, provenance: [prov(f)], inferredOnly: f.status === "inferred" };
  return { criterionId: c.id, result: "unknown", evidence: v, provenance: [prov(f)] };
}

function evalSkills(c: Criterion, cand: Candidate): CriterionMatch {
  const canon = skillsIn(c.text);
  const have = candidateSkillMap(cand);
  if (canon.length === 0) {
    // free text: look for the meaningful words anywhere in the profile
    const words = norm(c.text)
      .trim()
      .split(" ")
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
    if (!words.length) return { criterionId: c.id, result: "unknown", evidence: "Needs recruiter review", provenance: [] };
    const haystack = norm([...cand.skills.map((s) => s.name), ...cand.workHistory.map((w) => `${w.title} ${w.summary}`)].join(" "));
    const hits = words.filter((w) => haystack.includes(" " + w.slice(0, 6)));
    if (hits.length / words.length >= 0.6) {
      return { criterionId: c.id, result: "meets", evidence: `Mentioned in profile: ${hits.join(", ")}`, provenance: cand.workHistory.slice(0, 1).map(prov), inferredOnly: false };
    }
    return { criterionId: c.id, result: "unknown", evidence: "Not mentioned in available data", provenance: [] };
  }
  const anyMode = canon.length > 1 && /\bor\b|either|one of/i.test(c.text);
  const found = canon.filter((k) => have.has(k));
  const missing = canon.filter((k) => !have.has(k));
  const p = found.map((k) => have.get(k)!);
  if ((anyMode && found.length > 0) || (!anyMode && missing.length === 0)) {
    return { criterionId: c.id, result: "meets", evidence: found.join(", "), provenance: p, inferredOnly: onlyInferred(p) };
  }
  if (cand.complete.skills) {
    return { criterionId: c.id, result: "fails", evidence: `Missing: ${(anyMode ? canon.join(" or ") : missing.join(", "))}`, provenance: p };
  }
  return {
    criterionId: c.id,
    result: "unknown",
    evidence: `${found.length ? `Has ${found.join(", ")}; ` : ""}not listed: ${anyMode ? canon.join(" or ") : missing.join(", ")}`,
    provenance: p,
  };
}

// ---------------------------------------------------------------- entry point

export function licenceCodesFor(c: Criterion, family?: Family): string[] {
  const fromValue = c.value
    .split(/[,;/]\s*|\s+and\s+/)
    .map((v) => v.trim().toUpperCase())
    .filter((v) => v in CREDENTIALS);
  return fromValue.length ? fromValue : credentialCodesIn(c.text, family);
}

export function evaluateCriterion(c: Criterion, cand: Candidate, ctx: MatchContext): CriterionMatch {
  switch (c.category) {
    case "license": {
      const codes = licenceCodesFor(c, ctx.family);
      return codes.length ? evalCredential(c, cand, ctx, codes) : evalSkills(c, cand);
    }
    case "experience":
      return evalExperience(c, cand, ctx);
    case "education":
      return evalEducation(c, cand);
    case "location":
      return evalLocation(c, cand, ctx);
    case "schedule":
      return evalSchedule(c, cand);
    case "language":
      return evalLanguage(c, cand);
    case "physical":
      return evalPhysical(c, cand);
    case "background":
      return evalBackground(c, cand);
    default: {
      // skill / tools / other — but route credential-looking text to the licence check
      const codes = skillsIn(c.text).length ? [] : licenceCodesFor(c, ctx.family);
      return codes.length ? evalCredential(c, cand, ctx, codes) : evalSkills(c, cand);
    }
  }
}

export function evaluateAll(criteria: Criterion[], cand: Candidate, ctx: MatchContext): CriterionMatch[] {
  return criteria.map((c) => evaluateCriterion(c, cand, ctx));
}

export function statusOfFacts(ps: Provenance[]): FactStatus | undefined {
  if (!ps.length) return undefined;
  if (ps.every((p) => p.status === "verified")) return "verified";
  if (ps.some((p) => p.status === "inferred") && ps.every((p) => p.status !== "verified")) return onlyInferred(ps) ? "inferred" : "self_reported";
  return "self_reported";
}
