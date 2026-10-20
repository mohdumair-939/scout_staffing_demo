// Sanity check: every sample must have ≥8 active and ≥8 passive candidates with a mix of
// strong / partial / failing matches, and every cached quote must appear verbatim in its JD.
//   npm run check-data [-- --verbose]
import { readFileSync } from "node:fs";
import type { Candidate, SampleJob, SourceId } from "../lib/data/types";
import { DEMO_TODAY } from "../lib/data/constants";
import { resolveLocation } from "../lib/matching/distance";
import { rank, scorePool } from "../lib/matching/pipeline";

const verbose = process.argv.includes("--verbose");
const cands: Candidate[] = JSON.parse(readFileSync("data/candidates.json", "utf8"));
const ids: string[] = JSON.parse(readFileSync("data/samples/index.json", "utf8"));
const ALL: SourceId[] = ["internal_pool", "job_board", "license_registry", "cpa_board", "bar_directory", "association_directory", "data_provider", "oss_portfolio"];
let problems = 0;

for (const id of ids) {
  const s: SampleJob = JSON.parse(readFileSync(`data/samples/${id}.json`, "utf8"));
  for (const c of s.extraction.criteria) {
    if (c.quote && !s.jd.includes(c.quote)) {
      console.log(`  ✗ ${id} ${c.id}: quote not found in JD: "${c.quote}"`);
      problems++;
    }
  }
  for (const r of s.extraction.removed) if (!s.jd.includes(r.quote)) (console.log(`  ✗ ${id}: removed quote missing`), problems++);
  const city = resolveLocation(s.location);
  if (!city) (console.log(`  ✗ ${id}: location not resolved`), problems++);
  const ctx = { family: s.extraction.family, job: city, today: DEMO_TODAY };
  const scored = rank(scorePool(cands, s.extraction.criteria, ctx, new Set(ALL)));
  const active = scored.filter((x) => x.isActive);
  const passive = scored.filter((x) => !x.isActive);
  const strong = scored.filter((x) => x.fit.mandatoryMet === x.fit.mandatoryTotal).length;
  const partial = scored.filter((x) => x.fit.mandatoryFailed === 0 && x.fit.mandatoryUnknown > 0).length;
  const failing = scored.filter((x) => x.fit.mandatoryFailed > 0).length;
  const ready = scored.filter((x) => x.readiness.level === "Ready").length;
  const merged = scored.filter((x) => (x.cand.mergedFrom?.length ?? 0) > 1).length;
  const passAll = scored.filter((x) => x.fit.mandatoryMet === x.fit.mandatoryTotal).length;
  const ok = active.length >= 8 && passive.length >= 8 && strong >= 3 && partial >= 2 && failing >= 3;
  if (!ok) problems++;
  console.log(
    `${ok ? "✓" : "✗"} ${id.padEnd(26)} total ${String(scored.length).padStart(3)} | active ${String(active.length).padStart(2)} passive ${String(passive.length).padStart(2)} | strong ${strong} partial ${partial} failing ${failing} | passAll ${passAll} ready ${ready} merged ${merged}`,
  );
  if (verbose) {
    for (const x of scored.slice(0, process.argv.includes("--all") ? 999 : 8)) {
      console.log(
        `     ${String(x.fit.score).padStart(3)} ${x.isActive ? "A" : "P"} ${x.readiness.level.padEnd(18)} ${x.movability.level.padEnd(9)} ${x.cand.name.padEnd(22)} ${x.cand.currentTitle.value} · ${x.distance}mi`,
      );
      if (process.argv.includes("--why")) for (const m of x.matches) console.log(`          ${m.result.padEnd(7)} ${m.criterionId} ${m.evidence}`);
    }
  }
}
console.log(problems ? `\n${problems} problem(s)` : "\nAll samples OK");
process.exit(problems ? 1 : 0);
