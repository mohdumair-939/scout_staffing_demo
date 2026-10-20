// End-to-end smoke test against a running server (default http://localhost:3000).
// Walks every sample through the same API calls the UI makes.
//   npx tsx scripts/smoke.ts [baseUrl]
import type { Candidate, Credential, Extraction, SampleJob, SourceId } from "../lib/data/types";
import { DEMO_TODAY } from "../lib/data/constants";
import { resolveLocation } from "../lib/matching/distance";
import { rank, scorePool, type CandidateOverride } from "../lib/matching/pipeline";
import { planSources } from "../lib/matching/sources";
import { CREDENTIALS } from "../lib/matching/synonyms";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
let failures = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    failures++;
    console.log(`   ✗ ${msg}`);
  }
};

async function post<T>(path: string, body: unknown): Promise<{ status: number; json: T }> {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: (await r.json()) as T };
}

async function main() {
  const health = await (await fetch(`${BASE}/api/health`)).json();
  console.log("health", health);
  const cands: Candidate[] = await (await fetch(`${BASE}/api/candidates`)).json();
  ok(cands.length > 300, "candidates endpoint returns data");
  const ids: string[] = JSON.parse(readFileSync("data/samples/index.json", "utf8"));

  for (const id of ids) {
    const s: SampleJob = JSON.parse(readFileSync(`data/samples/${id}.json`, "utf8"));
    const job = { sampleId: s.sampleId, client: s.client, title: s.title, location: s.location, employmentType: s.employmentType, payRange: s.payRange, jd: s.jd };
    const t0 = Date.now();
    const ex = await post<{ mode: string; note?: string; data: Extraction }>("/api/extract", { job });
    ok(ex.json.mode === "cached" && ex.json.data.criteria.length >= 8, `${id}: cached extraction`);
    const ai = await post<{ mode: string; data: Extraction }>("/api/extract", { job, useAi: true });
    ok(["ai", "cached"].includes(ai.json.mode) && ai.json.data.criteria.length > 0, `${id}: re-run with AI returns ai or cached`);
    const edited = await post<{ mode: string; data: Extraction }>("/api/extract", { job: { ...job, jd: job.jd + "\n- Must be comfortable presenting to clients." } });
    ok(edited.json.data.criteria.length >= 5, `${id}: edited JD → rules/AI extraction has criteria (${edited.json.mode}, ${edited.json.data.criteria.length})`);
    ok(edited.json.data.questions.length >= 3 && edited.json.data.questions.length <= 6, `${id}: 3–6 questions in rules mode`);

    const e = ex.json.data;
    // clarify the first question
    const q = e.questions[0];
    const cl = await post<{ mode: string; data: { criteria: unknown[]; summary: string } }>("/api/clarify", { criteria: e.criteria, question: q, answer: q.kind === "toggle_mandatory" ? "No, can be obtained after hire" : "50 miles", jobTitle: s.title });
    ok(cl.status === 200 && cl.json.data.summary, `${id}: clarify`);

    const plan = await post<{ data: { id: SourceId; recommended: boolean }[] }>("/api/source-plan", { family: e.family, criteria: e.criteria, jobTitle: s.title, location: s.location });
    const enabled = new Set(plan.json.data.filter((p) => p.recommended).map((p) => p.id));
    ok(enabled.size >= 3 && plan.json.data[0].id === "internal_pool", `${id}: source plan (internal first)`);
    ok(planSources(e.family, e.criteria).length === plan.json.data.length, `${id}: plan matches rules`);

    const ctx = { family: e.family, job: resolveLocation(s.location), today: DEMO_TODAY };
    let ov: Record<string, CandidateOverride> = {};
    let scored = rank(scorePool(cands, e.criteria, ctx, enabled, ov));
    const act = scored.filter((x) => x.isActive).length;
    const pas = scored.length - act;
    ok(act >= 8 && pas >= 8, `${id}: ≥8 active and ≥8 passive with recommended sources (${act}/${pas})`);

    // drawer calls for the top 3
    for (const x of scored.slice(0, 3)) {
      const ex2 = await post<{ data: { summary: string } }>("/api/explain", { scored: x, criteria: e.criteria, jobTitle: s.title });
      ok(ex2.json.data.summary.length > 20, `${id}: explain ${x.cand.name}`);
      const sc = await post<{ data: { questions: unknown[] } }>("/api/screening", { scored: x, criteria: e.criteria, jobTitle: s.title, jobCity: ctx.job?.city });
      ok(Array.isArray(sc.json.data.questions), `${id}: screening ${x.cand.name}`);
    }

    // take the best passive candidate to Ready: verify licences, confirm interest
    const hero = scored.find((x) => !x.isActive && x.fit.mandatoryFailed === 0)!;
    ok(hero, `${id}: has a passive candidate with no mandatory fails`);
    if (hero) {
      const verified: Record<number, Credential> = {};
      for (const [i, cr] of hero.cand.credentials.entries()) {
        if (!CREDENTIALS[cr.code]?.registry) continue;
        const r = await post<{ found: boolean; credential: Credential }>("/api/registry", { name: hero.cand.name, credential: cr });
        verified[i] = r.json.credential;
      }
      ov = { [hero.cand.id]: { verified, interestConfirmed: { date: DEMO_TODAY, note: "smoke" }, decision: "accepted" } };
      scored = rank(scorePool(cands, e.criteria, ctx, enabled, ov));
      const after = scored.find((x) => x.cand.id === hero.cand.id)!;
      const pk = await post<{ mode: string; data?: { summary: string }; error?: string; reasons?: string[] }>("/api/packet", { scored: after, criteria: e.criteria, job });
      if (after.readiness.level === "Ready") {
        ok(pk.status === 200 && pk.json.data?.summary && !/@|\(555\)/.test(JSON.stringify(pk.json.data)), `${id}: packet for Ready ${hero.cand.name}`);
      } else {
        ok(pk.status === 409, `${id}: packet refused for non-Ready`);
      }
      console.log(`✓ ${id.padEnd(26)} ${String(Date.now() - t0).padStart(5)}ms  ${scored.length} cands (${act}A/${pas}P) · passive ${hero.cand.name} → ${after.readiness.level}${after.readiness.todo.length ? ` [${after.readiness.todo.join("; ")}]` : ""}`);
    }
    // a Blocked candidate must be refused
    const blocked = scored.find((x) => x.readiness.level === "Blocked")!;
    const pb = await post<{ error?: string }>("/api/packet", { scored: blocked, criteria: e.criteria, job });
    ok(pb.status === 409, `${id}: packet refused for Blocked`);
  }
  console.log(failures ? `\n${failures} failure(s)` : "\nSmoke test passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
