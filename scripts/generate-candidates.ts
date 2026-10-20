/**
 * Seeded synthetic data generator.
 *   npm run generate
 * Writes data/candidates.json, data/registry.json and data/samples/*.json.
 * Every person, employer, licence number and registry record is fictional.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Application,
  Candidate,
  Credential,
  CredentialState,
  Education,
  FactStatus,
  PoolType,
  RegistryRecord,
  Signal,
  SourceId,
  SourceRef,
  WorkEntry,
} from "../lib/data/types";
import { CITIES, findCity, haversineMiles, type City } from "../lib/matching/distance";
import { DEMO_TODAY } from "../lib/data/constants";
import { SAMPLES } from "./sample-defs";
import { SPECS, type CredTemplate, type GenSpec } from "./gen-specs";

// ---------------------------------------------------------------- seeded RNG

let seed = 20261020;
function rand(): number {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const chance = (p: number) => rand() < p;
const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join("");

// ---------------------------------------------------------------- dates

const TODAY = DEMO_TODAY;
function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const ym = (iso: string) => iso.slice(0, 7);

// ---------------------------------------------------------------- names

const FIRST = [
  "James", "Aaliyah", "Wei", "Fatima", "Diego", "Hannah", "Kwame", "Mei", "Raj", "Sofia", "Tyrone", "Ingrid", "Mateo", "Leila", "Connor",
  "Nia", "Hiroshi", "Camila", "Darnell", "Anya", "Yusuf", "Chloe", "Arjun", "Gabriela", "Malik", "Sarah", "Thanh", "Isabella", "Olumide",
  "Emma", "Jamal", "Rosa", "Noah", "Ayesha", "Liam", "Keiko", "Andrés", "Imani", "Patrick", "Zara", "Ethan", "Lucia", "Kofi", "Natalie",
  "Sanjay", "Brianna", "Mohammed", "Claire", "Tomás", "Ebony", "Adrian", "Yara", "Marcus", "Jin", "Paola", "Dmitri", "Keisha", "Henry",
  "Alejandra", "Samir", "Grace", "Rahul", "Lauren", "Esteban", "Amara", "Ivan", "Destiny", "Kenji", "Monica", "Abdul", "Tessa", "Julian",
  "Priyanka", "Xavier", "Naomi", "Hamza", "Rebecca", "Felipe", "Simone", "Victor", "Dana", "Oluwaseun", "Megan", "Ricardo", "Ji-woo", "Caleb",
];
const LAST = [
  "Johnson", "Okonkwo", "Chen", "Hassan", "Hernandez", "Schmidt", "Mensah", "Wang", "Gupta", "Rossi", "Jackson", "Larsen", "García", "Haddad",
  "O'Brien", "Williams", "Tanaka", "Rodríguez", "Robinson", "Ivanova", "Demir", "Martin", "Reddy", "Silva", "Abdullah", "Murphy", "Nguyen",
  "Lopez", "Adeyemi", "Brown", "Davis", "Flores", "Patel", "Yamamoto", "Morales", "Owusu", "Sullivan", "Khan", "Fischer", "Ramírez", "Jones",
  "Choi", "Castillo", "Mitchell", "Banerjee", "Torres", "Walker", "Ali", "Kowalski", "Reyes", "Thompson", "Park", "Diaz", "Coleman", "Singh",
  "Vargas", "Edwards", "Ahmed", "Moreno", "Campbell", "Kim", "Ortiz", "Bailey", "Hussain", "Gonzalez", "Price", "Le", "Romero", "Ward", "Das",
];

const KEY_NAMES: Record<string, Record<string, string>> = {
  "controller-dallas": { hero: "Priya Raman", mismatch: "Derek Holloway", ready: "Marcus Bell", dup: "Elena Vasquez", unknownTool: "Tom Okafor" },
  "senior-accountant-chicago": { hero: "Grace Kim", mismatch: "Ryan Novak", ready: "Aisha Thompson", dup: "Luis Ortega", unknownTool: "Hannah Weiss" },
  "tax-manager-houston": { hero: "Daniel Nguyen", mismatch: "Brittany Cole", ready: "Omar Haddad", dup: "Rachel Stein", unknownTool: "Kevin Tran" },
  "paralegal-atlanta": { hero: "Jasmine Carter", mismatch: "Megan Russo", ready: "Tiana Brooks", dup: "Carlos Mendez", unknownTool: "Olivia Grant" },
  "attorney-charlotte": { hero: "Nathan Price", mismatch: "Victoria Lang", ready: "Samuel Adeyemi", dup: "Laura Pennington", unknownTool: "Jordan Ellis" },
  "estimator-phoenix": { hero: "Miguel Alvarez", mismatch: "Scott Brennan", ready: "Kayla Morgan", dup: "Ahmed Siddiqui", unknownTool: "Rebecca Lowe" },
  "rn-icu-houston": { hero: "Maria Santos", mismatch: "Jessica Palmer", ready: "Andre Washington", dup: "Linh Pham", unknownTool: "Emily Foster" },
  "electrician-denver": { hero: "Cody Ramirez", mismatch: "Travis Keller", ready: "DeShawn Harris", dup: "Erik Johansson", unknownTool: "Wyatt Collins" },
  "hvac-austin": { hero: "Jose Guerrero", mismatch: "Brandon Lee", ready: "Tyler Reed", dup: "Hector Morales", unknownTool: "Chris Dunn" },
  "cdl-san-antonio": { hero: "Ray Delgado", mismatch: "Curtis Boyd", ready: "Lamar Jenkins", dup: "Frank Medina", unknownTool: "Dale Whitaker" },
  "backend-austin": { hero: "Anika Patel", mismatch: "Ben Carver", ready: "Wei Zhang", dup: "Sofia Rossi", unknownTool: "Lars Lindqvist" },
};
const usedNames = new Set(Object.values(KEY_NAMES).flatMap((m) => Object.values(m)));
function randomName(): string {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
}

// ---------------------------------------------------------------- archetypes

type CredMode = "verified" | "self" | "inferred" | "mismatch" | "expired" | "none" | "wrong_state" | "unknown";
type Tier = "lead" | "mid" | "junior" | "adjacent";

interface Arche {
  key: string;
  nameKey?: string;
  pool: PoolType;
  sources: Array<SourceId | "PASSIVE_REGISTRY">;
  tier: Tier;
  yearsDelta: number;
  absoluteYears?: number;
  cred: CredMode;
  extras: "all" | "missing" | "unknown";
  skills: "all" | "missing_one" | "unknown_one" | "few";
  nice: number;
  edu: "meets" | "nice" | "lower" | "wrong_field" | "unknown";
  dist: "near" | "mid" | "edge" | "far" | "far_relocate";
  schedule: "ok" | "conflict" | "unknown" | "inferred_ok";
  background: "ok" | "verified" | "bad" | "unknown";
  physical?: boolean;
  language?: boolean;
  confirmed?: boolean;
  appDays?: number;
  appStage?: Application["stage"];
  hist?: { stage: Application["stage"]; date: string };
  signals: Signal["type"][];
  dup?: "base" | "newer";
  /** apply the spec's natural "conflict" (schedule / background / licence state / degree field) */
  conflict?: boolean;
}

