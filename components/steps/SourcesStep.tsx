"use client";

import clsx from "clsx";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Play, Search, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiResponse } from "@/lib/api";
import type { SourceId } from "@/lib/data/types";
import { planSources, SOURCES, type PlannedSource } from "@/lib/matching/sources";
import { postJson, useDemo } from "@/lib/state";
import { useSourceCounts } from "@/lib/useScored";
import { ModeChip } from "../ModeChip";
import { Badge, Button, Card, CardHeader, Spinner, Toggle } from "../ui";

const STEP_MS = 1400;

export function SourcesStep() {
  const { state, dispatch, approvedCriteria, candidates, candidatesError, reloadCandidates } = useDemo();
  const family = state.extraction!.data.family;
  const [aiBusy, setAiBusy] = useState(false);
  const [running, setRunning] = useState<number>(-1);
  const timers = useRef<number[]>([]);

  // rule-based plan immediately; AI rationale only on request
  useEffect(() => {
    if (!state.sourcePlan && approvedCriteria) {
      dispatch({ type: "sourcePlan", plan: { mode: "rules", data: planSources(family, approvedCriteria) } });
    }
  }, [state.sourcePlan, approvedCriteria, family, dispatch]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const ordered = useMemo(() => {
    const plan = state.sourcePlan?.data ?? [];
    return [...plan.filter((p) => p.recommended), ...plan.filter((p) => !p.recommended)];
  }, [state.sourcePlan]);
  const enabled = state.enabledSources;
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

  const passiveOn = enabled.filter((id) => SOURCES[id].type === "passive").length;
  const isRunning = running >= 0 && running < runOrder.length && !state.discoveryDone;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="3. Source plan"
          subtitle="Where to look for this job. Passive sources find people who are not applying anywhere: that's where the best candidates usually are."
          icon={<Search size={18} />}
          right={
            <>
              {state.sourcePlan && <ModeChip mode={state.sourcePlan.mode} note={state.sourcePlan.note} />}
              <Button variant="secondary" size="sm" onClick={explainWithAi} disabled={aiBusy || isRunning}>
                {aiBusy ? <Spinner /> : <Sparkles size={14} />} Explain with AI
              </Button>
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-6 px-5 py-3 text-sm">
          <span>
            <strong>{enabled.length}</strong> sources on
          </span>
          <span>
            <strong>{enabled.length - passiveOn}</strong> active · <strong className="text-violet-700">{passiveOn}</strong> passive
          </span>
          <span className="text-muted">Search area: 150 miles around {state.job.location || "the job"}, plus candidates willing to relocate.</span>
        </div>
      </Card>

      {candidatesError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load candidate data. <button className="underline" onClick={reloadCandidates}>Retry</button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((p, i) => {
          const def = SOURCES[p.id];
          const on = enabled.includes(p.id);
          const status = statusOf(p.id);
          return (
            <Card key={p.id} className={clsx("flex flex-col transition-opacity", !on && "opacity-60", status === "running" && "ring-2 ring-accent")}>
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted">#{i + 1}</span>
                    <h3 className="font-semibold">{def.name}</h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={def.type === "passive" ? "violet" : "green"}>{def.type === "passive" ? "Passive" : "Active"}</Badge>
                    <Badge>Access: mock</Badge>
                    {!p.recommended && <Badge tone="amber">Not recommended</Badge>}
                  </div>
                </div>
                <Toggle checked={on} onChange={() => dispatch({ type: "toggleSource", id: p.id })} label={`Use ${def.name}`} disabled={isRunning} />
              </div>
              <p className="px-4 pt-3 text-sm text-ink">{p.reason}</p>
              <div className="grid gap-3 px-4 py-3 text-xs">
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck size={13} /> What it can verify
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
                </div>
              </div>
              <div className="mt-auto border-t border-line px-4 py-3">
                {status === "idle" && <div className="text-xs text-muted">{on ? "Ready to search" : "Off"}</div>}
                {status === "running" && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-accent">
                      <Spinner className="h-3 w-3" /> Searching {def.name.replace("Mock ", "")}…
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-accent" style={{ animation: `fill ${STEP_MS}ms linear forwards` }} />
                    </div>
                  </div>
                )}
                {status === "done" && (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={16} /> Found {counts[p.id] ?? 0} records
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="sticky bottom-4 z-10 border-indigo-200 shadow-lg">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            {passiveOn > 0 ? <Eye size={16} className="text-violet-600" /> : <EyeOff size={16} />}
            {state.discoveryDone
              ? "Discovery complete. Candidates are matched and ranked."
              : passiveOn > 0
                ? "Passive sources on: the search includes people who are not job hunting."
                : "Only active sources are on: you will only see people who applied."}
          </div>
          <div className="flex gap-2">
            {!state.discoveryDone && (
              <Button size="lg" onClick={runDiscovery} disabled={isRunning || !runOrder.length || !candidates}>
                {isRunning ? <Spinner /> : <Play size={16} />} {isRunning ? "Running discovery…" : candidates ? "Run discovery" : "Loading data…"}
              </Button>
            )}
            {state.discoveryDone && (
              <>
                <Button variant="secondary" onClick={runDiscovery}>
                  <Play size={15} /> Run again
                </Button>
                <Button size="lg" onClick={() => dispatch({ type: "goto", step: "candidates" })}>
                  View candidates <ArrowRight size={16} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
