"use client";

import { Printer, Radar } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { PacketText } from "@/lib/ai/schemas";
import type { Criterion, JobInput } from "@/lib/data/types";
import { statusOfFacts } from "@/lib/matching/criteria";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import { Button } from "./ui";

/** The client-facing one-pager. Verified / self-reported facts only, no contact details. */
export function PacketDocument({ s, criteria, job, text }: { s: ScoredCandidate; criteria: Criterion[]; job: JobInput; text: PacketText }) {
  const byId = new Map(s.matches.map((m) => [m.criterionId, m]));
  const mand = criteria.filter((c) => c.mandatory);
  const creds = s.cand.credentials.filter((c) => c.status !== "inferred");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="mx-auto max-w-[760px] bg-white p-8 text-[13px] leading-relaxed text-slate-800">
      <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3">
        <div className="flex items-center gap-2 text-indigo-700">
          <Radar size={18} /> <span className="font-semibold">ScoutDesk Staffing</span>
        </div>
        <div className="text-right text-xs text-slate-500">
          Candidate submission · {today}
          <br />
          For {job.client} · {job.title}
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-semibold text-slate-900">{s.cand.name}</h1>
      <p className="text-sm font-medium text-indigo-700">{text.headline}</p>
      <p className="mt-3">{text.summary}</p>

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Client requirements</h2>
      <table className="mt-2 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-500">
            <th className="py-1.5 pr-3 font-medium">Requirement</th>
            <th className="py-1.5 pr-3 font-medium">Evidence</th>
            <th className="py-1.5 font-medium">Basis</th>
          </tr>
        </thead>
        <tbody>
          {mand.map((c) => {
            const m = byId.get(c.id);
            const st = m ? statusOfFacts(m.provenance) : undefined;
            return (
              <tr key={c.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-3 font-medium">✓ {c.text}</td>
                <td className="py-1.5 pr-3 text-slate-600">{m?.evidence}</td>
                <td className="py-1.5 whitespace-nowrap text-slate-500">{st === "verified" ? "Verified" : "Candidate-provided"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Highlights</h2>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {text.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      {creds.length > 0 && (
        <>
          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Licences & certifications</h2>
          <ul className="mt-1 space-y-0.5">
            {creds.map((c) => (
              <li key={c.code}>
                {c.name}
                {c.state ? ` (${c.state})` : ""}
                {c.expiry ? `, valid through ${c.expiry}` : ""}
                {c.status === "verified" ? ` · verified with registry ${c.date ?? ""}` : " · candidate-provided"}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent experience</h2>
      <ul className="mt-1 space-y-1">
        {s.cand.workHistory
          .filter((w) => w.status !== "inferred")
          .slice(0, 3)
          .map((w) => (
            <li key={w.title + w.start}>
              <span className="font-medium">{w.title}</span>, {w.employer}{" "}
              <span className="text-slate-500">
                ({w.start} – {w.end ?? "present"})
              </span>
            </li>
          ))}
      </ul>

      {text.considerations.length > 0 && (
        <>
          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Notes for the hiring manager</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
            {text.considerations.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        Contact details are provided by your ScoutDesk recruiter. Prepared from verified and candidate-provided information only. DEMO: synthetic candidate data.
      </p>
    </div>
  );
}

export function PrintButton({ children }: { children: React.ReactNode }) {
  // portal target only exists in the browser
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <>
      <Button onClick={() => window.print()}>
        <Printer size={15} /> Print / Download PDF
      </Button>
      {mounted && createPortal(<div className="print-root">{children}</div>, document.body)}
    </>
  );
}
