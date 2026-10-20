"use client";

import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { SOURCES } from "@/lib/matching/sources";
import { useDemo } from "@/lib/state";
import { useScored, useSourceCounts } from "@/lib/useScored";
import { Card, CardHeader } from "../ui";

function Bars({ rows, color = "bg-accent" }: { rows: { label: string; value: number; color?: string; hint?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[190px_minmax(0,1fr)_40px] items-center gap-3 text-sm" title={`${r.label}: ${r.value}${r.hint ? ` (${r.hint})` : ""}`}>
          <span className="truncate text-muted">{r.label}</span>
          <div className="h-5 rounded bg-slate-100">
            <div className={`h-full rounded ${r.color ?? color}`} style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 6 : 0 }} />
          </div>
          <span className="text-right font-semibold tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardStep() {
  const { state } = useDemo();
  const scored = useScored();
  const counts = useSourceCounts(state.enabledSources);

  const m = useMemo(() => {
    const active = scored.filter((s) => s.isActive).length;
    const passive = scored.length - active;
    const passAll = scored.filter((s) => s.fit.mandatoryMet === s.fit.mandatoryTotal);
    const lv = (l: string) => scored.filter((s) => s.readiness.level === l).length;
    const mv = (l: string) => scored.filter((s) => s.movability.level === l).length;
    return {
      active,
      passive,
      passAll: passAll.length,
      passAllPassive: passAll.filter((s) => !s.isActive).length,
      ready: lv("Ready"),
      needs: lv("Needs verification"),
      blocked: lv("Blocked"),
      move: { Confirmed: mv("Confirmed"), High: mv("High"), Medium: mv("Medium"), Low: mv("Low") },
    };
  }, [scored]);

  const total = Math.max(1, m.active + m.passive);
  const tiles = [
    { label: "Candidates found", value: scored.length },
    { label: "Pass all mandatory", value: m.passAll, sub: `${m.passAllPassive} of them passive` },
    { label: "Ready to submit", value: m.ready },
    { label: "Passive share", value: `${Math.round((m.passive / total) * 100)}%` },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Job dashboard" subtitle={`${state.job.title} · ${state.job.client} · ${state.job.location}`} icon={<BarChart3 size={18} />} />
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-line p-4">
              <div className="text-3xl font-semibold tabular-nums">{t.value}</div>
              <div className="text-sm text-muted">{t.label}</div>
              {t.sub && <div className="mt-0.5 text-xs text-violet-700">{t.sub}</div>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Records found per source" subtitle="A person found in two sources counts in both." />
          <div className="p-5">
            <Bars rows={state.enabledSources.map((id) => ({ label: SOURCES[id].name.replace("Mock ", ""), value: counts[id] ?? 0, color: SOURCES[id].type === "passive" ? "bg-violet-500" : "bg-emerald-500" }))} />
            <div className="mt-4 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Active source
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Passive source
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Active vs passive" subtitle="Unique candidates after merging duplicates." />
          <div className="p-5">
            <div className="flex h-8 gap-0.5 overflow-hidden rounded">
              <div className="flex items-center justify-center bg-emerald-500 text-xs font-semibold text-white" style={{ width: `${(m.active / total) * 100}%` }}>
                {m.active}
              </div>
              <div className="flex items-center justify-center bg-violet-500 text-xs font-semibold text-white" style={{ width: `${(m.passive / total) * 100}%` }}>
                {m.passive}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-ink">Active: {m.active}</span>
              <span className="text-ink">Passive: {m.passive}</span>
            </div>
            <div className="mt-6">
              <div className="mb-2 text-sm font-medium">Readiness</div>
              <Bars
                rows={[
                  { label: "Ready", value: m.ready, color: "bg-emerald-500" },
                  { label: "Needs verification", value: m.needs, color: "bg-amber-400" },
                  { label: "Blocked", value: m.blocked, color: "bg-red-400" },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Movability / interest" subtitle="How likely the candidates are to move now." />
          <div className="p-5">
            <Bars rows={(["Confirmed", "High", "Medium", "Low"] as const).map((k) => ({ label: k, value: m.move[k] }))} />
          </div>
        </Card>
      </div>
    </div>
  );
}
