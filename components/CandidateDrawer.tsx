"use client";

import clsx from "clsx";
import { Ban, BadgeCheck, Briefcase, CheckCheck, ClipboardList, Lightbulb, MapPin, MessageSquareText, PhoneCall, RefreshCw, ShieldCheck, Signal, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AiResponse } from "@/lib/api";
import { factLines } from "@/lib/ai/facts";
import type { Explanation, Screening } from "@/lib/ai/schemas";
import type { Credential, Criterion } from "@/lib/data/types";
import { licenceCodesFor } from "@/lib/matching/criteria";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import { SOURCES } from "@/lib/matching/sources";
import { CREDENTIALS } from "@/lib/matching/synonyms";
import { postJson, useDemo } from "@/lib/state";
import { useMatchContext } from "@/lib/useScored";
import { ModeChip } from "./ModeChip";
import { DuplicateBadge, FitScore, HELP, HelpIcon, MovabilityChip, PoolBadge, ProvenanceBadge, ReadinessChip, ResultIcon } from "./scores";
import { Badge, Button, inputClass, Modal, Spinner } from "./ui";

const REJECT_REASONS = ["Does not meet a mandatory requirement", "Licence / credential issue", "Location or commute", "Compensation mismatch", "Not interested / not responsive", "Duplicate profile", "Client feedback", "Other"];
const ACTIVE_STATES = new Set(["active", "good_standing"]);

