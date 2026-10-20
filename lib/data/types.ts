// Shared domain types for the demo. Everything is synthetic.

export type FactStatus = "verified" | "self_reported" | "inferred";

export type SourceId =
  | "internal_pool"
  | "job_board"
  | "license_registry"
  | "cpa_board"
  | "bar_directory"
  | "association_directory"
  | "data_provider"
  | "oss_portfolio";

export type Family =
  | "nursing"
  | "electrical"
  | "hvac"
  | "trucking"
  | "accounting"
  | "tax"
  | "legal"
  | "estimating"
  | "software"
  | "warehouse_admin";

export type PoolType = "active" | "passive" | "historical";

export interface Provenance {
  status: FactStatus;
  source: SourceId;
  /** ISO date the fact was verified / retrieved */
  date?: string;
  /** e.g. "Confirmed on recruiter call" */
  note?: string;
}

export interface Fact<T> extends Provenance {
  value: T;
}

export interface SourceRef {
  source: SourceId;
  externalId: string;
  retrieved: string;
}

export interface WorkEntry extends Provenance {
  title: string;
  employer: string;
  /** YYYY-MM */
  start: string;
  /** YYYY-MM or null for current */
  end: string | null;
  summary: string;
}

export interface SkillFact extends Provenance {
  name: string;
}

export type CredentialState = "active" | "expired" | "inactive" | "suspended" | "lapsed";

export interface Credential extends Provenance {
  kind: "license" | "certification";
  /** canonical code, e.g. CPA, RN, BAR, CDL-A */
  code: string;
  name: string;
  issuer: string;
  state?: string;
  number?: string;
  /** ISO date */
  expiry?: string;
  claimedStatus: CredentialState;
  /** evidence line once checked against a registry */
  evidence?: string;
}

export type EduLevel = "high_school" | "certificate" | "associate" | "bachelor" | "master" | "jd" | "doctorate";

export interface Education extends Provenance {
  level: EduLevel;
  degree: string;
  field: string;
  school: string;
  year?: number;
}

export interface Application {
  jobTitle: string;
  client: string;
  date: string;
  stage: "applied" | "screened" | "interview" | "finalist" | "offer" | "withdrawn" | "rejected";
}

export interface Signal {
  type: "long_tenure" | "employer_layoffs" | "profile_updated" | "title_stagnation" | "relocation_interest";
  detail: string;
  date: string;
}

export interface Candidate {
  id: string;
  /** shared by records that are the same real person found in different sources */
  personKey?: string;
  name: string;
  family: Family;
  poolType: PoolType;
  sources: SourceRef[];
  lastActivity: string;
  currentTitle: Fact<string>;
  currentEmployer: Fact<string>;
  location: Fact<{ city: string; state: string; lat: number; lng: number }>;
  willingToRelocate?: Fact<boolean>;
  workHistory: WorkEntry[];
  skills: SkillFact[];
  credentials: Credential[];
  education: Education[];
  shiftPreference?: Fact<string>;
  languages: Fact<string>[];
  physical?: Fact<string>;
  background?: Fact<string>;
  desiredPay?: Fact<string>;
  applications: Application[];
  signals: Signal[];
  /** recruiter already spoke to them and confirmed interest */
  interestConfirmed?: { date: string; note: string };
  /** which parts of the profile are complete enough that absence means "does not have" */
  complete: { skills: boolean; credentials: boolean; education: boolean; languages: boolean };
  contact: { email: string; phone: string };
  /** ids of the source records merged into this one (duplicates of the same person) */
  mergedFrom?: string[];
}

export interface RegistryRecord {
  registry: "license_registry" | "cpa_board" | "bar_directory" | "association_directory";
  registryName: string;
  code: string;
  name: string;
  state: string;
  number: string;
  status: CredentialState | "good_standing";
  issued: string;
  expiry: string;
  discipline?: string;
}

// ---------- Requirements ----------

export type CriterionCategory =
  | "skill"
  | "license"
  | "experience"
  | "education"
  | "location"
  | "schedule"
  | "physical"
  | "tools"
  | "background"
  | "language"
  | "other";

export interface Criterion {
  id: string;
  category: CriterionCategory;
  text: string;
  /** e.g. "8" for min years, "35" for radius miles, "CPA" for licence */
  value: string;
  mandatory: boolean;
  /** exact quote from the JD supporting it ("" if added by recruiter) */
  quote: string;
  origin?: "extracted" | "recruiter" | "clarification";
}

export interface RemovedRequirement {
  quote: string;
  trait: string;
  reason: string;
}

export type QuestionKind = "toggle_mandatory" | "set_value" | "add_criterion" | "info";

export interface ClarifyQuestion {
  id: string;
  question: string;
  why: string;
  kind: QuestionKind;
  /** criterion id this question is about, or "" */
  targetId: string;
  /** category for add_criterion */
  category: CriterionCategory;
}

export interface Extraction {
  family: Family;
  criteria: Criterion[];
  removed: RemovedRequirement[];
  questions: ClarifyQuestion[];
}

export type AiMode = "ai" | "rules" | "cached";

export interface JobInput {
  sampleId?: string;
  client: string;
  title: string;
  location: string;
  employmentType: string;
  payRange: string;
  jd: string;
}

export interface SampleJob extends JobInput {
  sampleId: string;
  group: "main" | "other";
  label: string;
  extraction: Extraction;
}