const ACTIVE_ARCHES: Arche[] = [
  { key: "ready_internal", nameKey: "ready", pool: "active", sources: ["internal_pool"], tier: "lead", yearsDelta: 4, cred: "verified", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "near", schedule: "ok", background: "verified", physical: true, language: true, confirmed: true, appDays: 12, appStage: "interview", signals: [] },
  { key: "strong_applicant", pool: "active", sources: ["job_board"], tier: "lead", yearsDelta: 2, cred: "self", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "ok", background: "ok", physical: true, appDays: 6, appStage: "applied", signals: [] },
  { key: "mismatch_applicant", nameKey: "mismatch", pool: "active", sources: ["job_board", "internal_pool"], tier: "lead", yearsDelta: 5, cred: "mismatch", extras: "all", skills: "all", nice: 3, edu: "nice", dist: "near", schedule: "ok", background: "ok", language: true, appDays: 9, appStage: "screened", signals: [] },
  { key: "expired_applicant", pool: "active", sources: ["job_board"], tier: "mid", yearsDelta: 1, cred: "expired", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "mid", schedule: "ok", background: "ok", appDays: 20, appStage: "applied", signals: [] },
  { key: "short_years", pool: "active", sources: ["job_board"], tier: "mid", yearsDelta: -2, cred: "self", extras: "all", skills: "all", nice: 0, edu: "meets", dist: "near", schedule: "ok", background: "unknown", appDays: 15, appStage: "applied", signals: [] },
  { key: "unknowns_applicant", pool: "active", sources: ["job_board"], tier: "mid", yearsDelta: 1, cred: "self", extras: "unknown", skills: "unknown_one", nice: 1, edu: "unknown", dist: "mid", schedule: "unknown", background: "unknown", appDays: 3, appStage: "applied", signals: [] },
  { key: "historical_finalist", pool: "historical", sources: ["internal_pool"], tier: "lead", yearsDelta: 3, cred: "verified", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "mid", schedule: "ok", background: "ok", hist: { stage: "finalist", date: "2025-04-17" }, signals: [] },
  { key: "historical_far", pool: "historical", sources: ["internal_pool"], tier: "mid", yearsDelta: 2, cred: "self", extras: "all", skills: "missing_one", nice: 1, edu: "meets", dist: "far", schedule: "ok", background: "unknown", hist: { stage: "interview", date: "2024-09-03" }, signals: [] },
  { key: "relocate_applicant", pool: "active", sources: ["job_board"], tier: "lead", yearsDelta: 3, cred: "self", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "far_relocate", schedule: "ok", background: "ok", appDays: 30, appStage: "applied", signals: [] },
  { key: "junior_applicant", pool: "active", sources: ["job_board"], tier: "junior", yearsDelta: 0, absoluteYears: 1.2, cred: "none", extras: "missing", skills: "missing_one", nice: 0, edu: "lower", dist: "near", schedule: "ok", background: "ok", appDays: 4, appStage: "applied", signals: [] },
  { key: "conflict_internal", pool: "active", sources: ["internal_pool"], tier: "mid", yearsDelta: 1, cred: "self", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "ok", background: "ok", appDays: 40, appStage: "screened", signals: [], conflict: true },
  { key: "dup_base", nameKey: "dup", pool: "historical", sources: ["internal_pool"], tier: "mid", yearsDelta: 2, cred: "self", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "ok", background: "unknown", hist: { stage: "interview", date: "2024-03-11" }, signals: [], dup: "base" },
];

