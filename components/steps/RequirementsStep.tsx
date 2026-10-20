"use client";

import clsx from "clsx";
import { ArrowRight, Check, ChevronDown, GitCompare, HelpCircle, ListChecks, Lock, Pencil, Plus, Quote, RefreshCw, ShieldAlert, Star, Trash2 } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import type { AiResponse } from "@/lib/api";
import type { ClarifyQuestion, Criterion, CriterionCategory, Extraction } from "@/lib/data/types";
import { postJson, useDemo, type CriteriaVersion } from "@/lib/state";
import { ModeChip } from "../ModeChip";
import { Badge, Button, Card, CardHeader, inputClass, Modal, Spinner, StepBanner, Tip } from "../ui";

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

const LEVEL_LABEL: Record<string, string> = { high_school: "High school", certificate: "Certificate", associate: "Associate", bachelor: "Bachelor's", master: "Master's", jd: "J.D." };

/** Short chip for a criterion's value, e.g. "8+ yrs", "35 mi". */
function valueLabel(c: Criterion): string {
  if (!c.value) return "";
  if (c.category === "experience") return `${c.value}+ yrs`;
  if (c.category === "location") return `${c.value} mi`;
  if (c.category === "physical") return `${c.value} lbs`;
  if (c.category === "education") return LEVEL_LABEL[c.value] ?? c.value;
  if (c.category === "license") return c.value.replace(/_/g, " ");
  return c.value;
}

