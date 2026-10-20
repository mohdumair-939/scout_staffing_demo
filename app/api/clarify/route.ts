import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { applyAnswerRules } from "@/lib/ai/fallbacks";
import { protectedTraitIn } from "@/lib/ai/guardrail";
import { CLARIFY_SYSTEM } from "@/lib/ai/prompts";
import { ClarifySchema } from "@/lib/ai/schemas";
import type { ClarifyQuestion, Criterion } from "@/lib/data/types";

export const maxDuration = 60;

type Result = { criteria: Criterion[]; summary: string };

export async function POST(req: Request) {
  let body: { criteria: Criterion[]; question: ClarifyQuestion; answer: string; jobTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { criteria, question, answer } = body;
  if (!Array.isArray(criteria) || !question || !answer?.trim()) return NextResponse.json({ error: "criteria, question and answer are required" }, { status: 400 });

  const hit = protectedTraitIn(answer);
  if (hit) {
    return NextResponse.json<AiResponse<Result>>({ mode: "rules", note: "Guardrail", data: { criteria, summary: `Not applied: the answer mentions a protected trait (${hit.trait}).` } });
  }

  const ai = await runStructured({
    schema: ClarifySchema,
    system: CLARIFY_SYSTEM,
    user: `Job: ${body.jobTitle ?? ""}\nCriteria (JSON):\n${JSON.stringify(criteria.map(({ id, category, text, value, mandatory }) => ({ id, category, text, value, mandatory })))}\n\nQuestion: ${question.question}\nRelated criterion id: ${question.targetId || "(none)"}\nRecruiter's answer: ${answer}`,
    maxTokens: 2000,
  });
  if (ai.ok) {
    const ids = new Set(criteria.map((c) => c.id));
    const updates = ai.data.updates.filter((u) => ids.has(u.id) && u.text.trim());
    const additions = ai.data.additions.filter((a) => a.text.trim() && !protectedTraitIn(a.text));
    let next = criteria.map((c) => {
      const u = updates.find((x) => x.id === c.id);
      return u ? { ...c, text: u.text, value: u.value, mandatory: u.mandatory, origin: "clarification" as const } : c;
    });
    let n = Math.max(0, ...criteria.map((c) => Number(c.id.replace(/\D/g, "")) || 0));
    next = [...next, ...additions.map((a) => ({ id: `c${++n}`, ...a, quote: "", origin: "clarification" as const }))];
    return NextResponse.json<AiResponse<Result>>({ mode: "ai", data: { criteria: next, summary: ai.data.summary || "Criteria updated." } });
  }
  return NextResponse.json<AiResponse<Result>>({ mode: "rules", note: `AI unavailable (${ai.reason}); rule-based update`, data: applyAnswerRules(criteria, question, answer) });
}