const PASSIVE_ARCHES: Arche[] = [
  { key: "passive_hero", nameKey: "hero", pool: "passive", sources: ["data_provider"], tier: "lead", yearsDelta: 4, cred: "inferred", extras: "all", skills: "all", nice: 9, edu: "nice", dist: "near", schedule: "inferred_ok", background: "unknown", language: true, signals: ["long_tenure", "employer_layoffs", "profile_updated", "title_stagnation"] },
  { key: "passive_registry", pool: "passive", sources: ["PASSIVE_REGISTRY", "data_provider"], tier: "lead", yearsDelta: 2, cred: "verified", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["long_tenure"] },
  { key: "passive_nosignal", pool: "passive", sources: ["data_provider"], tier: "lead", yearsDelta: 6, cred: "inferred", extras: "all", skills: "all", nice: 2, edu: "nice", dist: "mid", schedule: "inferred_ok", background: "unknown", signals: [] },
  { key: "passive_mismatch", pool: "passive", sources: ["data_provider"], tier: "lead", yearsDelta: 3, cred: "mismatch", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["profile_updated"] },
  { key: "passive_unknown_tool", nameKey: "unknownTool", pool: "passive", sources: ["data_provider"], tier: "mid", yearsDelta: 1, cred: "inferred", extras: "all", skills: "unknown_one", nice: 1, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["title_stagnation"] },
  { key: "passive_thin", pool: "passive", sources: ["data_provider"], tier: "mid", yearsDelta: 0.5, cred: "unknown", extras: "unknown", skills: "few", nice: 0, edu: "unknown", dist: "mid", schedule: "unknown", background: "unknown", signals: ["employer_layoffs"] },
  { key: "passive_short", pool: "passive", sources: ["data_provider"], tier: "mid", yearsDelta: -3, cred: "inferred", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["profile_updated"] },
  { key: "passive_far", pool: "passive", sources: ["data_provider"], tier: "lead", yearsDelta: 2, cred: "inferred", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "far", schedule: "inferred_ok", background: "unknown", signals: ["long_tenure"] },
  { key: "passive_adjacent", pool: "passive", sources: ["data_provider"], tier: "adjacent", yearsDelta: 1, cred: "unknown", extras: "unknown", skills: "unknown_one", nice: 1, edu: "meets", dist: "near", schedule: "unknown", background: "unknown", signals: ["relocation_interest"] },
  { key: "passive_signals", pool: "passive", sources: ["PASSIVE_REGISTRY", "data_provider"], tier: "mid", yearsDelta: 1, cred: "verified", extras: "all", skills: "all", nice: 1, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["profile_updated", "relocation_interest", "title_stagnation"] },
  { key: "dup_newer", nameKey: "dup", pool: "passive", sources: ["data_provider"], tier: "lead", yearsDelta: 3, cred: "inferred", extras: "all", skills: "all", nice: 2, edu: "meets", dist: "near", schedule: "inferred_ok", background: "unknown", signals: ["profile_updated"], dup: "newer" },
];

// ---------------------------------------------------------------- helpers

const ALT_SKILL: Record<string, string> = { NetSuite: "SAP", FastAPI: "Django", Bluebeam: "On-Screen Takeoff" };
const EARLY_JOBS = ["Customer Service Representative", "Retail Sales Associate", "Office Assistant", "Restaurant Server", "Warehouse Associate"];
const EARLY_EMPLOYERS = ["Mesa Grocers", "Brightline Retail", "Corner Market Co.", "Starline Diner", "QuickParcel Depot"];

