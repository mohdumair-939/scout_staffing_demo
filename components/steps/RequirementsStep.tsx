"use client";

import clsx from "clsx";
import { ArrowRight, Check, GitCompare, HelpCircle, Lock, Plus, Quote, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import type { AiResponse } from "@/lib/api";
import type { ClarifyQuestion, Criterion, CriterionCategory, Extraction } from "@/lib/data/types";
import { FAMILY_LABEL } from "@/lib/matching/synonyms";
import { postJson, useDemo, type CriteriaVersion } from "@/lib/state";
import { ModeChip } from "../ModeChip";
import { Badge, Button, Card, CardHeader, inputClass, Modal, Spinner, Tip } from "../ui";

export const CATEGORY_LABEL: Record<CriterionCategory, string> = {
  skill: "Skill",
  license: "Licence / certification",
  experience: "Experience (years)",
  education: "Education",
  location: "Location / commute",
  schedule: "Shift / schedule",
  physical: "Physical",
  tools: "Tools / equipment",
  background: "Clearance / background",
  language: "Language",
  other: "Other",
};

const VALUE_HINT: Partial<Record<CriterionCategory, string>> = {
  experience: "min yrs",
  location: "miles",
  license: "code",
  education: "level",
  physical: "lbs",
};

// ---------------------------------------------------------------- JD preview with highlights

function JdPreview({ jd, criteria, removed, activeId, onPick }: { jd: string; criteria: Criterion[]; removed: { quote: string }[]; activeId: string | null; onPick: (id: string) => void }) {
  const segments = useMemo(() => {
    const ranges: { start: number; end: number; id: string; kind: "m" | "p" | "x" }[] = [];
    for (const c of criteria) {
      if (!c.quote) continue;
      const start = jd.indexOf(c.quote);
      if (start >= 0) ranges.push({ start, end: start + c.quote.length, id: c.id, kind: c.mandatory ? "m" : "p" });
    }
    removed.forEach((r, i) => {
      const start = jd.indexOf(r.quote);
      if (start >= 0) ranges.push({ start, end: start + r.quote.length, id: `removed-${i}`, kind: "x" });
    });
    ranges.sort((a, b) => a.start - b.start);
    const out: Array<string | (typeof ranges)[number] & { text: string }> = [];
    let pos = 0;
    for (const r of ranges) {
      if (r.start < pos) continue; // overlapping quote: keep the first
      out.push(jd.slice(pos, r.start));
      out.push({ ...r, text: jd.slice(r.start, r.end) });
      pos = r.end;
    }
    out.push(jd.slice(pos));
    return out;
  }, [jd, criteria, removed]);

  return (
    <div className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-slate-700">
      {segments.map((s, i) =>
        typeof s === "string" ? (
          <Fragment key={i}>{s}</Fragment>
        ) : (
          <mark
            key={i}
            id={`q-${s.id}`}
            onClick={() => s.kind !== "x" && onPick(s.id)}
            className={clsx("q cursor-pointer", `q-${s.kind}`, activeId === s.id && "q-active")}
            title={s.kind === "x" ? "Removed: possible discriminatory requirement" : "Click to find the criterion"}
          >
            {s.text}
          </mark>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------- diff

export function diffCriteria(a: Criterion[], b: Criterion[]) {
  const byA = new Map(a.map((c) => [c.id, c]));
  const byB = new Map(b.map((c) => [c.id, c]));
  const added = b.filter((c) => !byA.has(c.id));
  const removed = a.filter((c) => !byB.has(c.id));
  const changed = b
    .filter((c) => byA.has(c.id))
    .map((c) => {
      const o = byA.get(c.id)!;
      const fields: string[] = [];
      if (o.text !== c.text) fields.push(`text: "${o.text}" → "${c.text}"`);
      if (o.value !== c.value) fields.push(`value: "${o.value || "–"}" → "${c.value || "–"}"`);
      if (o.mandatory !== c.mandatory) fields.push(`${o.mandatory ? "MANDATORY" : "PREFERRED"} → ${c.mandatory ? "MANDATORY" : "PREFERRED"}`);
      if (o.category !== c.category) fields.push(`category: ${CATEGORY_LABEL[o.category]} → ${CATEGORY_LABEL[c.category]}`);
      return { c, fields };
    })
    .filter((x) => x.fields.length);
  return { added, removed, changed };
}

function DiffView({ from, to, fromLabel, toLabel }: { from: Criterion[]; to: Criterion[]; fromLabel: string; toLabel: string }) {
  const d = diffCriteria(from, to);
  const none = !d.added.length && !d.removed.length && !d.changed.length;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Changes from <strong className="text-ink">{fromLabel}</strong> to <strong className="text-ink">{toLabel}</strong>
      </p>
      {none && <p className="text-muted">No differences.</p>}
      {d.added.map((c) => (
        <div key={`a-${c.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="font-semibold text-emerald-700">+ Added</span> {c.text} <Badge tone={c.mandatory ? "accent" : "blue"}>{c.mandatory ? "Mandatory" : "Preferred"}</Badge>
        </div>
      ))}
      {d.removed.map((c) => (
        <div key={`r-${c.id}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <span className="font-semibold text-red-700">− Removed</span> <span className="line-through">{c.text}</span>
        </div>
      ))}
      {d.changed.map(({ c, fields }) => (
        <div key={`c-${c.id}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="font-semibold text-amber-800">~ Changed</span> {c.text}
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-900">
            {fields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- questions

function quickAnswers(q: ClarifyQuestion): string[] {
  if (q.kind === "toggle_mandatory") return ["Yes, required on day one", "No, can be obtained after hire"];
  if (q.kind === "set_value" && /radius|miles|commute/i.test(q.question)) return ["25 miles", "50 miles"];
  if (q.kind === "set_value") return [];
  if (q.category === "location") return ["Yes, relocation assistance is available", "No relocation"];
  if (q.category === "schedule") return ["Some overtime at month-end (preferred)", "No overtime expected"];
  return [];
}

function QuestionRow({ q }: { q: ClarifyQuestion }) {
  const { state, dispatch } = useDemo();
  const saved = state.answers[q.id];
  const [answer, setAnswer] = useState(saved?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!saved);

  const apply = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await postJson<AiResponse<{ criteria: Criterion[]; summary: string }>>("/api/clarify", { criteria: state.criteria, question: q, answer: text, jobTitle: state.job.title });
      dispatch({ type: "answer", questionId: q.id, answer: text, summary: res.data.summary, mode: res.mode, criteria: res.data.criteria });
      setAnswer(text);
      setEditing(false);
    } catch {
      dispatch({ type: "answer", questionId: q.id, answer: text, summary: "Saved as a note (server unavailable).", mode: "rules", criteria: state.criteria });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-start gap-2">
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{q.question}</p>
          <p className="mt-0.5 text-xs text-muted">{q.why}</p>
          {saved && !editing ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
              <Check size={13} /> <span className="font-medium">“{saved.answer}”</span>
              <span className="text-emerald-700">{saved.summary}</span>
              <ModeChip mode={saved.mode} />
              <button className="ml-auto text-emerald-700 underline" onClick={() => setEditing(true)}>
                Edit
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex gap-2">
                <input
                  className={clsx(inputClass, "py-1.5")}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && apply(answer)}
                  placeholder="Type the client's answer…"
                />
                <Button size="sm" onClick={() => apply(answer)} disabled={busy || !answer.trim()}>
                  {busy ? <Spinner /> : "Apply"}
                </Button>
              </div>
              {quickAnswers(q).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickAnswers(q).map((qa) => (
                    <button key={qa} disabled={busy} onClick={() => apply(qa)} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent">
                      {qa}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- main

export function RequirementsStep() {
  const { state, dispatch, hasDraftChanges } = useDemo();
  const ex = state.extraction!;
  const criteria = state.criteria;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [diff, setDiff] = useState<{ from: CriteriaVersion | null; to: Criterion[]; toLabel: string } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const latest = state.versions.at(-1);

  const update = (id: string, patch: Partial<Criterion>) => dispatch({ type: "setCriteria", criteria: criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const remove = (id: string) => dispatch({ type: "setCriteria", criteria: criteria.filter((c) => c.id !== id) });
  const add = () => {
    const n = Math.max(0, ...criteria.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1;
    dispatch({ type: "setCriteria", criteria: [...criteria, { id: `c${n}`, category: "skill", text: "", value: "", mandatory: false, quote: "", origin: "recruiter" }] });
  };

  const focus = (id: string) => {
    setActiveId(id);
    document.getElementById(`q-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const pickFromJd = (id: string) => {
    setActiveId(id);
    rowRefs.current.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const rerun = async () => {
    setConfirmRerun(false);
    setRerunning(true);
    try {
      const res = await postJson<AiResponse<Extraction>>("/api/extract", { job: state.job, useAi: true });
      dispatch({ type: "extracted", extraction: res });
    } catch {
      /* keep current extraction */
    } finally {
      setRerunning(false);
    }
  };

  const mandatory = criteria.filter((c) => c.mandatory).length;
  const canApprove = criteria.length > 0 && criteria.every((c) => c.text.trim()) && (hasDraftChanges || !latest);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* JD preview */}
      <Card className="self-start lg:sticky lg:top-[150px]">
        <CardHeader
          title="Job description"
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <mark className="q q-m">mandatory</mark>
              </span>
              <mark className="q q-p">preferred</mark>
              <mark className="q q-x">removed</mark>
            </span>
          }
          icon={<Quote size={18} />}
        />
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-5">
          <JdPreview jd={state.job.jd} criteria={criteria} removed={ex.data.removed} activeId={activeId} onPick={pickFromJd} />
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="2. Requirement intelligence"
            subtitle={`${criteria.length} criteria (${mandatory} mandatory) · Occupation family: ${FAMILY_LABEL[ex.data.family]}`}
            icon={<Sparkles size={18} />}
            right={
              <>
                <ModeChip mode={ex.mode} note={ex.note} />
                <Button variant="secondary" size="sm" onClick={() => (hasDraftChanges || state.versions.length ? setConfirmRerun(true) : rerun())} disabled={rerunning}>
                  {rerunning ? <Spinner /> : <RefreshCw size={14} />} {rerunning ? "Running AI…" : "Re-run with AI"}
                </Button>
              </>
            }
          />

          {ex.data.removed.length > 0 && (
            <div className="space-y-2 border-b border-line px-5 py-4">
              {ex.data.removed.map((r, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-red-800">Removed: possible discriminatory requirement ({r.trait})</div>
                    <div className="mt-0.5 text-red-900">“{r.quote}”</div>
                    <div className="mt-1 text-xs text-red-700">{r.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divide-y divide-line">
            <div className="grid grid-cols-[170px_minmax(0,1fr)_80px_118px_56px] gap-2 bg-slate-50 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted">
              <span>Category</span>
              <span>Criterion</span>
              <span>Value</span>
              <span>Type</span>
              <span />
            </div>
            {criteria.map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(c.id, el);
                }}
                onMouseEnter={() => focus(c.id)}
                className={clsx("grid grid-cols-[170px_minmax(0,1fr)_80px_118px_56px] items-center gap-2 px-5 py-2", activeId === c.id && "bg-accent-soft/60")}
              >
                <select className={clsx(inputClass, "px-2 py-1.5 text-xs")} value={c.category} onChange={(e) => update(c.id, { category: e.target.value as CriterionCategory })}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <div className="min-w-0">
                  <input className={clsx(inputClass, "py-1.5")} value={c.text} onChange={(e) => update(c.id, { text: e.target.value })} placeholder="Describe the requirement" />
                  <div className="mt-0.5 truncate text-[11px] text-muted">
                    {c.quote ? (
                      <>JD: “{c.quote}”</>
                    ) : c.origin === "clarification" ? (
                      "From a clarification answer"
                    ) : c.origin === "recruiter" ? (
                      "Added by recruiter"
                    ) : (
                      "Not quoted in JD"
                    )}
                  </div>
                </div>
                <input className={clsx(inputClass, "px-2 py-1.5 text-xs")} value={c.value} onChange={(e) => update(c.id, { value: e.target.value })} placeholder={VALUE_HINT[c.category] ?? "–"} />
                <button
                  onClick={() => update(c.id, { mandatory: !c.mandatory })}
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors",
                    c.mandatory ? "bg-accent text-white ring-accent" : "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100",
                  )}
                  title="Click to toggle mandatory / preferred"
                >
                  {c.mandatory ? "MANDATORY" : "PREFERRED"}
                </button>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)} aria-label="Delete criterion">
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <Button variant="secondary" size="sm" onClick={add}>
              <Plus size={14} /> Add criterion
            </Button>
            <span className="text-xs text-muted">Hover a row to see its quote in the JD. Click a highlight to find its criterion.</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Clarification questions" subtitle="Missing or contradictory information. Answers update or add criteria." icon={<HelpCircle size={18} />} />
          <div className="space-y-3 p-5">
            {ex.data.questions.map((q) => (
              <QuestionRow key={q.id} q={q} />
            ))}
          </div>
        </Card>

        <Card className="sticky bottom-4 z-10 border-indigo-200 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {!latest && <span className="text-muted">Review the criteria, then approve to lock version v1.</span>}
              {latest && !hasDraftChanges && (
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <Lock size={15} /> v{latest.version} approved at {new Date(latest.approvedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {latest && hasDraftChanges && (
                <span className="inline-flex items-center gap-2 text-amber-700">
                  <GitCompare size={15} /> Changes since v{latest.version} are not approved yet. Matching still uses v{latest.version}.
                </span>
              )}
              {state.versions.length > 0 && (
                <span className="flex items-center gap-1">
                  {state.versions.map((v, i) => (
                    <Tip key={v.version} text={i === 0 ? "First approved version" : `Show what changed from v${v.version - 1}`}>
                      <button
                        className="rounded-full border border-line px-2 py-0.5 text-xs hover:border-accent"
                        onClick={() => i > 0 && setDiff({ from: state.versions[i - 1], to: v.criteria, toLabel: `v${v.version}` })}
                      >
                        v{v.version}
                      </button>
                    </Tip>
                  ))}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {latest && hasDraftChanges && (
                <Button variant="secondary" onClick={() => setDiff({ from: latest, to: criteria, toLabel: "current edits" })}>
                  <GitCompare size={15} /> View diff
                </Button>
              )}
              {canApprove && (
                <Button variant={latest ? "primary" : "success"} onClick={() => dispatch({ type: "approve" })}>
                  <Lock size={15} /> {latest ? `Approve as v${latest.version + 1}` : "Approve requirements"}
                </Button>
              )}
              {latest && (
                <Button onClick={() => dispatch({ type: "goto", step: "sources" })} variant={hasDraftChanges ? "secondary" : "primary"}>
                  Source plan <ArrowRight size={15} />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(diff)} onClose={() => setDiff(null)} title="Requirements diff">
        {diff && <DiffView from={diff.from?.criteria ?? []} to={diff.to} fromLabel={diff.from ? `v${diff.from.version}` : "empty"} toLabel={diff.toLabel} />}
      </Modal>
      <Modal
        open={confirmRerun}
        onClose={() => setConfirmRerun(false)}
        title="Re-run extraction with AI?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRerun(false)}>
              Cancel
            </Button>
            <Button onClick={rerun}>
              <RefreshCw size={14} /> Re-run
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">This replaces the current criteria, answers and approved versions with a fresh live extraction. If AI is unavailable, the cached or rule-based result is used.</p>
      </Modal>
    </div>
  );
}
