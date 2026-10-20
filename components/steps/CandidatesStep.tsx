"use client";

import clsx from "clsx";
import { ArrowRight, Ban, CheckCheck, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { rank, type SortKey } from "@/lib/matching/pipeline";
import { useDemo } from "@/lib/state";
import { useScored } from "@/lib/useScored";
import { CandidateDrawer } from "../CandidateDrawer";
import { ChecklistIcons, DuplicateBadge, FitScore, HELP, HelpIcon, MovabilityChip, PoolBadge, ReadinessChip, sourceShort } from "../scores";
import { Badge, Button, Card, inputClass, Spinner, StepBanner } from "../ui";

type Tab = "all" | "active" | "passive";

export function CandidatesStep() {
  const { state, dispatch, approvedCriteria, candidates } = useDemo();
  const scored = useScored();
  const [tab, setTab] = useState<Tab>("all");
  const [passAll, setPassAll] = useState(false);
  const [radius, setRadius] = useState<number>(0);
  const [minFit, setMinFit] = useState(0);
  const [sort, setSort] = useState<SortKey>("fit");
  const [hideRejected, setHideRejected] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const criteria = approvedCriteria ?? [];

  const counts = useMemo(
    () => ({
      all: scored.length,
      active: scored.filter((s) => s.isActive).length,
      passive: scored.filter((s) => !s.isActive).length,
      passAll: scored.filter((s) => s.fit.mandatoryMet === s.fit.mandatoryTotal).length,
      ready: scored.filter((s) => s.readiness.level === "Ready").length,
      accepted: scored.filter((s) => state.overrides[s.cand.id]?.decision === "accepted").length,
    }),
    [scored, state.overrides],
  );

  const rows = useMemo(() => {
    const list = scored.filter((s) => {
      if (tab === "active" && !s.isActive) return false;
      if (tab === "passive" && s.isActive) return false;
      if (passAll && s.fit.mandatoryMet !== s.fit.mandatoryTotal) return false;
      if (radius && (s.distance ?? 0) > radius) return false;
      if (s.fit.score < minFit) return false;
      if (hideRejected && state.overrides[s.cand.id]?.decision === "rejected") return false;
      return true;
    });
    return rank(list, sort);
  }, [scored, tab, passAll, radius, minFit, sort, hideRejected, state.overrides]);

  if (!candidates) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted">
        <Spinner /> Loading candidates…
      </div>
    );
  }

  const open = openId ? scored.find((s) => s.cand.id === openId) ?? null : null;

  return (
    <div className="space-y-5">
      <StepBanner
        step={4}
        title="Who matches?"
        right={
          <Button onClick={() => dispatch({ type: "goto", step: "shortlist" })} disabled={!counts.accepted}>
            Shortlist ({counts.accepted}) <ArrowRight size={15} />
          </Button>
        }
      >
        Everyone found, ranked best first. Each person gets three separate scores: <strong>Fit</strong> (do they meet the checklist?), <strong>Likely to move?</strong> (would they
        consider a new job?) and <strong>Readiness</strong> (can we submit them now?). <strong>Click a name</strong> to verify their licence and accept them.
      </StepBanner>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          { label: "Candidates found", value: counts.all },
          { label: "Active", value: counts.active, tone: "text-emerald-700" },
          { label: "Passive", value: counts.passive, tone: "text-violet-700" },
          { label: "Meet all must-haves", value: counts.passAll },
          { label: "Ready to submit", value: counts.ready, tone: "text-emerald-700" },
          { label: "Accepted", value: counts.accepted, tone: "text-accent" },
        ].map((k) => (
          <Card key={k.label} className="px-4 py-3">
            <div className={clsx("text-2xl font-semibold tabular-nums", k.tone)}>{k.value}</div>
            <div className="text-xs text-muted">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="flex rounded-lg border border-line p-0.5" role="tablist">
            {(["all", "active", "passive"] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={clsx("rounded-md px-3 py-1.5 text-sm font-medium capitalize", tab === t ? "bg-accent text-white" : "text-muted hover:text-ink")}
              >
                {t} <span className={clsx("ml-1 text-xs", tab === t ? "text-indigo-100" : "text-slate-400")}>{counts[t]}</span>
              </button>
            ))}
          </div>
          <Filter size={15} className="text-muted" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={passAll} onChange={(e) => setPassAll(e.target.checked)} />
            Meets all must-haves
          </label>
          <label className="flex items-center gap-2 text-sm">
            Radius
            <select className={clsx(inputClass, "w-auto py-1 text-sm")} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              <option value={0}>Any</option>
              {[10, 25, 50, 100].map((r) => (
                <option key={r} value={r}>
                  ≤ {r} mi
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            Min fit
            <input type="range" min={0} max={90} step={10} value={minFit} onChange={(e) => setMinFit(Number(e.target.value))} className="w-20 accent-[var(--color-accent)]" />
            <span className="w-6 tabular-nums text-muted">{minFit}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            Sort
            <select className={clsx(inputClass, "w-auto py-1 text-sm")} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="fit">Fit</option>
              <option value="readiness">Readiness</option>
              <option value="movability">Likely to move</option>
              <option value="distance">Distance</option>
            </select>
          </label>
          <span className="ml-auto flex items-center gap-4 text-sm text-muted">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={showChecklist} onChange={(e) => setShowChecklist(e.target.checked)} />
              Checklist
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={hideRejected} onChange={(e) => setHideRejected(e.target.checked)} />
              Hide rejected
            </label>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5">Candidate</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Found in</th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    Fit <HelpIcon text={HELP.fit} />
                  </span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    Likely to move? <HelpIcon text={HELP.movability} />
                  </span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    Readiness <HelpIcon text={HELP.readiness} />
                  </span>
                </th>
                {showChecklist && (
                  <th className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      Must-haves <HelpIcon text={HELP.checklist} />
                    </span>
                  </th>
                )}
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const decision = state.overrides[s.cand.id]?.decision;
                return (
                  <tr
                    key={s.cand.id}
                    onClick={() => setOpenId(s.cand.id)}
                    className={clsx("cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-indigo-50/40", decision === "rejected" && "opacity-50")}
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-ink">{s.cand.name}</span>
                        <PoolBadge s={s} />
                        <DuplicateBadge s={s} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {s.cand.currentTitle.value} · {s.cand.currentEmployer.value}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>
                        {s.cand.location.value.city}, {s.cand.location.value.state}
                      </div>
                      <div className="text-muted">
                        {s.distance != null ? `${s.distance} mi` : "–"}
                        {s.cand.willingToRelocate?.value ? " · relocate" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-[180px] flex-wrap gap-1">
                        {s.cand.sources.map((src) => (
                          <span key={src.source} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                            {sourceShort(src.source)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <FitScore score={s.fit.score} compact />
                    </td>
                    <td className="px-3 py-3">
                      <MovabilityChip level={s.movability.level} basis={s.movability.basis} />
                    </td>
                    <td className="px-3 py-3">
                      <ReadinessChip level={s.readiness.level} reasons={[...s.readiness.blockers, ...s.readiness.todo]} />
                    </td>
                    {showChecklist && (
                      <td className="px-3 py-3">
                        <ChecklistIcons criteria={criteria} matches={s.matches} />
                      </td>
                    )}
                    <td className="px-3 py-3 text-right">
                      {decision === "accepted" && (
                        <Badge tone="green">
                          <CheckCheck size={12} /> Accepted
                        </Badge>
                      )}
                      {decision === "rejected" && (
                        <Badge tone="red">
                          <Ban size={12} /> Rejected
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted">
                    No candidates match these filters.{" "}
                    <button
                      className="text-accent underline"
                      onClick={() => {
                        setTab("all");
                        setPassAll(false);
                        setRadius(0);
                        setMinFit(0);
                        setHideRejected(false);
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <CandidateDrawer scored={open} criteria={criteria} onClose={() => setOpenId(null)} />}
    </div>
  );
}