const MISMATCH_STATUS: Record<string, CredentialState> = {
  CPA: "lapsed",
  BAR: "inactive",
  RN: "inactive",
  "CDL-A": "suspended",
  JOURNEYMAN_ELECTRICIAN: "expired",
  NALA_CP: "expired",
  CPE_ESTIMATOR: "expired",
  ACR_TECH: "expired",
};
const MISMATCH_NOTE: Record<string, string> = {
  CPA: "CPE reporting not completed; license lapsed",
  BAR: "Inactive status: CLE requirements not met",
  RN: "Renewal not completed",
  "CDL-A": "Downgraded: medical certificate not on file",
};

const registry: RegistryRecord[] = [];
const candidates: Candidate[] = [];
let idCounter = 1;

function cityBands(job: City, radius: number) {
  const withD = CITIES.filter((c) => c !== job).map((c) => ({ c, d: haversineMiles(c, job) }));
  const near = [job, ...withD.filter((x) => x.d <= radius * 0.7).map((x) => x.c)];
  const mid = withD.filter((x) => x.d > radius * 0.35 && x.d <= radius * 0.95).map((x) => x.c);
  const edge = withD.filter((x) => x.d > radius && x.d <= radius * 2.5).map((x) => x.c);
  const far = withD.filter((x) => x.d > radius * 1.5 && x.d <= 140).map((x) => x.c);
  const veryFar = withD.filter((x) => x.d > 400).map((x) => x.c);
  return { near, mid: mid.length ? mid : near, edge: edge.length ? edge : far, far: far.length ? far : edge, veryFar };
}

function jitter(c: City, amount: number) {
  return { city: c.city, state: c.state, lat: +(c.lat + (rand() - 0.5) * amount).toFixed(4), lng: +(c.lng + (rand() - 0.5) * amount).toFixed(4) };
}

function sourceRef(source: SourceId, retrieved: string, number?: string): SourceRef {
  const ids: Record<SourceId, () => string> = {
    internal_pool: () => `INT-${digits(5)}`,
    job_board: () => `JB-${digits(7)}`,
    license_registry: () => number ?? `REG-${digits(6)}`,
    cpa_board: () => number ?? `CPA-${digits(6)}`,
    bar_directory: () => number ?? `BAR-${digits(5)}`,
    association_directory: () => number ?? `ASSOC-${digits(5)}`,
    data_provider: () => `PDP-${Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0")}`,
    oss_portfolio: () => `gh:${digits(3)}${pick(["dev", "codes", "eng", "hq"])}`,
  };
  return { source, externalId: ids[source](), retrieved };
}

function makeCred(t: CredTemplate, mode: CredMode, status: FactStatus, source: SourceId, name: string, wantRegistry: boolean): Credential | undefined {
  if (mode === "none" || mode === "unknown") return undefined;
  const number = t.numberPrefix + digits(t.digits);
  const activeExpiry = t.validYears >= 20 ? "2045-12-31" : addMonths(TODAY, int(4, Math.min(36, t.validYears * 12)));
  const pastExpiry = addMonths(TODAY, -int(2, 14));
  const state = mode === "wrong_state" && t.wrongState ? t.wrongState : t.state;
  const issuer = mode === "wrong_state" && t.wrongIssuer ? t.wrongIssuer : t.issuer;
  const credName = mode === "wrong_state" && t.wrongIssuer ? t.wrongIssuer : t.code === "RN" && state !== "TX" ? `${t.name} – multistate` : t.name;
  const def: Credential = {
    kind: t.registry || ["RN", "CPA", "BAR", "CDL-A", "EA"].includes(t.code) ? "license" : "certification",
    code: t.code,
    name: credName,
    issuer,
    state,
    number,
    expiry: activeExpiry,
    claimedStatus: "active",
    status,
    source,
  };
  let registryStatus: RegistryRecord["status"] = t.code === "BAR" ? "good_standing" : "active";
  let registryExpiry = activeExpiry;
  if (mode === "verified") {
    def.status = "verified";
    def.source = t.registry ?? source;
    def.date = addDays(TODAY, -int(20, 70));
    def.evidence = t.registryName ? `${t.registryName} · #${number} · ${t.code === "BAR" ? "Active, in good standing" : "Active"} · expires ${activeExpiry} · checked ${def.date}` : undefined;
  } else if (mode === "inferred") {
    delete def.number;
    delete def.expiry;
  } else if (mode === "expired") {
    def.expiry = pastExpiry;
    registryStatus = "expired";
    registryExpiry = pastExpiry;
  } else if (mode === "mismatch") {
    registryStatus = MISMATCH_STATUS[t.code] ?? "expired";
    registryExpiry = pastExpiry;
    if (status === "inferred") {
      delete def.number;
      delete def.expiry;
    }
  }
  if (t.registry && wantRegistry) {
    registry.push({
      registry: t.registry,
      registryName: t.registryName ?? t.issuer,
      code: t.code,
      name,
      state: state ?? "",
      number,
      status: registryStatus,
      issued: addMonths(TODAY, -int(30, 160)),
      expiry: registryExpiry,
      discipline: mode === "mismatch" ? MISMATCH_NOTE[t.code] : undefined,
    });
  }
  return def;
}

