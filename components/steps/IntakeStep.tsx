"use client";

import clsx from "clsx";
import { Briefcase, Building2, Calculator, Code2, Gavel, HardHat, HeartPulse, Landmark, Scale, Sparkles, Thermometer, Truck, Zap } from "lucide-react";
import { useState } from "react";
import type { AiResponse } from "@/lib/api";
import { SAMPLE_JOBS } from "@/lib/data/samples";
import type { Extraction, JobInput } from "@/lib/data/types";
import { EMPTY_JOB, postJson, useDemo } from "@/lib/state";
import { Button, Card, CardHeader, Field, inputClass, Spinner, StepBanner } from "../ui";

const ICONS: Record<string, typeof Briefcase> = {
  "controller-dallas": Landmark,
  "senior-accountant-chicago": Calculator,
  "tax-manager-houston": Building2,
  "paralegal-atlanta": Scale,
  "attorney-charlotte": Gavel,
  "estimator-phoenix": HardHat,
  "rn-icu-houston": HeartPulse,
  "electrician-denver": Zap,
  "hvac-austin": Thermometer,
  "cdl-san-antonio": Truck,
  "backend-austin": Code2,
};

const TYPES = ["Full-time", "Part-time", "Contract", "Contract-to-hire", "Temporary", "Per diem"];

export function IntakeStep() {
  const { state, dispatch } = useDemo();
  const job = state.job;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<JobInput>) => dispatch({ type: "setJob", job: { ...job, ...patch } });

  const loadSample = (id: string) => {
    const s = SAMPLE_JOBS.find((x) => x.sampleId === id)!;
    dispatch({ type: "setJob", job: { sampleId: s.sampleId, client: s.client, title: s.title, location: s.location, employmentType: s.employmentType, payRange: s.payRange, jd: s.jd } });
    setError(null);
  };

  const extract = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<AiResponse<Extraction>>("/api/extract", { job });
      // a short pause so the step change is visible even for cached results
      await new Promise((r) => setTimeout(r, 450));
      dispatch({ type: "extracted", extraction: res });
    } catch {
      setError("Could not reach the server. Check that the dev server is running, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const groups = [
    { title: "Professional services (main demo)", items: SAMPLE_JOBS.filter((s) => s.group === "main") },
    { title: "Other industries", items: SAMPLE_JOBS.filter((s) => s.group === "other") },
  ];

  return (
    <div className="space-y-5">
      <StepBanner step={1} title="Paste the client’s job description">
        Fill in the job details and paste the job description, or click a <strong>sample job</strong> on the right. Then press <strong>Extract requirements</strong>.
      </StepBanner>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader title="Job details" icon={<Briefcase size={18} />} />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Client name">
            <input className={inputClass} value={job.client} onChange={(e) => set({ client: e.target.value })} placeholder="e.g. Lone Star Freight Holdings" />
          </Field>
          <Field label="Job title">
            <input className={inputClass} value={job.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Controller" />
          </Field>
          <Field label="Location" hint="City, State or ZIP. Used for commute distance.">
            <input className={inputClass} value={job.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Dallas, TX or 75201" />
          </Field>
          <Field label="Employment type">
            <select className={inputClass} value={job.employmentType} onChange={(e) => set({ employmentType: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Pay range (optional)" className="md:col-span-2">
            <input className={inputClass} value={job.payRange} onChange={(e) => set({ payRange: e.target.value })} placeholder="e.g. $150,000 – $175,000" />
          </Field>
          <Field label="Job description" className="md:col-span-2">
            <textarea className={clsx(inputClass, "min-h-[340px] font-mono text-[13px] leading-relaxed")} value={job.jd} onChange={(e) => set({ jd: e.target.value })} placeholder="Paste the full job description here…" />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div className="text-sm text-muted">
            {error ? <span className="text-red-600">{error}</span> : job.sampleId ? "Sample loaded. You can edit any field before extracting." : "Tip: load a sample to start the demo."}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => dispatch({ type: "setJob", job: EMPTY_JOB })} disabled={busy}>
              Clear
            </Button>
            <Button size="lg" onClick={extract} disabled={busy || !job.jd.trim() || !job.title.trim()}>
              {busy ? <Spinner /> : <Sparkles size={16} />} {busy ? "Extracting requirements…" : "Extract requirements"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={g.title}>
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">{g.title}</div>
            <div className="grid gap-2 p-3">
              {g.items.map((s) => {
                const Icon = ICONS[s.sampleId] ?? Briefcase;
                const active = job.sampleId === s.sampleId;
                return (
                  <button
                    key={s.sampleId}
                    onClick={() => loadSample(s.sampleId)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-indigo-300 hover:bg-slate-50",
                    )}
                  >
                    <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", active ? "bg-accent text-white" : "bg-slate-100 text-slate-600")}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {s.client} · {s.location}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
    </div>
  );
}
