"use client";

import clsx from "clsx";
import { CheckCircle2, CircleHelp, Info, XCircle } from "lucide-react";
import type { Criterion, FactStatus, Provenance } from "@/lib/data/types";
import type { CriterionMatch, MatchResult } from "@/lib/matching/criteria";
import type { MovabilityLevel } from "@/lib/matching/movability";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import type { ReadinessLevel } from "@/lib/matching/readiness";
import { SOURCES } from "@/lib/matching/sources";
import { Badge, Tip } from "./ui";

export const HELP = {
  fit: "FIT (0–100): how well the profile meets the approved criteria. Mandatory criteria carry 75% of the score; failing any mandatory criterion caps fit at 49. Unknown earns partial credit: never a pass, never a fail.",
  movability:
    "MOVABILITY / INTEREST: how likely they are to move now. Confirmed (recruiter spoke to them) > High (applied in the last 90 days) > Medium (past late-stage candidate, or passive with signals: long tenure, employer layoffs, recent profile update) > Low (no signal).",
  readiness:
    "READINESS: Ready = every mandatory criterion met, licences verified with the registry, nothing resting only on inferred data, and interest confirmed. Blocked = fails a mandatory criterion. Anything else = Needs verification.",
  verified: "VERIFIED: checked against an authoritative source (licence registry, recruiter check) on the date shown.",
  self_reported: "SELF-REPORTED: stated by the candidate (résumé, application, phone call). Not independently checked.",
  inferred: "INFERRED: derived by a data provider from professional / public data. Treat it as a lead, not a fact, until confirmed.",
  checklist: "Mandatory checklist: ✅ meets, ❌ does not meet, ❔ unknown. Missing information is always UNKNOWN, never a pass or a fail.",
};

export function HelpIcon({ text }: { text: string }) {
  return (
    <Tip text={text} wide side="bottom">
      <Info size={13} className="text-slate-400 hover:text-accent" />
    </Tip>
  );
}

export function FitScore({ score, compact }: { score: number; compact?: boolean }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className={clsx("flex items-center gap-2", compact ? "w-24" : "w-32")}>
      <span className="w-7 text-right text-sm font-semibold tabular-nums">{score}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const MOVE_TONE: Record<MovabilityLevel, "green" | "blue" | "amber" | "slate"> = { Confirmed: "green", High: "blue", Medium: "amber", Low: "slate" };
export function MovabilityChip({ level, basis }: { level: MovabilityLevel; basis?: string }) {
  const chip = <Badge tone={MOVE_TONE[level]}>{level}</Badge>;
  return basis ? <Tip text={basis}>{chip}</Tip> : chip;
}

const READY_TONE: Record<ReadinessLevel, "green" | "amber" | "red"> = { Ready: "green", "Needs verification": "amber", Blocked: "red" };
export function ReadinessChip({ level, reasons }: { level: ReadinessLevel; reasons?: string[] }) {
  const chip = <Badge tone={READY_TONE[level]}>{level}</Badge>;
  return reasons?.length ? (
    <Tip
      wide
      text={
        <ul className="list-disc space-y-0.5 pl-4">
          {reasons.slice(0, 6).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      }
    >
      {chip}
    </Tip>
  ) : (
    chip
  );
}

export function ResultIcon({ result, size = 16 }: { result: MatchResult; size?: number }) {
  if (result === "meets") return <CheckCircle2 size={size} className="shrink-0 text-emerald-600" aria-label="Meets" />;
  if (result === "fails") return <XCircle size={size} className="shrink-0 text-red-500" aria-label="Does not meet" />;
  return <CircleHelp size={size} className="shrink-0 text-amber-500" aria-label="Unknown" />;
}

export function ChecklistIcons({ criteria, matches }: { criteria: Criterion[]; matches: CriterionMatch[] }) {
  const byId = new Map(matches.map((m) => [m.criterionId, m]));
  return (
    <div className="flex flex-wrap gap-0.5">
      {criteria
        .filter((c) => c.mandatory)
        .map((c) => {
          const m = byId.get(c.id);
          return (
            <Tip key={c.id} text={`${c.text}: ${m?.evidence ?? "unknown"}`}>
              <ResultIcon result={m?.result ?? "unknown"} size={15} />
            </Tip>
          );
        })}
    </div>
  );
}

const STATUS_TONE: Record<FactStatus, "green" | "blue" | "violet"> = { verified: "green", self_reported: "blue", inferred: "violet" };
const STATUS_TEXT: Record<FactStatus, string> = { verified: "VERIFIED", self_reported: "SELF-REPORTED", inferred: "INFERRED" };

export function ProvenanceBadge({ p }: { p: Provenance }) {
  const src = SOURCES[p.source]?.name ?? p.source;
  return (
    <Tip text={`${HELP[p.status]} Source: ${src}${p.date ? ` · ${p.date}` : ""}${p.note ? ` · ${p.note}` : ""}`}>
      <Badge tone={STATUS_TONE[p.status]} className="text-[10px] tracking-wide">
        {STATUS_TEXT[p.status]}
      </Badge>
    </Tip>
  );
}

export function PoolBadge({ s }: { s: ScoredCandidate }) {
  const pool = s.cand.poolType;
  if (pool === "passive")
    return (
      <Tip text="Passive: not applying anywhere. Found through an external (mock) source.">
        <Badge tone="violet">Passive</Badge>
      </Tip>
    );
  return (
    <Tip text={pool === "historical" ? "Active pool, historical: a past candidate in our internal database." : "Active: applied or is in our pool now."}>
      <Badge tone="green">{pool === "historical" ? "Active · historical" : "Active"}</Badge>
    </Tip>
  );
}

export function DuplicateBadge({ s }: { s: ScoredCandidate }) {
  const n = s.cand.mergedFrom?.length ?? 0;
  if (n < 2) return null;
  return (
    <Tip text={`The same person appeared as ${n} separate records (${s.cand.sources.map((x) => SOURCES[x.source].name).join(", ")}). Merged into one profile.`}>
      <Badge tone="accent">Found in {n} sources</Badge>
    </Tip>
  );
}

export function sourceShort(id: string): string {
  const map: Record<string, string> = {
    internal_pool: "Internal",
    job_board: "Job board",
    license_registry: "Licence registry",
    cpa_board: "CPA board",
    bar_directory: "State bar",
    association_directory: "Association",
    data_provider: "Data provider",
    oss_portfolio: "Open source",
  };
  return map[id] ?? id;
}