function buildHistory(spec: GenSpec, tier: Tier, years: number, anchor: string, status: FactStatus, source: SourceId, employer: string, others: string[], curOverride?: number): WorkEntry[] {
  const entries: WorkEntry[] = [];
  const total = Math.max(6, Math.round(years * 12));
  let cur = tier === "junior" ? total : Math.min(total, Math.max(Math.round(total * 0.45), spec.currentMinYears * 12 + 2));
  if (tier === "adjacent") cur = Math.max(18, Math.round(total * 0.6));
  if (curOverride) cur = Math.min(total, curOverride);
  let end = ym(anchor);
  const startOf = (months: number) => ym(addMonths(end + "-01", -months));
  const s0 = startOf(cur);
  entries.push({ title: pick(spec.titles[tier]), employer, start: s0, end: null, summary: pick(spec.summaries[tier]), status, source });
  end = s0;
  let remaining = tier === "adjacent" ? Math.max(0, total - cur) : total - cur;
  let i = 0;
  while (remaining > 0) {
    const m = remaining > 60 ? Math.round(remaining * 0.55) : remaining;
    const s = startOf(m);
    const prevTier = tier === "junior" ? "junior" : "prev";
    entries.push({ title: pick(spec.titles[prevTier]), employer: others[i % others.length], start: s, end, summary: pick(spec.summaries[prevTier]), status, source });
    end = s;
    remaining -= m;
    i++;
  }
  if (chance(0.4)) {
    const m = int(10, 26);
    entries.push({ title: pick(EARLY_JOBS), employer: pick(EARLY_EMPLOYERS), start: startOf(m), end, summary: "Early-career role outside the field.", status, source });
  }
  return entries;
}

function payFor(spec: GenSpec): string {
  const ranges: Record<string, [number, number, string]> = {
    accounting: [80, 180, "K"],
    tax: [110, 175, "K"],
    legal: [60, 230, "K"],
    estimating: [85, 130, "K"],
    software: [140, 210, "K"],
    nursing: [42, 65, "/hr"],
    electrical: [30, 46, "/hr"],
    hvac: [24, 40, "/hr"],
    trucking: [1200, 1800, "/wk"],
    warehouse_admin: [17, 26, "/hr"],
  };
  const [lo, hi, unit] = ranges[spec.family];
  const v = int(lo, hi);
  return unit === "K" ? `$${v}K+` : unit === "/wk" ? `$${v.toLocaleString("en-US")}/week` : `$${v}${unit}`;
}

function signalsFor(types: Signal["type"][], employer: string, curStart: string): Signal[] {
  const tenure = Math.round(((Date.parse(TODAY) - Date.parse(curStart + "-01")) / (365.25 * 86_400_000)) * 10) / 10;
  return types.map((type) => {
    switch (type) {
      case "long_tenure":
        return { type, detail: `${tenure} years at ${employer}`, date: TODAY };
      case "employer_layoffs":
        return { type, detail: `${employer} announced layoffs (Sep 2026)`, date: "2026-09-18" };
      case "profile_updated": {
        const days = int(5, 30);
        return { type, detail: `Profile updated ${days} days ago`, date: addDays(TODAY, -days) };
      }
      case "title_stagnation":
        return { type, detail: `Same title for ${Math.max(3, Math.floor(tenure))}+ years`, date: TODAY };
      case "relocation_interest":
        return { type, detail: "Profile mentions openness to relocation", date: addDays(TODAY, -int(10, 60)) };
    }
  });
}

// ---------------------------------------------------------------- candidate factory

interface Ctx {
  spec: GenSpec;
  client: string;
  job: City;
  bands: ReturnType<typeof cityBands>;
}

const dupMemory = new Map<string, { name: string; personKey: string; employer: string; location: Candidate["location"]["value"]; edu: Education[] }>();

