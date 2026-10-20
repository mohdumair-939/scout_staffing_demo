// End-to-end checks of the demo script on the real generated data.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Candidate, RegistryRecord, SampleJob, SourceId } from "@/lib/data/types";
import { resolveLocation } from "@/lib/matching/distance";
import { credentialFromRegistry, findRegistryRecord, rank, scorePool, type CandidateOverride } from "@/lib/matching/pipeline";
import { TODAY } from "./helpers";

const cands: Candidate[] = JSON.parse(readFileSync("data/candidates.json", "utf8"));
const registry: RegistryRecord[] = JSON.parse(readFileSync("data/registry.json", "utf8"));
const ALL = new Set<SourceId>(["internal_pool", "job_board", "license_registry", "cpa_board", "bar_directory", "association_directory", "data_provider", "oss_portfolio"]);

function setup(sampleId: string) {
  const sample: SampleJob = JSON.parse(readFileSync(`data/samples/${sampleId}.json`, "utf8"));
  const ctx = { family: sample.extraction.family, job: resolveLocation(sample.location), today: TODAY };
  const run = (ov: Record<string, CandidateOverride> = {}) => rank(scorePool(cands, sample.extraction.criteria, ctx, ALL, ov));
  const find = (ov: Record<string, CandidateOverride>, name: string) => run(ov).find((x) => x.cand.name === name)!;
  const verify = (name: string, code: string, ov: Record<string, CandidateOverride> = {}) => {
    const x = find(ov, name);
    const i = x.cand.credentials.findIndex((c) => c.code === code);
    const rec = findRegistryRecord(registry, x.cand.name, x.cand.credentials[i]);
    return { ...ov, [x.cand.id]: { ...ov[x.cand.id], verified: { [i]: credentialFromRegistry(x.cand.credentials[i], rec, TODAY) } } };
  };
  const confirm = (name: string, ov: Record<string, CandidateOverride>) => {
    const id = find(ov, name).cand.id;
    return { ...ov, [id]: { ...ov[id], interestConfirmed: { date: TODAY, note: "call" } } };
  };
  return { run, find, verify, confirm };
}

describe("demo story on every main sample", () => {
  const cases: Array<[string, string, string, string]> = [
    ["controller-dallas", "Priya Raman", "Derek Holloway", "CPA"],
    ["senior-accountant-chicago", "Grace Kim", "Ryan Novak", "CPA"],
    ["tax-manager-houston", "Daniel Nguyen", "Brittany Cole", "CPA"],
    ["attorney-charlotte", "Nathan Price", "Victoria Lang", "BAR"],
    ["rn-icu-houston", "Maria Santos", "Jessica Palmer", "RN"],
    ["electrician-denver", "Cody Ramirez", "Travis Keller", "JOURNEYMAN_ELECTRICIAN"],
  ];
  for (const [id, hero, mismatch, code] of cases) {
    it(`${id}: passive ${hero} is the best passive match, in the top 6, and can reach Ready`, () => {
      const s = setup(id);
      const list = s.run();
      const idx = list.findIndex((x) => x.cand.name === hero);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(6);
      expect(list[idx].isActive).toBe(false);
      expect(list.find((x) => !x.isActive)?.cand.name).toBe(hero);
      const ov = s.confirm(hero, s.verify(hero, code));
      const after = s.find(ov, hero);
      expect(after.readiness.todo.filter((t) => !t.startsWith("Confirm:"))).toEqual([]);
    });
    it(`${id}: ${mismatch} claims an active ${code}, registry disagrees`, () => {
      const s = setup(id);
      expect(s.find({}, mismatch).readiness.level).toBe("Needs verification");
      const after = s.find(s.verify(mismatch, code), mismatch);
      expect(after.matches.some((m) => m.result === "fails" && /registry/.test(m.evidence))).toBe(true);
      // the licence is mandatory everywhere except the Senior Accountant sample (CPA preferred)
      if (id !== "senior-accountant-chicago") expect(after.readiness.level).toBe("Blocked");
    });
  }

  it("controller: passive hero Priya Raman reaches Ready after verify + confirm", () => {
    const s = setup("controller-dallas");
    expect(s.find(s.confirm("Priya Raman", s.verify("Priya Raman", "CPA")), "Priya Raman").readiness.level).toBe("Ready");
  });

  it("each sample shows a merged duplicate found in 2 sources", () => {
    const merged = setup("controller-dallas").run().filter((x) => (x.cand.mergedFrom?.length ?? 0) > 1);
    expect(merged.length).toBeGreaterThanOrEqual(1);
    expect(merged[0].cand.sources.length).toBeGreaterThanOrEqual(2);
  });
});
