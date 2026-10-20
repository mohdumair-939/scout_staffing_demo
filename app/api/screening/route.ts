import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { screeningTemplate } from "@/lib/ai/fallbacks";
import { factSheet } from "@/lib/ai/facts";
import { protectedTraitIn } from "@/lib/ai/guardrail";
import { SCREENING_SYSTEM } from "@/lib/ai/prompts";
import { ScreeningSchema, type Screening } from "@/lib/ai/schemas";
import type { Criterion } from "@/lib/data/types";
import type { ScoredCandidate } from "@/lib/matching/pipeline";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { scored: ScoredCandidate; criteria: Criterion[]; jobTitle: string; jobCity?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { scored, criteria } = body;
  if (!scored?.cand || !Array.isArray(criteria)) return NextResponse.json({ error: "scored and criteria are required" }, { status: 400 });

  const template = screeningTemplate(scored, criteria, body.jobCity);
  // nothing open → nothing to ask
  if (template.questions.length === 0) return NextResponse.json<AiResponse<Screening>>({ mode: "rules", data: template });

  const open = template.questions.map((q) => `- ${q.criterionId}: ${criteria.find((c) => c.id === q.criterionId)?.text ?? "Candidate interest"} (${q.why})`);
  const ai = await runStructured({
    schema: ScreeningSchema,
    system: SCREENING_SYSTEM,
    user: `Job: ${body.jobTitle}${body.jobCity ? ` in ${body.jobCity}` : ""}\n\nOpen items to cover:\n${open.join("\n")}\n\n${factSheet(scored, criteria)}`,
    maxTokens: 1500,
  });
  if (ai.ok) {
    const allowed = new Set(template.questions.map((q) => q.criterionId));
    const qs = ai.data.questions.filter((q) => allowed.has(q.criterionId) && q.question.trim() && !protectedTraitIn(q.question)).slice(0, 8);
    if (qs.length) return NextResponse.json<AiResponse<Screening>>({ mode: "ai", data: { questions: qs } });
  }
  const reason = ai.ok ? "AI questions did not match the open items" : ai.reason;
  return NextResponse.json<AiResponse<Screening>>({ mode: "rules", note: `AI unavailable (${reason}); template questions`, data: template });
}