function makeCandidate(ctx: Ctx, a: Arche, opts: { name?: string; cityOverride?: City } = {}): Candidate {
  const { spec } = ctx;
  const isPassive = a.pool === "passive";
  const conflict = a.conflict;
  const conflictKind = !conflict ? undefined : spec.schedule ? "schedule" : spec.background ? "background" : spec.cred?.wrongState ? "state" : spec.edu.wrongField ? "field" : "skills";

  const keyName = a.nameKey ? KEY_NAMES[spec.sampleId]?.[a.nameKey] : undefined;
  const dupKey = `${spec.sampleId}:dup`;
  const name = opts.name ?? (a.dup === "newer" ? dupMemory.get(dupKey)!.name : keyName ?? randomName());

  // sources & provenance
  const regSource: SourceId = spec.cred?.passiveSource ?? spec.passiveSources[1] ?? "data_provider";
  const passiveMain: SourceId = spec.family === "software" && chance(0.5) ? "oss_portfolio" : "data_provider";
  const srcIds = a.sources.map((s) => (s === "PASSIVE_REGISTRY" ? regSource : s === "data_provider" ? passiveMain : s)) as SourceId[];
  const primary = srcIds.find((s) => s === "data_provider" || s === "oss_portfolio") ?? srcIds[0];
  const factSource: SourceId = isPassive ? primary : srcIds[0];
  const st: FactStatus = isPassive ? "inferred" : "self_reported";

  // dates
  const anchor = a.hist ? a.hist.date : TODAY;
  const appDate = a.appDays != null ? addDays(TODAY, -a.appDays) : undefined;
  const retrieved = isPassive ? addDays(TODAY, -int(1, 20)) : appDate ?? anchor;

  // location
  let loc: Candidate["location"]["value"];
  const dupInfo = dupMemory.get(dupKey);
  if (a.dup === "newer" && dupInfo) loc = dupInfo.location;
  else if (opts.cityOverride) loc = jitter(opts.cityOverride, 0.06);
  else {
    const band = a.dist === "far_relocate" ? (ctx.bands.veryFar.length ? ctx.bands.veryFar : ctx.bands.far) : ctx.bands[a.dist === "edge" ? "edge" : a.dist];
    const c = pick(band);
    loc = jitter(c, c === ctx.job ? 0.12 : 0.05);
  }

  // employer + history
  const employers = spec.employers.filter((e) => e !== ctx.client);
  let employer = pick(employers);
  if (a.dup === "newer" && dupInfo) employer = pick(employers.filter((e) => e !== dupInfo.employer));
  const others = employers.filter((e) => e !== employer).sort(() => rand() - 0.5);
  const years = a.absoluteYears ?? Math.max(0.8, spec.minYears + a.yearsDelta);
  // hero: long tenure at an employer with layoffs; dup: newer job since 2024-06
  const curOverride = a.key === "passive_hero" ? int(56, 70) : a.dup === "newer" ? 28 : undefined;
  const history = buildHistory(spec, a.tier, years, anchor, st, factSource, employer, others, curOverride);
  if (a.dup === "newer" && dupInfo && history[1]) history[1].employer = dupInfo.employer;

  // credentials
  const credentials: Credential[] = [];
  const regName = name;
  if (spec.cred) {
    const mode: CredMode = conflictKind === "state" ? "wrong_state" : a.cred;
    const credStatus: FactStatus = isPassive && mode !== "verified" ? "inferred" : "self_reported";
    const cr = makeCred(spec.cred, mode, credStatus, factSource, regName, true);
    if (cr) credentials.push(cr);
  }
  const extras = [...spec.extraCreds];
  if (a.extras === "missing" && extras.length) extras.splice(int(0, extras.length - 1), 1);
  if (a.extras !== "unknown") {
    for (const t of extras) {
      const cr = makeCred(t, isPassive ? "inferred" : "self", st, factSource, regName, Boolean(t.registry));
      if (cr) credentials.push(cr);
    }
  }
  const niceCreds = spec.niceCreds.slice(0, Math.min(spec.niceCreds.length, Math.ceil(a.nice / 2)));
  for (const t of niceCreds) {
    const cr = makeCred(t, isPassive ? "inferred" : "self", st, factSource, regName, Boolean(t.registry));
    if (cr) credentials.push(cr);
  }

  // skills
  let must = spec.mustSkills.map((s) => (ALT_SKILL[s] && chance(0.35) ? ALT_SKILL[s] : s));
  let skillsComplete = !isPassive;
  if (a.skills === "missing_one" && must.length) must.splice(isPassive ? 0 : int(0, must.length - 1), 1);
  if (a.skills === "unknown_one" && must.length) {
    must.splice(0, 1);
    skillsComplete = false;
  }
  if (conflictKind === "skills" && must.length) must.splice(int(0, must.length - 1), 1);
  if (a.skills === "few") {
    must = must.slice(0, 1);
    skillsComplete = false;
  }
  if (isPassive && a.skills !== "missing_one") skillsComplete = false;
  const nice = spec.niceSkills.slice(0, a.nice);
  const base = a.skills === "few" ? [] : spec.baseSkills.filter(() => chance(0.7));
  const skillNames = [...new Set([...must, ...nice, ...base])];
  const skills = skillNames.map((n) => ({ name: n, status: st, source: factSource }));

  // education
  let education: Education[] = [];
  const school = pick(spec.edu.schools);
  const gradYear = 2026 - Math.round(years) - int(0, 3);
  const mk = (t: { level: Education["level"]; degree: string; field: string }, yr: number): Education => ({ ...t, school: pick(spec.edu.schools), year: yr, status: st, source: factSource });
  if (a.dup === "newer" && dupInfo) education = dupInfo.edu.map((e) => ({ ...e, status: st, source: factSource }));
  else if (conflictKind === "field" && spec.edu.wrongField) education = [mk(pick(spec.edu.wrongField), gradYear)];
  else if (a.edu === "meets") education = [mk(pick(spec.edu.meets), gradYear)];
  else if (a.edu === "nice") education = [mk(spec.edu.meets[0], gradYear), ...(spec.edu.nice ? [mk(spec.edu.nice[0], gradYear + 3)] : [])];
  else if (a.edu === "lower") education = [mk(pick(spec.edu.lower), gradYear)];
  else if (a.edu === "wrong_field" && spec.edu.wrongField) education = [mk(pick(spec.edu.wrongField), gradYear)];
  void school;

  // schedule / background / physical / language
  let shiftPreference: Candidate["shiftPreference"];
  if (spec.schedule) {
    if (conflictKind === "schedule" || a.schedule === "conflict") shiftPreference = { value: spec.schedule.conflict, status: st, source: factSource };
    else if (a.schedule === "ok") shiftPreference = { value: pick(spec.schedule.ok), status: st, source: factSource };
    else if (a.schedule === "inferred_ok") shiftPreference = { value: `${spec.schedule.ok[0]} (current role)`, status: "inferred", source: factSource };
  }
  let background: Candidate["background"];
  if (spec.background) {
    if (conflictKind === "background" || a.background === "bad") background = { value: spec.background.bad, status: "self_reported", source: "internal_pool" };
    else if (a.background === "verified") background = { value: `${spec.background.ok}; MVR pulled ${addDays(TODAY, -int(15, 40))}`, status: "verified", source: "internal_pool", date: addDays(TODAY, -int(15, 40)) };
    else if (a.background === "ok") background = { value: spec.background.ok, status: "self_reported", source: factSource };
  }
  const physical = spec.physical && (a.physical || (!isPassive && chance(0.5))) ? { value: spec.physical, status: "self_reported" as FactStatus, source: factSource } : undefined;
  const languages = [{ value: "English", status: st, source: factSource }];
  if (spec.niceLanguage && (a.language || chance(0.25))) languages.push({ value: spec.niceLanguage, status: st, source: factSource });

  // applications / interest / signals
  const applications: Application[] = [];
  if (appDate) applications.push({ jobTitle: spec.activeJobTitle, client: ctx.client, date: appDate, stage: a.appStage ?? "applied" });
  if (a.hist) applications.push({ jobTitle: pick(spec.titles.lead), client: pick(["Meridian Staffing client", "Previous client (confidential)", "Northgate Retail Group", "Harbor Point Insurance"]), date: a.hist.date, stage: a.hist.stage });
  const signals = isPassive ? signalsFor(a.signals, employer, history[0].start) : [];
  if (a.key === "passive_hero" && !signals.some((s) => s.type === "employer_layoffs")) signals.push(...signalsFor(["employer_layoffs"], employer, history[0].start));

  const sources = srcIds.map((s) => sourceRef(s, retrieved, s === regSource ? credentials[0]?.number : undefined));
  const lastActivity = isPassive ? signals.find((s) => s.type === "profile_updated")?.date ?? retrieved : appDate ?? anchor;

  const id = `cand-${String(idCounter++).padStart(4, "0")}`;
  const [first, last] = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ']/g, "").split(" ");
  const cand: Candidate = {
    id,
    name,
    family: spec.family,
    poolType: a.pool,
    sources,
    lastActivity,
    currentTitle: { value: history[0].title, status: st, source: factSource },
    currentEmployer: { value: history[0].employer, status: st, source: factSource },
    location: { value: loc, status: isPassive ? "inferred" : "self_reported", source: factSource },
    willingToRelocate: a.dist === "far_relocate" ? { value: true, status: "self_reported", source: factSource } : a.dist === "far" && !isPassive ? { value: false, status: "self_reported", source: factSource } : undefined,
    workHistory: history,
    skills,
    credentials,
    education,
    shiftPreference,
    languages,
    physical,
    background,
    desiredPay: isPassive ? undefined : { value: payFor(spec), status: "self_reported", source: factSource },
    applications,
    signals,
    interestConfirmed: a.confirmed ? { date: addDays(TODAY, -6), note: "Phone screen with recruiter; interested and available with 2 weeks' notice" } : undefined,
    complete: {
      skills: skillsComplete,
      credentials: !isPassive && a.extras !== "unknown" && a.cred !== "unknown",
      education: !isPassive && a.edu !== "unknown",
      languages: !isPassive,
    },
    contact: { email: `${first}.${last}@example.com`, phone: `(555) 01${int(0, 9)}-${digits(4)}` },
  };
  if (a.dup) {
    const personKey = `${spec.sampleId}-person-${name.toLowerCase().replace(/\W+/g, "-")}`;
    cand.personKey = personKey;
    if (a.dup === "base") dupMemory.set(dupKey, { name, personKey, employer, location: loc, edu: education });
  }
  return cand;
}