function CriterionRow({
  c,
  active,
  onHover,
  rowRef,
  onUpdate,
  onRemove,
  startEditing,
}: {
  c: Criterion;
  active: boolean;
  onHover: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
  onUpdate: (patch: Partial<Criterion>) => void;
  onRemove: () => void;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(Boolean(startEditing));
  const value = valueLabel(c);
  return (
    <div ref={rowRef} onMouseEnter={onHover} className={clsx("px-5 py-3 transition-colors", active && "bg-accent-soft/60")}>
      {editing ? (
        <div className="grid grid-cols-[160px_minmax(0,1fr)_90px_auto] items-center gap-2">
          <select className={clsx(inputClass, "px-2 py-1.5 text-xs")} value={c.category} onChange={(e) => onUpdate({ category: e.target.value as CriterionCategory })} aria-label="Category">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input autoFocus className={clsx(inputClass, "py-1.5")} value={c.text} onChange={(e) => onUpdate({ text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && c.text.trim() && setEditing(false)} placeholder="Describe the requirement" aria-label="Requirement" />
          <input className={clsx(inputClass, "px-2 py-1.5 text-xs")} value={c.value} onChange={(e) => onUpdate({ value: e.target.value })} placeholder={VALUE_HINT[c.category] ?? "value"} aria-label="Value" />
          <Button size="sm" onClick={() => setEditing(false)} disabled={!c.text.trim()}>
            <Check size={14} /> Done
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{c.text}</span>
              {value && <Badge>{value}</Badge>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <span className="shrink-0">{CATEGORY_LABEL[c.category]}</span>
              <span>·</span>
              <span className="truncate">{c.quote ? <>From the JD: “{c.quote}”</> : c.origin === "clarification" ? "Added from your answer to a question" : c.origin === "recruiter" ? "Added by you" : "Not quoted in the JD"}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tip text={c.mandatory ? "Make it a nice-to-have (preferred)" : "Make it a must-have (mandatory)"}>
              <button onClick={() => onUpdate({ mandatory: !c.mandatory })} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-slate-100 hover:text-ink">
                {c.mandatory ? "→ Nice-to-have" : "→ Must-have"}
              </button>
            </Tip>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Edit requirement">
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Delete requirement">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RequirementsStep() {
  const { state, dispatch, hasDraftChanges } = useDemo();
  const ex = state.extraction!;
  const criteria = state.criteria;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [showNice, setShowNice] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const [newId, setNewId] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ from: CriteriaVersion | null; to: Criterion[]; toLabel: string } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const latest = state.versions.at(-1);

  const update = (id: string, patch: Partial<Criterion>) => dispatch({ type: "setCriteria", criteria: criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const remove = (id: string) => dispatch({ type: "setCriteria", criteria: criteria.filter((c) => c.id !== id) });
  const add = (mandatory: boolean) => {
    const id = `c${Math.max(0, ...criteria.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1}`;
    dispatch({ type: "setCriteria", criteria: [...criteria, { id, category: "skill", text: "", value: "", mandatory, quote: "", origin: "recruiter" }] });
    setNewId(id);
    if (!mandatory) setShowNice(true);
  };

  const focus = (id: string) => {
    setActiveId(id);
    document.getElementById(`q-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const pickFromJd = (id: string) => {
    setActiveId(id);
    if (criteria.find((c) => c.id === id && !c.mandatory)) setShowNice(true);
    requestAnimationFrame(() => rowRefs.current.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" }));
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

  const must = criteria.filter((c) => c.mandatory);
  const nice = criteria.filter((c) => !c.mandatory);
  const answered = ex.data.questions.filter((q) => state.answers[q.id]).length;
  const canApprove = criteria.length > 0 && criteria.every((c) => c.text.trim()) && (hasDraftChanges || !latest);
  const row = (c: Criterion) => (
    <CriterionRow
      key={c.id}
      c={c}
      active={activeId === c.id}
      onHover={() => focus(c.id)}
      rowRef={(el) => {
        if (el) rowRefs.current.set(c.id, el);
      }}
      onUpdate={(patch) => update(c.id, patch)}
      onRemove={() => remove(c.id)}
      startEditing={c.id === newId && !c.text}
    />
  );

  return (
    <div className="space-y-5">
      <StepBanner
        step={2}
        title="What is the client looking for?"
        right={
          <>
            <ModeChip mode={ex.mode} note={ex.note} />
            <Button variant="secondary" size="sm" onClick={() => (hasDraftChanges || state.versions.length ? setConfirmRerun(true) : rerun())} disabled={rerunning}>
              {rerunning ? <Spinner /> : <RefreshCw size={14} />} {rerunning ? "Running AI…" : "Re-run with AI"}
            </Button>
          </>
        }
      >
        The job description was turned into a checklist. <strong>Must-haves</strong> decide who qualifies; <strong>nice-to-haves</strong> only raise the score. Check it, fix anything that’s
        wrong, then approve.
      </StepBanner>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        {/* JD preview */}
        <Card className="self-start lg:sticky lg:top-[150px]">
          <CardHeader
            title="Job description"
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                <mark className="q q-m">must-have</mark>
                <mark className="q q-p">nice-to-have</mark>
                <mark className="q q-x">removed</mark>
              </span>
            }
            icon={<Quote size={18} />}
          />
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-5">
            <JdPreview jd={state.job.jd} criteria={criteria} removed={ex.data.removed} activeId={activeId} onPick={pickFromJd} />
          </div>
        </Card>

        <div className="space-y-5">
          {ex.data.removed.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-600" />
              <div className="text-sm">
                <div className="font-semibold text-red-800">
                  Removed: possible discriminatory requirement{ex.data.removed.length > 1 ? `s (${ex.data.removed.length})` : ""}. Never used for matching.
                </div>
                {ex.data.removed.map((r, i) => (
                  <div key={i} className="mt-1 text-red-900">
                    <Badge tone="red">{r.trait}</Badge> “{r.quote}” <span className="text-xs text-red-700">{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  Must-haves <Badge tone="accent">{must.length}</Badge>
                  <span className="text-xs font-normal text-muted">mandatory: a candidate who fails one can’t be submitted</span>
                </span>
              }
              icon={<ListChecks size={18} />}
              right={
                <Button variant="ghost" size="sm" onClick={() => add(true)}>
                  <Plus size={14} /> Add
                </Button>
              }
            />
            <div className="divide-y divide-line">{must.map(row)}</div>
            {!must.length && <p className="px-5 py-4 text-sm text-muted">No must-haves yet.</p>}
          </Card>

          <Card>
            <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" onClick={() => setShowNice((v) => !v)} aria-expanded={showNice}>
              <span className="flex items-center gap-2 font-semibold">
                <Star size={17} className="text-sky-600" /> Nice-to-haves <Badge tone="blue">{nice.length}</Badge>
                <span className="text-xs font-normal text-muted">preferred: these only add points to the fit score</span>
              </span>
              <ChevronDown size={18} className={clsx("text-muted transition-transform", showNice && "rotate-180")} />
            </button>
            {showNice && (
              <>
                <div className="divide-y divide-line border-t border-line">{nice.map(row)}</div>
                <div className="border-t border-line px-5 py-2">
                  <Button variant="ghost" size="sm" onClick={() => add(false)}>
                    <Plus size={14} /> Add nice-to-have
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card>
            <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" onClick={() => setShowQuestions((v) => !v)} aria-expanded={showQuestions}>
              <span className="flex items-center gap-2 font-semibold">
                <HelpCircle size={17} className="text-accent" /> Questions to ask the client <Badge tone={answered === ex.data.questions.length ? "green" : "amber"}>{answered}/{ex.data.questions.length} answered</Badge>
                <span className="text-xs font-normal text-muted">optional: answers update the checklist</span>
              </span>
              <ChevronDown size={18} className={clsx("text-muted transition-transform", showQuestions && "rotate-180")} />
            </button>
            {showQuestions && (
              <div className="space-y-3 border-t border-line p-5">
                {ex.data.questions.map((q) => (
                  <QuestionRow key={q.id} q={q} />
                ))}
              </div>
            )}
          </Card>

          <Card className="sticky bottom-4 z-10 border-indigo-200 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {!latest && (
                  <span className="text-muted">
                    Checklist looks right? <strong className="text-ink">Approve</strong> to lock it as version 1 and continue.
                  </span>
                )}
                {latest && !hasDraftChanges && (
                  <span className="inline-flex items-center gap-2 text-emerald-700">
                    <Lock size={15} /> Approved as v{latest.version}
                  </span>
                )}
                {latest && hasDraftChanges && (
                  <span className="inline-flex items-center gap-2 text-amber-700">
                    <GitCompare size={15} /> You changed the checklist. Approve the changes as v{latest.version + 1} to use them.
                  </span>
                )}
                {state.versions.length > 1 && (
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
                  <Button variant="secondary" onClick={() => setDiff({ from: latest, to: criteria, toLabel: "your changes" })}>
                    <GitCompare size={15} /> What changed?
                  </Button>
                )}
                {!latest && (
                  <Button
                    size="lg"
                    variant="success"
                    disabled={!canApprove}
                    onClick={() => {
                      dispatch({ type: "approve" });
                      dispatch({ type: "goto", step: "sources" });
                    }}
                  >
                    <Lock size={15} /> Approve and continue <ArrowRight size={15} />
                  </Button>
                )}
                {latest && hasDraftChanges && canApprove && (
                  <Button onClick={() => dispatch({ type: "approve" })}>
                    <Lock size={15} /> Approve as v{latest.version + 1}
                  </Button>
                )}
                {latest && (
                  <Button onClick={() => dispatch({ type: "goto", step: "sources" })} variant={hasDraftChanges ? "secondary" : "primary"}>
                    Next: where to search <ArrowRight size={15} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={Boolean(diff)} onClose={() => setDiff(null)} title="What changed in the checklist">
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
        <p className="text-sm text-muted">This replaces the current checklist, answers and approved versions with a fresh live extraction. If AI is unavailable, the cached or rule-based result is used.</p>
      </Modal>
    </div>
  );
}
