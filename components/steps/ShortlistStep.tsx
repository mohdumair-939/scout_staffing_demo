"use client";

import { ArrowLeft, FileText, Lock } from "lucide-react";
import { useState } from "react";
import type { AiResponse } from "@/lib/api";
import type { PacketText } from "@/lib/ai/schemas";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import { postJson, useDemo } from "@/lib/state";
import { useScored } from "@/lib/useScored";
import { CandidateDrawer } from "../CandidateDrawer";
import { ModeChip } from "../ModeChip";
import { PacketDocument, PrintButton } from "../PacketView";
import { FitScore, MovabilityChip, PoolBadge, ReadinessChip, ResultIcon } from "../scores";
import { Button, Card, Modal, Spinner, StepBanner } from "../ui";

export function ShortlistStep() {
  const { state, dispatch, approvedCriteria } = useDemo();
  const scored = useScored();
  const criteria = approvedCriteria ?? [];
  const accepted = scored.filter((s) => state.overrides[s.cand.id]?.decision === "accepted");
  const [packet, setPacket] = useState<{ s: ScoredCandidate; res: AiResponse<PacketText> } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const generate = async (s: ScoredCandidate) => {
    setBusyId(s.cand.id);
    try {
      const res = await postJson<AiResponse<PacketText>>("/api/packet", { scored: s, criteria, job: state.job });
      setPacket({ s, res });
    } catch {
      /* the button stays available to retry */
    } finally {
      setBusyId(null);
    }
  };

  const open = openId ? scored.find((s) => s.cand.id === openId) ?? null : null;

  return (
    <div className="space-y-5">
      <StepBanner
        step={5}
        title="Who do we send to the client?"
        right={
          <Button variant="secondary" onClick={() => dispatch({ type: "goto", step: "candidates" })}>
            <ArrowLeft size={15} /> Back to candidates
          </Button>
        }
      >
        The people you accepted. For anyone marked <strong>Ready</strong>, one click creates a clean one-page summary for the client: verified and candidate-provided facts only, no
        contact details. Anyone not yet Ready shows what is still missing.
      </StepBanner>
      {accepted.length === 0 && <Card className="px-5 py-12 text-center text-sm text-muted">No accepted candidates yet. Open a candidate and press Accept.</Card>}

      {accepted.map((s) => {
        const ready = s.readiness.level === "Ready";
        return (
          <Card key={s.cand.id}>
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="text-lg font-semibold hover:text-accent" onClick={() => setOpenId(s.cand.id)}>
                    {s.cand.name}
                  </button>
                  <PoolBadge s={s} />
                </div>
                <div className="text-sm text-muted">
                  {s.cand.currentTitle.value} · {s.cand.currentEmployer.value} · {s.cand.location.value.city}, {s.cand.location.value.state}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <FitScore score={s.fit.score} />
                <MovabilityChip level={s.movability.level} basis={s.movability.basis} />
                <ReadinessChip level={s.readiness.level} />
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-5 py-3">
              <div className="text-sm">
                {ready ? (
                  <span className="text-emerald-700">All mandatory criteria met and verified; interest confirmed.</span>
                ) : (
                  <>
                    <div className="mb-1 font-medium">{s.readiness.level === "Blocked" ? "Blocked because:" : "Before submitting:"}</div>
                    <ul className="space-y-0.5">
                      {[...s.readiness.blockers.map((b) => ["fails", b] as const), ...s.readiness.todo.map((t) => ["unknown", t] as const)].map(([r, t]) => (
                        <li key={t} className="flex items-start gap-1.5 text-xs">
                          <ResultIcon result={r} size={14} /> {t}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {!ready && (
                  <Button variant="secondary" size="sm" onClick={() => setOpenId(s.cand.id)}>
                    Open profile
                  </Button>
                )}
                <Button onClick={() => generate(s)} disabled={!ready || busyId !== null} title={ready ? "" : "Only Ready candidates can be submitted"}>
                  {busyId === s.cand.id ? <Spinner /> : ready ? <FileText size={15} /> : <Lock size={15} />} Generate submission packet
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      <Modal
        open={Boolean(packet)}
        onClose={() => setPacket(null)}
        wide
        title={
          <span className="flex items-center gap-2">
            Submission packet {packet && <ModeChip mode={packet.res.mode} note={packet.res.note} />}
          </span>
        }
        footer={
          packet && (
            <>
              <Button variant="secondary" onClick={() => setPacket(null)}>
                Close
              </Button>
              <PrintButton>
                <PacketDocument s={packet.s} criteria={criteria} job={state.job} text={packet.res.data} />
              </PrintButton>
            </>
          )
        }
      >
        {packet && (
          <div className="rounded-lg border border-line bg-slate-50 p-3">
            <div className="shadow-sm">
              <PacketDocument s={packet.s} criteria={criteria} job={state.job} text={packet.res.data} />
            </div>
          </div>
        )}
      </Modal>

      {open && <CandidateDrawer scored={open} criteria={criteria} onClose={() => setOpenId(null)} />}
    </div>
  );
}
