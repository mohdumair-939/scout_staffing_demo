import type { Criterion, Family, SourceId } from "@/lib/data/types";
import { licenceCodesFor } from "./criteria";
import { CREDENTIALS, FAMILY_LABEL } from "./synonyms";

export interface SourceDef {
  id: SourceId;
  name: string;
  type: "active" | "passive";
  canVerify: string[];
  gaps: string[];
  access: "mock";
}

export const SOURCES: Record<SourceId, SourceDef> = {
  internal_pool: {
    id: "internal_pool",
    name: "Internal talent pool",
    type: "active",
    canVerify: ["Past applications and interview stages", "Recruiter notes and screening results", "Licences we have verified before"],
    gaps: ["Profiles can be stale (last updated months ago)"],
    access: "mock",
  },
  job_board: {
    id: "job_board",
    name: "Job board applicants",
    type: "active",
    canVerify: ["Candidate actively applied (dated)", "Self-reported résumé and screening answers"],
    gaps: ["Everything is self-reported until checked", "Volume skews to active job seekers"],
    access: "mock",
  },
  license_registry: {
    id: "license_registry",
    name: "Mock State Licensing Registry",
    type: "passive",
    canVerify: ["Licence status (active / expired / suspended)", "Licence number, state and expiry date"],
    gaps: ["No employment history or contact details", "No signal of job-seeking intent"],
    access: "mock",
  },
  cpa_board: {
    id: "cpa_board",
    name: "Mock State Board of Accountancy",
    type: "passive",
    canVerify: ["CPA licence status and expiry", "Licence number and issuing state"],
    gaps: ["No employment history", "CPA-eligible candidates are not listed"],
    access: "mock",
  },
  bar_directory: {
    id: "bar_directory",
    name: "Mock State Bar Directory",
    type: "passive",
    canVerify: ["Bar admission and good standing", "Bar number, admission date, public discipline"],
    gaps: ["Practice area is self-described", "No compensation or intent signals"],
    access: "mock",
  },
  association_directory: {
    id: "association_directory",
    name: "Mock Professional Associations Directory",
    type: "passive",
    canVerify: ["Credential status (e.g. NALA CP, ASPE CPE)", "Member since / chapter"],
    gaps: ["Only covers members", "Employment info may be out of date"],
    access: "mock",
  },
  data_provider: {
    id: "data_provider",
    name: "Mock Professional Data Provider",
    type: "passive",
    canVerify: [],
    gaps: ["Titles, employers, location and skills are INFERRED, not verified", "No licence numbers", "May be months out of date"],
    access: "mock",
  },
  oss_portfolio: {
    id: "oss_portfolio",
    name: "Mock Open-Source / Portfolio",
    type: "passive",
    canVerify: ["Public code contributions and languages used"],
    gaps: ["Tech roles only", "Employment and location are inferred"],
    access: "mock",
  },
};

export interface PlannedSource {
  id: SourceId;
  recommended: boolean;
  reason: string;
}

const LICENSED_FAMILIES: Family[] = ["nursing", "electrical", "hvac", "trucking"];

/** Rule-based source plan for a job. Order: internal pool first, then active, then passive. */
export function planSources(family: Family, criteria: Criterion[]): PlannedSource[] {
  const codes = new Set(criteria.flatMap((c) => (c.category === "license" ? licenceCodesFor(c, family) : [])));
  const names = (registry: SourceId) =>
    [...codes].filter((c) => CREDENTIALS[c]?.registry === registry).map((c) => CREDENTIALS[c].name);
  const famLabel = FAMILY_LABEL[family].toLowerCase();
  const plan: PlannedSource[] = [
    { id: "internal_pool", recommended: true, reason: `Always searched first: known ${famLabel} candidates, past finalists and people we have already verified.` },
    { id: "job_board", recommended: true, reason: "Active applicants for this and similar postings in the last 90 days." },
  ];
  const lic = names("license_registry");
  plan.push({
    id: "license_registry",
    recommended: lic.length > 0 || LICENSED_FAMILIES.includes(family),
    reason: lic.length
      ? `Role requires ${lic.join(", ")}. The registry finds licensed people who are not job hunting and verifies status and expiry.`
      : LICENSED_FAMILIES.includes(family)
        ? "Licensed trade: registry can find and verify licence holders."
        : "No state licence in the mandatory criteria for this role.",
  });
  const cpa = names("cpa_board");
  plan.push({
    id: "cpa_board",
    recommended: cpa.length > 0,
    reason: cpa.length ? "CPA in the requirements: the Board of Accountancy lists licensed CPAs (most are not looking) and shows lapsed licences." : "No CPA requirement for this role.",
  });
  const bar = names("bar_directory");
  plan.push({
    id: "bar_directory",
    recommended: bar.length > 0,
    reason: bar.length ? "Bar admission required: the State Bar directory finds admitted attorneys and confirms good standing." : "Not a role that requires bar admission.",
  });
  const assoc = names("association_directory");
  plan.push({
    id: "association_directory",
    recommended: assoc.length > 0,
    reason: assoc.length ? `Finds members holding ${assoc.join(", ")} and confirms the credential is current.` : "No association credential in the requirements for this role.",
  });
  plan.push({
    id: "data_provider",
    recommended: true,
    reason: `Largest passive pool: ${famLabel} professionals by title, employer and location. Data is inferred, so we verify before submitting.`,
  });
  plan.push({
    id: "oss_portfolio",
    recommended: family === "software",
    reason: family === "software" ? "Engineers with public Python / backend work, most of them not on job boards." : "Tech roles only.",
  });
  return plan;
}
