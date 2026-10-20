import type { ClarifyQuestion, Criterion, Extraction, JobInput, RemovedRequirement } from "@/lib/data/types";
import { templateQuestions } from "./fallbacks";
import { protectedTraitIn } from "./guardrail";
import type { ExtractionAI } from "./schemas";

const squash = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

/** Find the quote in the JD; return the exact JD substring, the closest JD line, or "". */
export function locateQuote(quote: string, jd: string): string {
  if (!quote) return "";
  if (jd.includes(quote)) return quote;
  const q = squash(quote).replace(/\.$/, "");
  const lines = jd.split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  const exactLine = lines.find((l) => squash(l).includes(q));
  if (exactLine) {
    const idx = squash(exactLine).indexOf(q);
    // positions only line up when the line had no squashed characters before the match
    const candidate = exactLine.slice(idx, idx + quote.length);
    return jd.includes(candidate) && squash(candidate) === q ? candidate : exactLine;
  }
  const words = new Set(q.split(/\W+/).filter((w) => w.length > 2));
  let best = "";
  let bestScore = 0;
  for (const l of lines) {
    const lw = squash(l).split(/\W+/);
    const score = lw.filter((w) => words.has(w)).length / Math.max(1, words.size);
    if (score > bestScore) {
      bestScore = score;
      best = l;
    }
  }
  return bestScore >= 0.6 ? best : "";
}

/** Validate and tidy a model extraction. Returns null when it is not usable. */
export function normalizeExtraction(ai: ExtractionAI, job: JobInput): Extraction | null {
  const removed: RemovedRequirement[] = ai.removed
    .map((r) => ({ quote: locateQuote(r.quote, job.jd) || r.quote, trait: r.trait, reason: r.reason }))
    .filter((r) => r.quote);
  const criteria: Criterion[] = [];
  const indexToId = new Map<number, string>();
  ai.criteria.forEach((c, i) => {
    const text = c.text.trim();
    if (!text) return;
    // defence in depth: never keep a protected-trait criterion even if the model did
    const hit = protectedTraitIn(`${text} ${c.quote}`);
    if (hit) {
      if (!removed.some((r) => r.quote === c.quote)) removed.push({ quote: locateQuote(c.quote, job.jd) || c.quote || text, trait: hit.trait, reason: hit.reason });
      return;
    }
    const id = `c${criteria.length + 1}`;
    indexToId.set(i, id);
    criteria.push({ id, category: c.category, text: text.slice(0, 140), value: c.value.trim(), mandatory: c.mandatory, quote: locateQuote(c.quote, job.jd), origin: "extracted" });
  });
  if (criteria.length < 2 || criteria.length > 30) return null;
  const quoted = criteria.filter((c) => c.quote).length;
  if (quoted / criteria.length < 0.6) return null;

  let questions: ClarifyQuestion[] = ai.questions
    .filter((q) => q.question.trim())
    .slice(0, 6)
    .map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question.trim(),
      why: q.why.trim(),
      kind: q.kind === "toggle_mandatory" || q.kind === "set_value" ? (indexToId.has(q.targetIndex) ? q.kind : "info") : q.kind,
      targetId: indexToId.get(q.targetIndex) ?? "",
      category: q.category,
    }));
  if (questions.length < 3) {
    const extra = templateQuestions(criteria, job, removed).filter((t) => !questions.some((q) => q.question === t.question));
    questions = [...questions, ...extra].slice(0, Math.max(3, questions.length)).map((q, i) => ({ ...q, id: `q${i + 1}` }));
  }
  return { family: ai.occupationFamily, criteria, removed, questions };
}
