"use client";

import clsx from "clsx";
import { ArrowRight, CheckCircle2, ChevronDown, Eye, Play, ShieldCheck, Sparkles, TriangleAlert, UserSearch, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiResponse } from "@/lib/api";
import type { SourceId } from "@/lib/data/types";
import { planSources, SOURCES, type PlannedSource } from "@/lib/matching/sources";
import { postJson, useDemo } from "@/lib/state";
import { useSourceCounts } from "@/lib/useScored";
import { ModeChip } from "../ModeChip";
import { Badge, Button, Card, Spinner, StepBanner, Toggle } from "../ui";

const STEP_MS = 1400;

function SourceCard({
  p,
  on,
  status,
  count,
  disabled,
  onToggle,
}: {
  p: PlannedSource;
  on: boolean;
  status: "idle" | "running" | "done";
  count: number;
  disabled: boolean;
  onToggle: () => void;
}) {
  const def = SOURCES[p.id];
  const [open, setOpen] = useState(false);
  const passive = def.type === "passive";
  return (
    <div className={clsx("rounded-xl border bg-white shadow-sm transition", status === "running" ? "border-accent ring-2 ring-accent/30" : "border-line", !on && "opacity-60")}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={clsx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", passive ? "bg-violet-500" : "bg-emerald-500")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{def.name}</h3>
            {!p.recommended && <Badge tone="amber">Not needed for this job</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{p.reason}</p>
          <button onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline" aria-expanded={open}>
            {open ? "Hide details" : "What it can verify / known gaps"} <ChevronDown size={13} className={clsx("transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="mt-2 grid gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck size={13} /> Can verify
                </div>
                {def.canVerify.length ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-slate-600">
                    {def.canVerify.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600">Nothing. All data is inferred.</p>
                )}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1 font-semibold text-amber-700">
                  <TriangleAlert size={13} /> Known gaps
                </div>
                <ul className="list-disc space-y-0.5 pl-4 text-slate-600">
                  {def.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <p className="mt-1 text-slate-500">Access: mock (demo data)</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Toggle checked={on} onChange={onToggle} label={`Use ${def.name}`} disabled={disabled} />
          {status === "done" && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={15} /> Found {count}
            </span>
          )}
          {status === "running" && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-accent">
              <Spinner className="h-3 w-3" /> Searching…
            </span>
          )}
        </div>
      </div>
      {status === "running" && (
        <div className="h-1 overflow-hidden rounded-b-xl bg-slate-100">
          <div className="h-full bg-accent" style={{ animation: `fill ${STEP_MS}ms linear forwards` }} />
        </div>
      )}
    </div>
  );
}

export function SourcesStep() {
  const { state, dispatch, approvedCriteria, candidates, candidatesError, reloadCandidates } = useDemo();
  const family = state.extraction!.data.family;
  const [aiBusy, setAiBusy] = useState(false);
  const [running, setRunning] = useState<number>(-1);
  const [showOthers, setShowOthers] = useState(false);
  const timers = useRef<number[]>([]);

  // rule-based plan immediately; AI rationale only on request
  useEffect(() => {
    if (!state.sourcePlan && approvedCriteria) {
      dispatch({ type: "sourcePlan", plan: { mode: "rules", data: planSources(family, approvedCriteria) } });
    }
  }, [state.sourcePlan, approvedCriteria, family, dispatch]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const plan = useMemo(() => state.sourcePlan?.data ?? [], [state.sourcePlan]);
  const enabled = state.enabledSources;
  // search order: internal first, then active, then passive
  const ordered = useMemo(() => [...plan.filter((p) => SOURCES[p.id].type === "active"), ...plan.filter((p) => SOURCES[p.id].type === "passive")], [plan]);
  const runOrder = ordered.filter((p) => enabled.includes(p.id)).map((p) => p.id);
  const counts = useSourceCounts(ordered.map((p) => p.id));

  const explainWithAi = async () => {
    if (!approvedCriteria) return;
    setAiBusy(true);
    try {
      const res = await postJson<AiResponse<PlannedSource[]>>("/api/source-plan", { family, criteria: approvedCriteria, jobTitle: state.job.title, location: state.job.location, useAi: true });
      dispatch({ type: "sourcePlan", plan: res });
    } catch {
      /* keep rules */
    } finally {
      setAiBusy(false);
    }
  };

  const runDiscovery = () => {
    if (!runOrder.length) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    dispatch({ type: "startDiscovery" });
    setRunning(0);
    runOrder.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setRunning(i + 1), STEP_MS * (i + 1)));
    });
    timers.current.push(window.setTimeout(() => dispatch({ type: "discovered" }), STEP_MS * runOrder.length + 300));
  };

  const statusOf = (id: SourceId): "idle" | "running" | "done" => {
    if (state.discoveryDone && enabled.includes(id)) return "done";
    const idx = runOrder.indexOf(id);
    if (running < 0 || idx < 0) return "idle";
    if (idx < running) return "done";
    if (idx === running) return "running";
    return "idle";
  };

  const isRunning = running >= 0 && running < runOrder.length && !state.discoveryDone;
  const card = (p: PlannedSource) => (
    <SourceCard
      key={p.id}
      p={p}
      on={enabled.includes(p.id)}
      status={statusOf(p.id)}
      count={counts[p.id] ?? 0}
      disabled={isRunning}
      onToggle={() => dispatch({ type: "toggleSource", id: p.id })}
    />
  );
  // a recommended source, or one the recruiter switched on, is shown in its group
  const visible = (p: PlannedSource) => p.recommended || enabled.includes(p.id);
  const activeSources = ordered.filter((p) => SOURCES[p.id].type === "active" && visible(p));
  const passiveSources = ordered.filter((p) => SOURCES[p.id].type === "passive" && visible(p));
  const others = ordered.filter((p) => !visible(p));
  const total = runOrder.reduce((s, id) => s + (counts[id] ?? 0), 0);

  return (
    <div className="space-y-5">
      <StepBanner
        step={3}
        title="Where should we look?"
        right={
          <>
            {state.sourcePlan && <ModeChip mode={state.sourcePlan.mode} note={state.sourcePlan.note} />}
            <Button variant="secondary" size="sm" onClick={explainWithAi} disabled={aiBusy || isRunning}>
              {aiBusy ? <Spinner /> : <Sparkles size={14} />} Explain with AI
            </Button>
          </>
        }
      >
        We picked the places to search for this job. <span className="font-medium text-emerald-700">Green</span> sources find people who are applying.{" "}
        <span className="font-medium text-violet-700">Purple</span> sources find people who are <strong>not job hunting</strong>, the strong candidates competitors miss. Press{" "}
        <strong>Run discovery</strong> to search.
      </StepBanner>

      {candidatesError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load candidate data.{" "}
          <button className="underline" onClick={reloadCandidates}>
            Retry
          </button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Users size={16} /> Active: people who are applying
          </h2>
          <div className="space-y-3">{activeSources.map(card)}</div>
        </section>
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-800">
            <UserSearch size={16} /> Passive: people who are not looking
          </h2>
          <div className="space-y-3">{passiveSources.map(card)}</div>
        </section>
      </div>

      {others.length > 0 && (
        <div>
          <button onClick={() => setShowOthers((v) => !v)} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink" aria-expanded={showOthers}>
            <ChevronDown size={16} className={clsx("transition-transform", showOthers && "rotate-180")} /> Other sources not needed for this job ({others.length})
          </button>
          {showOthers && <div className="mt-3 grid gap-3 lg:grid-cols-2">{others.map(card)}</div>}
        </div>
      )}

      <Card className="sticky bottom-4 z-10 border-indigo-200 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Eye size={16} className="text-violet-600" />
            {state.discoveryDone
              ? `Done: ${total} records found across ${runOrder.length} sources. Duplicates are merged on the next screen.`
              : `${runOrder.length} sources selected (${runOrder.filter((id) => SOURCES[id].type === "passive").length} passive).`}
          </div>
          <div className="flex gap-2">
            {!state.discoveryDone && (
              <Button size="lg" onClick={runDiscovery} disabled={isRunning || !runOrder.length || !candidates}>
                {isRunning ? <Spinner /> : <Play size={16} />} {isRunning ? "Searching…" : candidates ? "Run discovery" : "Loading data…"}
              </Button>
            )}
            {state.discoveryDone && (
              <>
                <Button variant="secondary" onClick={runDiscovery}>
                  <Play size={15} /> Run again
                </Button>
                <Button size="lg" onClick={() => dispatch({ type: "goto", step: "candidates" })}>
                  Next: see candidates <ArrowRight size={16} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
