import { connection, NextResponse } from "next/server";
import { MODEL } from "@/lib/ai/client";

/** Tells the UI whether live AI is configured (never exposes the key). */
export async function GET() {
  await connection(); // evaluate env at request time, not build time
  return NextResponse.json({ ai: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
}
