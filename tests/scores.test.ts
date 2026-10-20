import { describe, expect, it } from "vitest";
import type { CriterionMatch } from "@/lib/matching/criteria";
import { fitScore, FAIL_CAP } from "@/lib/matching/fit";
import { movability } from "@/lib/matching/movability";
import { readiness } from "@/lib/matching/readiness";
import { haversineMiles, resolveLocation } from "@/lib/matching/distance";
import { cand, crit, TODAY } from "./helpers";

type R = CriterionMatch["result"];
const criteria = [crit("m1", "skill", "A"), crit("m2", "skill", "B"), crit("p1", "skill", "C", "", false)];
const res = (m1: R, m2: R, p1: R): CriterionMatch[] =>
  ([["m1", m1], ["m2", m2], ["p1", p1]] as const).map(([id, r]) => ({ criterionId: id, result: r, evidence: "", provenance: [] }));

describe("fit score", () => {
  it("is 100 when everything is met", () => expect(fitScore(criteria, res("meets", "meets", "meets")).score).toBe(100));
  it("mandatory criteria dominate preferred ones", () => {
    expect(fitScore(criteria, res("meets", "meets", "fails")).score).toBe(75);
    expect(fitScore(criteria, res("meets", "unknown", "meets")).score).toBeLessThan(80);
  });
  it("unknown earns partial credit, a fail caps the score", () => {
    const unknown = fitScore(criteria, res("meets", "unknown", "meets")).score;
    const fail = fitScore(criteria, res("meets", "fails", "meets")).score;
    expect(unknown).toBeGreaterThan(fail);
    expect(fail).toBeLessThanOrEqual(FAIL_CAP);
  });
});

describe("movability rules", () => {
  it("confirmed interest beats everything", () => {
    expect(movability(cand({ interestConfirmed: { date: TODAY, note: "" } }), TODAY).level).toBe("Confirmed");
  });
  it("recent application (< 90 days) is High; older is Low", () => {
    const app = (date: string) => cand({ applications: [{ jobTitle: "X", client: "Y", date, stage: "applied" }] });
    expect(movability(app("2026-09-01"), TODAY).level).toBe("High");
    expect(movability(app("2026-05-01"), TODAY).level).toBe("Low");
  });
  it("historical late-stage candidate is Medium and outranks passive with signals", () => {
    const hist = movability(cand({ poolType: "historical", applications: [{ jobTitle: "X", client: "Y", date: "2025-04-01", stage: "finalist" }] }), TODAY);
    const passive = movability(cand({ poolType: "passive", signals: [{ type: "long_tenure", detail: "6 years", date: TODAY }] }), TODAY);
    const none = movability(cand({ poolType: "passive" }), TODAY);
    expect(hist.level).toBe("Medium");
    expect(passive.level).toBe("Medium");
    expect(none.level).toBe("Low");
    expect(hist.rank).toBeGreaterThan(passive.rank);
    expect(passive.rank).toBeGreaterThan(none.rank);
  });
});

describe("readiness rules", () => {
  const ok: CriterionMatch = { criterionId: "m1", result: "meets", evidence: "", provenance: [] };
  const two = [crit("m1", "skill", "A"), crit("m2", "license", "CPA", "CPA")];
  const confirmed = cand({ interestConfirmed: { date: TODAY, note: "" } });
  it("Blocked when any mandatory criterion fails", () => {
    expect(readiness(cand(), two, [ok, { ...ok, criterionId: "m2", result: "fails" }]).level).toBe("Blocked");
  });
  it("Needs verification for unknowns, unverified licences or unconfirmed interest", () => {
    expect(readiness(confirmed, two, [ok, { ...ok, criterionId: "m2", result: "unknown" }]).level).toBe("Needs verification");
    expect(readiness(confirmed, two, [ok, { ...ok, criterionId: "m2", needsVerification: { code: "CPA", credentialIndex: 0 } }]).level).toBe("Needs verification");
    expect(readiness(cand(), two, [ok, { ...ok, criterionId: "m2" }]).level).toBe("Needs verification");
  });
  it("Ready when all mandatory met and verified, and interest confirmed", () => {
    expect(readiness(confirmed, two, [ok, { ...ok, criterionId: "m2" }]).level).toBe("Ready");
  });
});

describe("distance", () => {
  it("haversine: Dallas to Houston is about 225 miles", () => {
    const d = haversineMiles({ lat: 32.7767, lng: -96.797 }, { lat: 29.7604, lng: -95.3698 });
    expect(d).toBeGreaterThan(220);
    expect(d).toBeLessThan(230);
  });
  it("resolves city/state strings and ZIP codes", () => {
    expect(resolveLocation("Charlotte, NC")?.city).toBe("Charlotte");
    expect(resolveLocation("77030")?.city).toBe("Houston");
    expect(resolveLocation("Fort Worth, Texas")?.city).toBe("Fort Worth");
  });
});
