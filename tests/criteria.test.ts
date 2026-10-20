import { describe, expect, it } from "vitest";
import { evaluateCriterion } from "@/lib/matching/criteria";
import { cand, crit, DALLAS, TODAY } from "./helpers";

const ctx = { family: "accounting" as const, job: DALLAS, today: TODAY };
const cpa = crit("c1", "license", "Active CPA license (Texas, or any U.S. state with practice mobility)", "CPA");

describe("mandatory check: meets / fails / unknown", () => {
  it("meets with an active licence and flags that it still needs registry verification", () => {
    const c = cand({ credentials: [{ kind: "license", code: "CPA", name: "CPA", issuer: "TSBPA", state: "TX", number: "123456", expiry: "2027-06-30", claimedStatus: "active", status: "self_reported", source: "job_board" }] });
    const m = evaluateCriterion(cpa, c, ctx);
    expect(m.result).toBe("meets");
    expect(m.needsVerification?.code).toBe("CPA");
  });

  it("fails when the licence expiry date has passed, even if the candidate says active", () => {
    const c = cand({ credentials: [{ kind: "license", code: "CPA", name: "CPA", issuer: "TSBPA", state: "TX", number: "1", expiry: "2026-01-31", claimedStatus: "active", status: "self_reported", source: "job_board" }] });
    expect(evaluateCriterion(cpa, c, ctx).result).toBe("fails");
  });

  it("missing data is UNKNOWN, not a fail, when the profile is incomplete", () => {
    const c = cand({ complete: { skills: false, credentials: false, education: false, languages: false } });
    expect(evaluateCriterion(cpa, c, ctx).result).toBe("unknown");
    expect(evaluateCriterion(crit("e", "education", "Bachelor's degree in Accounting"), c, ctx).result).toBe("unknown");
    expect(evaluateCriterion(crit("s", "skill", "Month-end close"), c, ctx).result).toBe("unknown");
  });

  it("fails a state-specific bar admission held in another state", () => {
    const c = cand({ family: "legal", credentials: [{ kind: "license", code: "BAR", name: "South Carolina Bar", issuer: "SC Bar", state: "SC", number: "1", expiry: "2027-01-01", claimedStatus: "active", status: "self_reported", source: "job_board" }] });
    const m = evaluateCriterion(crit("b", "license", "Admitted to the North Carolina State Bar", "BAR"), c, { ...ctx, family: "legal" });
    expect(m.result).toBe("fails");
  });

  it("accepts a multistate RN licence when the JD allows compact licences", () => {
    const c = cand({ family: "nursing", credentials: [{ kind: "license", code: "RN", name: "Registered Nurse (RN) – multistate", issuer: "AZ BON", state: "AZ", number: "1", expiry: "2027-01-01", claimedStatus: "active", status: "self_reported", source: "job_board" }] });
    const m = evaluateCriterion(crit("r", "license", "Active Texas or multistate (compact) RN license", "RN"), c, { ...ctx, family: "nursing" });
    expect(m.result).toBe("meets");
  });

  it("uses synonyms: 'monthly close' satisfies 'month-end close'; 'or' means any tool", () => {
    const c = cand({ skills: [{ name: "Monthly close process", status: "self_reported", source: "job_board" }, { name: "SAP", status: "self_reported", source: "job_board" }] });
    expect(evaluateCriterion(crit("s", "skill", "Month-end close"), c, ctx).result).toBe("meets");
    expect(evaluateCriterion(crit("t", "tools", "ERP: NetSuite or SAP"), c, ctx).result).toBe("meets");
    expect(evaluateCriterion(crit("u", "tools", "NetSuite and Power BI"), c, ctx).result).toBe("fails");
  });

  it("computes relevant years from work history, merging overlapping roles", () => {
    const c = cand({
      workHistory: [
        { title: "Controller", employer: "A", start: "2021-10", end: null, summary: "", status: "self_reported", source: "job_board" },
        { title: "Senior Accountant", employer: "B", start: "2017-10", end: "2021-12", summary: "", status: "self_reported", source: "job_board" },
        { title: "Barista", employer: "C", start: "2015-01", end: "2017-10", summary: "", status: "self_reported", source: "job_board" },
      ],
    });
    expect(evaluateCriterion(crit("x", "experience", "8+ years of accounting experience", "8"), c, ctx).result).toBe("meets");
    const mgmt = evaluateCriterion(crit("y", "experience", "6+ years managing accounting teams", "6"), c, ctx);
    expect(mgmt.result).toBe("fails");
    expect(mgmt.evidence).toMatch(/^5 yrs/);
  });
});