/** Fetches AI text once per candidate state and keeps it in the session cache. */
function useAiText<T>(kind: "explain" | "screening", s: ScoredCandidate, criteria: Criterion[], extra: Record<string, string | undefined>) {
  const { aiResults, setAiResult, state } = useDemo();
  const key = `${kind}:${s.cand.id}:${state.versions.length}:${JSON.stringify(state.overrides[s.cand.id] ?? {})}`;
  const [failed, setFailed] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const res = (aiResults[key] as AiResponse<T> | undefined) ?? null;
  const busy = !res && failed !== key;
  // the request body is captured when the key changes; key covers everything that affects it
  const body = JSON.stringify({ scored: s, criteria, ...extra });

  useEffect(() => {
    if (res) return;
    let alive = true;
    fetch(`/api/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => (r.ok ? (r.json() as Promise<AiResponse<T>>) : Promise.reject(new Error(String(r.status)))))
      .then((r) => setAiResult(key, r))
      .catch(() => alive && setFailed(key));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the key changes
  }, [key, res === null, nonce]);

  const reload = () => {
    setFailed(null);
    setAiResult(key, undefined);
    setNonce((n) => n + 1);
  };
  return { res, busy, reload };
}

export function CandidateDrawer({ scored: s, criteria, onClose }: { scored: ScoredCandidate; criteria: Criterion[]; onClose: () => void }) {
  const { state, dispatch } = useDemo();
  const ctx = useMatchContext();
  const c = s.cand;
  const ov = state.overrides[c.id] ?? {};
  const [verifying, setVerifying] = useState<number | null>(null);
  const [check, setLastCheck] = useState<{ candId: string; idx: number; ok: boolean; text: string } | null>(null);
  const lastCheck = check?.candId === c.id ? check : null;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !rejectOpen && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, rejectOpen]);

  const explain = useAiText<Explanation>("explain", s, criteria, { jobTitle: state.job.title });
  const screening = useAiText<Screening>("screening", s, criteria, { jobTitle: state.job.title, jobCity: ctx?.job?.city });

  // licences relevant to this job that a mock registry can check
  const wanted = new Set(criteria.filter((x) => x.category === "license").flatMap((x) => licenceCodesFor(x, ctx?.family)));
  if (wanted.has("JOURNEYMAN_ELECTRICIAN")) wanted.add("MASTER_ELECTRICIAN");
  const verifiable = c.credentials.map((cr, idx) => ({ cr, idx })).filter(({ cr }) => wanted.has(cr.code) && CREDENTIALS[cr.code]?.registry);

  const verify = async (idx: number) => {
    setVerifying(idx);
    try {
      const res = await postJson<{ found: boolean; credential: Credential }>("/api/registry", { name: c.name, credential: c.credentials[idx] });
      dispatch({ type: "override", candidateId: c.id, patch: { verified: { ...ov.verified, [idx]: res.credential } } });
      const ok = res.found && ACTIVE_STATES.has(res.credential.claimedStatus) && (!res.credential.expiry || res.credential.expiry >= (ctx?.today ?? ""));
      setLastCheck({ candId: c.id, idx, ok, text: res.credential.evidence ?? "" });
    } catch {
      setLastCheck({ candId: c.id, idx, ok: false, text: "Registry unavailable, try again." });
    } finally {
      setVerifying(null);
    }
  };

  const confirmInterest = () =>
    dispatch({
      type: "override",
      candidateId: c.id,
      patch: { interestConfirmed: { date: new Date().toISOString().slice(0, 10), note: "Recruiter call: candidate is interested and confirmed profile details" } },
    });

  const byId = new Map(s.matches.map((m) => [m.criterionId, m]));
  const facts = factLines(c);
  const mand = criteria.filter((x) => x.mandatory);
  const pref = criteria.filter((x) => !x.mandatory);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col bg-white shadow-2xl" role="dialog" aria-label={`${c.name} details`}>
        {/* header */}
        <div className="border-b border-line px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{c.name}</h2>
                <PoolBadge s={s} />
                <DuplicateBadge s={s} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={14} /> {c.currentTitle.value} · {c.currentEmployer.value}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {c.location.value.city}, {c.location.value.state}
                  {s.distance != null && ` · ${s.distance} mi`}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted">
                Fit <HelpIcon text={HELP.fit} />
              </div>
              <FitScore score={s.fit.score} />
              <div className="mt-1 text-xs text-muted">
                {s.fit.mandatoryMet}/{s.fit.mandatoryTotal} mandatory met
                {s.fit.mandatoryUnknown ? ` · ${s.fit.mandatoryUnknown} unknown` : ""}
                {s.fit.mandatoryFailed ? ` · ${s.fit.mandatoryFailed} failed` : ""}
              </div>
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted">
                Movability <HelpIcon text={HELP.movability} />
              </div>
              <MovabilityChip level={s.movability.level} />
              <div className="mt-1 line-clamp-3 text-xs text-muted">{s.movability.basis}</div>
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted">
                Readiness <HelpIcon text={HELP.readiness} />
              </div>
              <ReadinessChip level={s.readiness.level} />
              <div className="mt-1 text-xs text-muted">
                {s.readiness.blockers.length ? `${s.readiness.blockers.length} blocker(s)` : s.readiness.todo.length ? `${s.readiness.todo.length} item(s) to confirm` : "Ready to submit"}
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {verifiable.map(({ cr, idx }) => {
              const done = cr.status === "verified";
              return (
                <Button key={idx} variant={done ? "secondary" : "primary"} size="sm" onClick={() => verify(idx)} disabled={verifying !== null}>
                  {verifying === idx ? <Spinner /> : <ShieldCheck size={14} />} {done ? "Re-check" : "Verify"} {CREDENTIALS[cr.code]?.name.split(" (")[0].replace(" licence", "") ?? cr.code}
                </Button>
              );
            })}
            <Button variant="secondary" size="sm" onClick={confirmInterest} disabled={Boolean(c.interestConfirmed)}>
              <PhoneCall size={14} /> {c.interestConfirmed ? "Interest confirmed" : "Mark interest confirmed"}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant={ov.decision === "accepted" ? "success" : "secondary"} size="sm" onClick={() => dispatch({ type: "override", candidateId: c.id, patch: { decision: ov.decision === "accepted" ? undefined : "accepted" } })}>
                <CheckCheck size={14} /> {ov.decision === "accepted" ? "Accepted" : "Accept"}
              </Button>
              <Button variant="danger" size="sm" onClick={() => (ov.decision === "rejected" ? dispatch({ type: "override", candidateId: c.id, patch: { decision: undefined } }) : setRejectOpen(true))}>
                <Ban size={14} /> {ov.decision === "rejected" ? "Rejected (undo)" : "Reject"}
              </Button>
            </div>
          </div>
          {lastCheck && (
            <div className={clsx("mt-3 rounded-lg border px-3 py-2 text-xs", lastCheck.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}>
              <div className="font-semibold">{lastCheck.ok ? "Registry confirms the licence is active" : "Registry does not confirm what the candidate reported"}</div>
              <div className="mt-0.5 font-mono">{lastCheck.text}</div>
            </div>
          )}
          {ov.decision === "rejected" && ov.rejectReason && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              Rejected: {ov.rejectReason}
              {ov.rejectNote ? `: ${ov.rejectNote}` : ""}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* readiness reasons */}
          {(s.readiness.blockers.length > 0 || s.readiness.todo.length > 0) && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">What stands between this candidate and “Ready”</h3>
              <ul className="space-y-1 text-sm">
                {s.readiness.blockers.map((b) => (
                  <li key={b} className="flex gap-2 text-red-700">
                    <ResultIcon result="fails" size={15} /> {b}
                  </li>
                ))}
                {s.readiness.todo.map((t) => (
                  <li key={t} className="flex gap-2 text-amber-800">
                    <ResultIcon result="unknown" size={15} /> {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* checklist */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardList size={15} /> Mandatory checklist <HelpIcon text={HELP.checklist} />
            </h3>
            <div className="divide-y divide-line rounded-lg border border-line">
              {mand.map((cr) => {
                const m = byId.get(cr.id)!;
                return (
                  <div key={cr.id} className="flex items-start gap-3 px-3 py-2">
                    <ResultIcon result={m.result} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{cr.text}</div>
                      <div className="text-xs text-muted">{m.evidence}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {m.provenance[0] && <ProvenanceBadge p={m.provenance.find((p) => p.status !== "verified") ?? m.provenance[0]} />}
                      {m.needsVerification && <Badge tone="amber">Not verified</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
            {pref.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-muted">Preferred criteria ({pref.filter((p) => byId.get(p.id)?.result === "meets").length}/{pref.length} met)</summary>
                <div className="mt-2 divide-y divide-line rounded-lg border border-line">
                  {pref.map((cr) => {
                    const m = byId.get(cr.id)!;
                    return (
                      <div key={cr.id} className="flex items-start gap-3 px-3 py-2">
                        <ResultIcon result={m.result} size={15} />
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="font-medium text-ink">{cr.text}</span> <span className="text-muted">· {m.evidence}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </section>

          {/* explanation */}
          <section className="rounded-lg border border-indigo-100 bg-accent-soft/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb size={15} /> Why this candidate
              </h3>
              <div className="flex items-center gap-2">
                {explain.res && <ModeChip mode={explain.res.mode} note={explain.res.note} />}
                <Button variant="ghost" size="sm" onClick={explain.reload} disabled={explain.busy} aria-label="Regenerate explanation">
                  <RefreshCw size={13} />
                </Button>
              </div>
            </div>
            {explain.busy && !explain.res ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Writing explanation from the record…
              </div>
            ) : explain.res ? (
              <div className="space-y-2 text-sm">
                <p>{explain.res.data.summary}</p>
                {explain.res.data.strengths.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">Matches</div>
                    <ul className="list-disc pl-5 text-slate-700">
                      {explain.res.data.strengths.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {explain.res.data.gaps.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-red-700">Gaps</div>
                    <ul className="list-disc pl-5 text-slate-700">
                      {explain.res.data.gaps.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {explain.res.data.unknowns.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-amber-700">Unknowns</div>
                    <ul className="list-disc pl-5 text-slate-700">
                      {explain.res.data.unknowns.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-muted">Built only from facts in this record.</p>
              </div>
            ) : (
              <p className="text-sm text-muted">Explanation unavailable.</p>
            )}
          </section>

          {/* screening */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <MessageSquareText size={15} /> Screening questions (only what is still open)
              </h3>
              {screening.res && <ModeChip mode={screening.res.mode} note={screening.res.note} />}
            </div>
            {screening.busy && !screening.res ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Generating questions…
              </div>
            ) : screening.res?.data.questions.length ? (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                {screening.res.data.questions.map((q) => (
                  <li key={q.question}>
                    {q.question} <span className="text-xs text-muted">({q.why})</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-emerald-700">Nothing left to confirm.</p>
            )}
          </section>

          {/* registry evidence */}
          {c.credentials.some((cr) => cr.evidence) && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <BadgeCheck size={15} /> Registry evidence
              </h3>
              <div className="space-y-1.5">
                {c.credentials
                  .filter((cr) => cr.evidence)
                  .map((cr) => (
                    <div key={cr.code + cr.evidence} className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {cr.evidence}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* profile facts */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              Profile facts with provenance <HelpIcon text={`${HELP.verified} ${HELP.self_reported} ${HELP.inferred}`} />
            </h3>
            <div className="divide-y divide-line rounded-lg border border-line text-sm">
              {facts.map((f, i) => (
                <div key={i} className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2">
                  <span className="text-xs font-medium text-muted">{f.label}</span>
                  <span className="text-slate-800">{f.value}</span>
                  <span className="flex flex-col items-end gap-0.5">
                    <ProvenanceBadge p={f} />
                    <span className="text-[10px] text-muted">{f.sourceName.replace("Mock ", "")}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* sources + signals */}
          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Found in</h3>
              <ul className="space-y-1.5 text-xs">
                {c.sources.map((src) => (
                  <li key={src.source} className="rounded-md border border-line px-3 py-2">
                    <div className="font-medium text-ink">{SOURCES[src.source].name}</div>
                    <div className="text-muted">
                      ID {src.externalId} · retrieved {src.retrieved}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Signal size={14} /> Signals & history
              </h3>
              <ul className="space-y-1.5 text-xs">
                {c.signals.map((sg, i) => (
                  <li key={i} className="rounded-md bg-violet-50 px-3 py-2 text-violet-900">
                    {sg.detail}
                  </li>
                ))}
                {c.applications.map((a, i) => (
                  <li key={`a${i}`} className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">
                    {a.stage.charAt(0).toUpperCase() + a.stage.slice(1)}: {a.jobTitle} ({a.client}) on {a.date}
                  </li>
                ))}
                {c.interestConfirmed && <li className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">Interest confirmed {c.interestConfirmed.date}: {c.interestConfirmed.note}</li>}
                {!c.signals.length && !c.applications.length && !c.interestConfirmed && <li className="text-muted">No signals.</li>}
              </ul>
            </div>
          </section>
          <p className="pb-4 text-[11px] text-muted">Contact details are hidden in this demo and never included in client packets.</p>
        </div>
      </aside>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${c.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: "override", candidateId: c.id, patch: { decision: "rejected", rejectReason: reason, rejectNote: note } });
                setRejectOpen(false);
              }}
            >
              <Ban size={14} /> Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Reason
            <select className={clsx(inputClass, "mt-1")} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Note (optional)
            <textarea className={clsx(inputClass, "mt-1 min-h-20")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Registry shows licence lapsed in 2025" />
          </label>
        </div>
      </Modal>
    </>
  );
}
