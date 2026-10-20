import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { explainTemplate } from "@/lib/ai/fallbacks";
import { factSheet, hasContactDetails, numbersGrounded } from "@/lib/ai/facts";
import { protectedTraitIn } from "@/lib/ai/guardrail";
import { EXPLAIN_SYSTEM } from "@/lib/ai/prompts";
import { ExplainSchema, type Explanation } from "@/lib/ai/schemas";
import type { Criterion } from "@/lib/data/types";
import type { ScoredCandidate } from "@/lib/matching/pipeline";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { scored: ScoredCandidate; criteria: Criterion[]; jobTitle: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { scored, criteria } = body;
  if (!scored?.cand || !Array.isArray(criteria)) return NextResponse.json({ error: "scored and criteria are required" }, { status: 400 });

  const facts = factSheet(scored, criteria);
  const ai = await runStructured({ schema: ExplainSchema, system: EXPLAIN_SYSTEM, user: `Job: ${body.jobTitle}\n\n${facts}`, maxTokens: 1500 });
  if (ai.ok) {
    const all = [ai.data.summary, ...ai.data.strengths, ...ai.data.gaps, ...ai.data.unknowns].join("\n");
    if (ai.data.summary && numbersGrounded(all, facts) && !hasContactDetails(all) && !protectedTraitIn(all)) {
      return NextResponse.json<AiResponse<Explanation>>({ mode: "ai", data: ai.data });
    }
  }
  const reason = ai.ok ? "AI text used facts not in the record" : ai.reason;
  return NextResponse.json<AiResponse<Explanation>>({ mode: "rules", note: `AI unavailable (${reason}); template used`, data: explainTemplate(scored, criteria) });
}