// ---------------------------------------------------------------- warehouse/admin background family

const WAREHOUSE: GenSpec = {
  sampleId: "bg-warehouse",
  family: "warehouse_admin",
  city: "Dallas",
  radius: 30,
  minYears: 2,
  currentMinYears: 1,
  titles: {
    lead: ["Warehouse Lead", "Office Manager", "Inventory Control Lead"],
    mid: ["Forklift Operator", "Administrative Assistant", "Receiving Clerk"],
    junior: ["Warehouse Associate", "Receptionist"],
    adjacent: ["Delivery Helper", "Data Entry Clerk"],
    prev: ["Warehouse Associate", "Administrative Assistant"],
  },
  summaries: {
    lead: ["Leads a warehouse shift of 12; inventory counts, RF scanning, forklift operations."],
    mid: ["Forklift and RF scanner operation; receiving and putaway in a warehouse."],
    junior: ["Picking and packing; front desk support."],
    adjacent: ["Data entry and filing."],
    prev: ["Warehouse and office support."],
  },
  employers: ["Brazos Distribution", "Keystone Fulfillment", "Office Partners Group", "Trinity Cold Storage", "Summit Parts Depot", "Bluebird Office Services"],
  cred: { code: "FORKLIFT", name: "Forklift Operator Certification", issuer: "Employer OSHA-compliant training", numberPrefix: "FL-", digits: 6, validYears: 3 },
  extraCreds: [],
  niceCreds: [],
  mustSkills: ["Forklift", "Inventory control", "RF scanning"],
  niceSkills: ["Microsoft Office", "Data entry", "Customer service"],
  baseSkills: ["Customer service"],
  edu: { meets: [{ level: "high_school", degree: "High school diploma", field: "" }], lower: [{ level: "high_school", degree: "GED", field: "" }], schools: ["Dallas ISD", "Austin ISD", "Houston ISD"] },
  passiveSources: ["data_provider"],
  activeJobTitle: "Warehouse Associate",
};

