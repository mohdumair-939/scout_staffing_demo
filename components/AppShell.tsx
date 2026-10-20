"use client";

import clsx from "clsx";
import { BarChart3, Check, FlaskConical, Radar, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { STEPS, useDemo, type StepId } from "@/lib/state";
import { CandidatesStep } from "./steps/CandidatesStep";
import { DashboardStep } from "./steps/DashboardStep";
import { IntakeStep } from "./steps/IntakeStep";
import { RequirementsStep } from "./steps/RequirementsStep";
import { ShortlistStep } from "./steps/ShortlistStep";
import { SourcesStep } from "./steps/SourcesStep";
import { Badge, Button, Modal, Spinner, Tip } from "./ui";

function useHealth() {
  const [health, setHealth] = useState<{ ai: boolean; model: string } | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ai: false, model: "" }));
  }, []);
  return health;
}

export function AppShell() {
  const { state, dispatch, hydrated, reset, approvedCriteria } = useDemo();
  const [confirmReset, setConfirmReset] = useState(false);
  const health = useHealth();

  const reachable: Record<StepId, boolean> = {
    intake: true,
    requirements: Boolean(state.extraction),
    sources: Boolean(approvedCriteria),
    candidates: Boolean(approvedCriteria) && state.discoveryDone,
    shortlist: Boolean(approvedCriteria) && state.discoveryDone,
    dashboard: Boolean(approvedCriteria) && state.discoveryDone,
  };
  const currentIdx = STEPS.findIndex((s) => s.id === state.step);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
              <Radar size={20} />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight">ScoutDesk</div>
              <div className="text-xs text-muted">AI sourcing for staffing teams, any occupation</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tip text="Every candidate, employer, licence number and registry record in this demo is fictional. External sources are simulated." side="bottom">
              <Badge tone="amber" className="py-1">
                <FlaskConical size={13} /> Demo data: synthetic candidates, mock sources
              </Badge>
            </Tip>
            {health && (
              <Tip
                side="bottom"
                text={
                  health.ai
                    ? `Live AI is configured (${health.model}). Each AI step falls back to rules if a call fails or takes over 25 s.`
                    : "No ANTHROPIC_API_KEY set: the demo runs on cached sample extractions, keyword rules and templates."
                }
              >
                <Badge tone={health.ai ? "violet" : "slate"} className="py-1">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", health.ai ? "bg-violet-500" : "bg-slate-400")} />
                  {health.ai ? "Live AI on" : "Live AI off"}
                </Badge>
              </Tip>
            )}
            <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} /> Reset demo
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 pb-3" aria-label="Workflow steps">
          <ol className="flex flex-1 items-center gap-1">
            {STEPS.map((s, i) => {
              const done = i < currentIdx && reachable[s.id];
              const active = state.step === s.id;
              return (
                <li key={s.id} className="flex flex-1 items-center gap-1">
                  <button
                    disabled={!reachable[s.id]}
                    onClick={() => dispatch({ type: "goto", step: s.id })}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed",
                      active ? "bg-accent-soft text-accent-strong" : reachable[s.id] ? "text-ink hover:bg-slate-50" : "text-slate-400",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active ? "bg-accent text-white" : done ? "bg-emerald-500 text-white" : reachable[s.id] ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-400",
                      )}
                    >
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <span className="h-px w-4 shrink-0 bg-line" />}
                </li>
              );
            })}
          </ol>
          <Button
            variant={state.step === "dashboard" ? "primary" : "secondary"}
            size="sm"
            disabled={!reachable.dashboard}
            onClick={() => dispatch({ type: "goto", step: "dashboard" })}
          >
            <BarChart3 size={14} /> Dashboard
          </Button>
        </nav>
        {state.job.title && state.step !== "intake" && (
          <div className="border-t border-line bg-slate-50/70">
            <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-6 py-1.5 text-xs text-muted">
              <span className="font-medium text-ink">{state.job.title}</span>
              <span>·</span>
              <span>{state.job.client || "Client not set"}</span>
              <span>·</span>
              <span>{state.job.location || "Location not set"}</span>
              {state.versions.length > 0 && (
                <>
                  <span>·</span>
                  <span>Requirements v{state.versions.at(-1)!.version} approved</span>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {!hydrated ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted">
            <Spinner /> Loading demo…
          </div>
        ) : (
          <>
            {state.step === "intake" && <IntakeStep />}
            {state.step === "requirements" && reachable.requirements && <RequirementsStep />}
            {state.step === "sources" && reachable.sources && <SourcesStep />}
            {state.step === "candidates" && reachable.candidates && <CandidatesStep />}
            {state.step === "shortlist" && reachable.shortlist && <ShortlistStep />}
            {state.step === "dashboard" && reachable.dashboard && <DashboardStep />}
            {!reachable[state.step] && <IntakeStep />}
          </>
        )}
      </main>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset the demo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
            >
              <RotateCcw size={14} /> Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">This clears the current job, requirements, verifications and shortlist stored in this browser.</p>
      </Modal>
    </div>
  );
}
