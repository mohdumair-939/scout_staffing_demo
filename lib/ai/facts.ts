// Turns a scored candidate into a plain fact sheet: the ONLY material the AI may use.
import type { Candidate, Criterion, FactStatus, Provenance } from "@/lib/data/types";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import { SOURCES } from "@/lib/matching/sources";

export const STATUS_LABEL: Record<FactStatus, string> = {
  verified: "VERIFIED",
  self_reported: "SELF-REPORTED",
  inferred: "INFERRED",
};

export function provLabel(p: Provenance): string {
  return `${STATUS_LABEL[p.status]} · ${SOURCES[p.source]?.name ?? p.source}${p.date ? ` · ${p.date}` : ""}`;
}

export interface FactLine extends Provenance {
  label: string;
  value: string;
  /** display name of the source */
  sourceName: string;
}

/** Profile facts with provenance. `clientSafe` drops inferred facts and anything sensitive. */
export function factLines(c: Candidate, opts: { clientSafe?: boolean } = {}): FactLine[] {
  const out: FactLine[] = [];
  const add = (label: string, value: string, p: Provenance) => {
    if (opts.clientSafe && p.status === "inferred") return;
    out.push({ label, value, status: p.status, source: p.source, date: p.date, note: p.note, sourceName: SOURCES[p.source]?.name ?? p.source });
  };
  add("Current title", c.currentTitle.value, c.currentTitle);
  add("Current employer", c.currentEmployer.value, c.currentEmployer);
  add("Location", `${c.location.value.city}, ${c.location.value.state}`, c.location);
  for (const w of c.workHistory) add("Experience", `${w.title}, ${w.employer} (${w.start} to ${w.end ?? "present"}): ${w.summary}`, w);
  for (const cr of c.credentials) {
    const detail = [cr.state, cr.number && !opts.clientSafe ? `#${cr.number}` : "", cr.expiry ? `expires ${cr.expiry}` : "", cr.claimedStatus].filter(Boolean).join(", ");
    add(cr.kind === "license" ? "Licence" : "Certification", `${cr.name}${detail ? ` (${detail})` : ""}`, cr);
  }
  for (const e of c.education) add("Education", `${e.degree}, ${e.school}${e.year ? ` (${e.year})` : ""}`, e);
  if (c.skills.length) {
    for (const st of ["verified", "self_reported", "inferred"] as FactStatus[]) {
      const names = c.skills.filter((s) => s.status === st).map((s) => s.name);
      if (names.length) add("Skills", names.join(", "), { status: st, source: c.skills.find((s) => s.status === st)!.source });
    }
  }
  for (const l of c.languages) add("Language", l.value, l);
  if (c.shiftPreference) add("Schedule preference", c.shiftPreference.value, c.shiftPreference);
  if (c.physical) add("Physical", c.physical.value, c.physical);
  if (c.background) add("Background / record", c.background.value, c.background);
  if (c.willingToRelocate) add("Willing to relocate", c.willingToRelocate.value ? "Yes" : "No", c.willingToRelocate);
  return out;
}

/** Fact sheet text sent to the model (no contact details, ever). */
export function factSheet(s: ScoredCandidate, criteria: Criterion[], opts: { clientSafe?: boolean } = {}): string {
  const c = s.cand;
  const lines = factLines(c, opts).map((f) => `- [${STATUS_LABEL[f.status]}, ${f.sourceName}] ${f.label}: ${f.value}`);
  const checks = criteria.map((cr) => {
    const m = s.matches.find((x) => x.criterionId === cr.id);
    return `- (${cr.id}) ${cr.mandatory ? "MANDATORY" : "preferred"} | ${cr.text} → ${m?.result.toUpperCase() ?? "UNKNOWN"}: ${m?.evidence ?? ""}`;
  });
  const extra = opts.clientSafe
    ? []
    : [
        `Pool: ${c.poolType}. Found in: ${c.sources.map((x) => SOURCES[x.source].name).join(", ")}.`,
        `Movability: ${s.movability.level} (${s.movability.basis}).`,
        c.signals.length ? `Signals: ${c.signals.map((x) => x.detail).join("; ")}.` : "",
      ];
  return [
    `Candidate: ${c.name}`,
    s.distance != null ? `Distance to job: ${s.distance} miles` : "",
    ...extra,
    "Profile facts:",
    ...lines,
    "Criteria check:",
    ...checks,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Every number in the AI text must also appear in the source material (simple hallucination guard). */
export function numbersGrounded(output: string, source: string): boolean {
  const nums = output.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const src = source.replace(/,/g, "");
  return nums.every((n) => src.includes(n.replace(/,/g, "")));
}

export function hasContactDetails(text: string): boolean {
  return /[\w.+-]+@[\w-]+\.\w+|\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/.test(text);
}