// ---------------------------------------------------------------- run

for (const spec of SPECS) {
  const sample = SAMPLES.find((s) => s.sampleId === spec.sampleId);
  if (!sample) throw new Error(`No sample for ${spec.sampleId}`);
  const job = findCity(spec.city)!;
  const ctx: Ctx = { spec, client: sample.client, job, bands: cityBands(job, spec.radius) };
  for (const a of [...ACTIVE_ARCHES, ...PASSIVE_ARCHES]) candidates.push(makeCandidate(ctx, a));
}

// background candidates: same families, random metros and random archetypes
const BG_ARCHES = [...ACTIVE_ARCHES, ...PASSIVE_ARCHES].filter((a) => !a.dup && !a.nameKey && !a.confirmed);
for (const spec of [...SPECS, WAREHOUSE, WAREHOUSE, WAREHOUSE]) {
  const sample = SAMPLES.find((s) => s.sampleId === spec.sampleId);
  const job = findCity(spec.city)!;
  const ctx: Ctx = { spec, client: sample?.client ?? "", job, bands: cityBands(job, spec.radius) };
  for (let i = 0; i < 7; i++) {
    const a = pick(BG_ARCHES);
    candidates.push(makeCandidate(ctx, { ...a, key: `bg_${a.key}`, conflict: false }, { cityOverride: pick(CITIES) }));
  }
}

// ---------------------------------------------------------------- write

const root = join(process.cwd(), "data");
mkdirSync(join(root, "samples"), { recursive: true });
writeFileSync(join(root, "candidates.json"), JSON.stringify(candidates));
writeFileSync(join(root, "registry.json"), JSON.stringify(registry, null, 1));
for (const s of SAMPLES) writeFileSync(join(root, "samples", `${s.sampleId}.json`), JSON.stringify(s, null, 2));
writeFileSync(join(root, "samples", "index.json"), JSON.stringify(SAMPLES.map((s) => s.sampleId), null, 2));

console.log(`candidates: ${candidates.length}, registry records: ${registry.length}, samples: ${SAMPLES.length}`);
