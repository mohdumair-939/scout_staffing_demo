import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
export const AI_TIMEOUT_MS = 25_000;

export type AiOutcome<T> = { ok: true; data: T } | { ok: false; reason: string };

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

/**
 * One structured-output call. Never throws: any problem (no key, timeout, refusal,
 * truncated or invalid output) comes back as { ok: false } so the caller can use its fallback.
 */
export async function runStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<AiOutcome<z.infer<S>>> {
  const anthropic = getClient();
  if (!anthropic) return { ok: false, reason: "No ANTHROPIC_API_KEY configured" };
  try {
    const res = await anthropic.messages.parse(
      {
        model: MODEL,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
        output_config: { format: zodOutputFormat(opts.schema), effort: "low" },
      },
      { signal: AbortSignal.timeout(AI_TIMEOUT_MS) },
    );
    if (res.stop_reason === "refusal") return { ok: false, reason: "Model declined the request" };
    if (res.stop_reason === "max_tokens") return { ok: false, reason: "Output was truncated" };
    const parsed = opts.schema.safeParse(res.parsed_output);
    if (!parsed.success) return { ok: false, reason: "Output failed validation" };
    return { ok: true, data: parsed.data };
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError || (err instanceof Error && err.name === "TimeoutError")) {
      return { ok: false, reason: `Timed out after ${AI_TIMEOUT_MS / 1000}s` };
    }
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, reason: "Invalid API key" };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "Rate limited" };
    if (err instanceof Anthropic.APIError) return { ok: false, reason: `API error ${err.status ?? ""}`.trim() };
    return { ok: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
}
