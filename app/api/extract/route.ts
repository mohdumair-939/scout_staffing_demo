import { NextResponse } from "next/server";
import type { AiResponse } from "@/lib/api";
import { runStructured } from "@/lib/ai/client";
import { extractRules } from "@/lib/ai/fallbacks";
import { normalizeExtraction } from "@/lib/ai/normalize";
import { EXTRACT_SYSTEM, extractUser } from "@/lib/ai/prompts";
import { ExtractionSchema } from "@/lib/ai/schemas";
import { getSample } from "@/lib/data/samples";
import type { Extraction, JobInput } from "@/lib/data/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { job?: JobInput; useAi?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const job = body.job;
  if (!job?.jd?.trim()) return NextResponse.json({ error: "Job description is required" }, { status: 400 });

  // Samples use the hand-checked cached extraction unless "Re-run with AI" was pressed,
  // as long as the JD has not been edited.
  const sample = getSample(job.sampleId);
  const cachedOk = sample && sample.jd.trim() === job.jd.trim();
  if (cachedOk && !body.useAi) {
    return NextResponse.json<AiResponse<Extraction>>({ mode: "cached", note: "Hand-checked cached extraction for this sample", data: sample.extraction });
  }

  const ai = await runStructured({ schema: ExtractionSchema, system: EXTRACT_SYSTEM, user: extractUser(job), maxTokens: 6000 });
  if (ai.ok) {
    const data = normalizeExtraction(ai.data, job);
    if (data) return NextResponse.json<AiResponse<Extraction>>({ mode: "ai", data });
  }
  const reason = ai.ok ? "AI output failed quote/shape checks" : ai.reason;
  if (cachedOk) return NextResponse.json<AiResponse<Extraction>>({ mode: "cached", note: `AI unavailable (${reason}); using the cached extraction`, data: sample.extraction });
  return NextResponse.json<AiResponse<Extraction>>({ mode: "rules", note: `AI unavailable (${reason}); keyword rules used`, data: extractRules(job) });
}
