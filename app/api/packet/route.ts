import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { packetTemplate } from "@/lib/ai/fallbacks";
import { factSheet, hasContactDetails, numbersGrounded } from "@/lib/ai/facts";
import { protectedTraitIn } from "@/lib/ai/guardrail";
import { PACKET_SYSTEM } from "@/lib/ai/prompts";
import { PacketSchema, type PacketText } from "@/lib/ai/schemas";
import type { Criterion, JobInput } from "@/lib/data/types";
import type { ScoredCandidate } from "@/lib/matching/pipeline";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { scored: ScoredCandidate; criteria: Criterion[]; job: JobInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { scored, criteria, job } = body;
  if (!scored?.cand || !Array.isArray(criteria) || !job) return NextResponse.json({ error: "scored, criteria and job are required" }, { status: 400 });
  if (scored.readiness.level !== "Ready") {
    return NextResponse.json({ error: "Packets can only be generated for Ready candidates", reasons: [...scored.readiness.blockers, ...scored.readiness.todo] }, { status: 409 });
  }

  // client-safe fact sheet: verified + self-reported only, no licence numbers, no contact details
  const facts = factSheet(scored, criteria, { clientSafe: true });
  const ai = await runStructured({
    schema: PacketSchema,
    system: PACKET_SYSTEM,
    user: `Client: ${job.client}\nRole: ${job.title} (${job.location})\n\n${facts}`,
    maxTokens: 1500,
  });
  if (ai.ok) {
    const all = [ai.data.headline, ai.data.summary, ...ai.data.highlights, ...ai.data.considerations].join("\n");
    if (numbersGrounded(all, facts + job.title + job.location) && !hasContactDetails(all) && !protectedTraitIn(all)) {
      return NextResponse.json<AiResponse<PacketText>>({ mode: "ai", data: ai.data });
    }
  }
  const reason = ai.ok ? "AI text used facts outside the allowed set" : ai.reason;
  return NextResponse.json<AiResponse<PacketText>>({ mode: "rules", note: `AI unavailable (${reason}); template used`, data: packetTemplate(scored, criteria, job) });
}
