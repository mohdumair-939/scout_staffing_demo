import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { SOURCES_SYSTEM } from "@/lib/ai/prompts";
import { SourceRationaleSchema } from "@/lib/ai/schemas";
import type { Criterion, Family } from "@/lib/data/types";
import { planSources, SOURCES, type PlannedSource } from "@/lib/matching/sources";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { family: Family; criteria: Criterion[]; jobTitle: string; location: string; useAi?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.family || !Array.isArray(body.criteria)) return NextResponse.json({ error: "family and criteria are required" }, { status: 400 });
  const plan = planSources(body.family, body.criteria);
  if (!body.useAi) return NextResponse.json<AiResponse<PlannedSource[]>>({ mode: "rules", data: plan });

  const ai = await runStructured({
    schema: SourceRationaleSchema,
    system: SOURCES_SYSTEM,
    user: `Job: ${body.jobTitle} in ${body.location}\nMandatory criteria: ${body.criteria.filter((c) => c.mandatory).map((c) => c.text).join("; ")}\n\nSources:\n${plan
      .map((p) => `- ${p.id}: ${SOURCES[p.id].name} (${SOURCES[p.id].type}); recommended=${p.recommended}; can verify: ${SOURCES[p.id].canVerify.join(", ") || "nothing"}`)
      .join("\n")}`,
    maxTokens: 1500,
  });
  if (ai.ok) {
    const byId = new Map(ai.data.rationales.map((r) => [r.sourceId, r.reason.trim()]));
    if (plan.every((p) => byId.get(p.id))) {
      return NextResponse.json<AiResponse<PlannedSource[]>>({ mode: "ai", data: plan.map((p) => ({ ...p, reason: byId.get(p.id)! })) });
    }
  }
  const reason = ai.ok ? "AI skipped some sources" : ai.reason;
  return NextResponse.json<AiResponse<PlannedSource[]>>({ mode: "rules", note: `AI unavailable (${reason}); rule-based reasons`, data: plan });
}
