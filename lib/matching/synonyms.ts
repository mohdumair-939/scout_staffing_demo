import type { EduLevel, Family, SourceId } from "@/lib/data/types";

/** Lowercase, strip punctuation (keep & + #), collapse spaces, pad with spaces for whole-word search. */
export function norm(text: string): string {
  return (
    " " +
    text
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9&+#]+/g, " ")
      .trim() +
    " "
  );
}

/** Whole-word / whole-phrase containment on normalized text. */
export function hasTerm(normalizedText: string, term: string): boolean {
  return normalizedText.includes(norm(term));
}

export function findTerms<T extends string>(text: string, map: Record<T, string[]>): T[] {
  const n = norm(text);
  return (Object.keys(map) as T[]).filter((k) => map[k].some((alias) => hasTerm(n, alias)));
}

// ---------- Credentials (licences + certifications) ----------

export interface CredentialDef {
  name: string;
  kind: "license" | "certification";
  aliases: string[];
  /** which mock registry can verify it, if any */
  registry?: SourceId;
}

export const CREDENTIALS: Record<string, CredentialDef> = {
  RN: { name: "Registered Nurse (RN) licence", kind: "license", registry: "license_registry", aliases: ["registered nurse", "rn license", "rn licence", "rn", "nursing license", "compact license", "multistate license"] },
  CCRN: { name: "CCRN (Critical Care Registered Nurse)", kind: "certification", aliases: ["ccrn"] },
  BLS: { name: "BLS (Basic Life Support)", kind: "certification", aliases: ["bls", "basic life support"] },
  ACLS: { name: "ACLS (Advanced Cardiovascular Life Support)", kind: "certification", aliases: ["acls", "advanced cardiovascular life support"] },
  JOURNEYMAN_ELECTRICIAN: { name: "Journeyman Electrician licence", kind: "license", registry: "license_registry", aliases: ["journeyman", "journeyman electrician", "journeyman license", "journeyman licence"] },
  MASTER_ELECTRICIAN: { name: "Master Electrician licence", kind: "license", registry: "license_registry", aliases: ["master electrician"] },
  OSHA_10: { name: "OSHA 10", kind: "certification", aliases: ["osha 10", "osha10"] },
  OSHA_30: { name: "OSHA 30", kind: "certification", aliases: ["osha 30", "osha30"] },
  EPA_608: { name: "EPA Section 608 Universal", kind: "certification", aliases: ["epa 608", "section 608", "epa section 608", "608 universal"] },
  ACR_TECH: { name: "Texas ACR Technician registration (TDLR)", kind: "license", registry: "license_registry", aliases: ["acr technician", "acr registration", "tdlr"] },
  NATE: { name: "NATE certification", kind: "certification", aliases: ["nate"] },
  "CDL-A": { name: "Class A Commercial Driver's License (CDL-A)", kind: "license", registry: "license_registry", aliases: ["cdl a", "class a cdl", "cdl class a", "class a commercial drivers license", "class a commercial driver"] },
  HAZMAT: { name: "Hazmat (H) endorsement", kind: "certification", aliases: ["hazmat", "h endorsement"] },
  TANKER: { name: "Tanker (N) endorsement", kind: "certification", aliases: ["tanker", "n endorsement"] },
  DOT_MEDICAL: { name: "DOT medical card", kind: "certification", aliases: ["dot medical", "medical card", "medical examiners certificate"] },
  CPA: { name: "Certified Public Accountant (CPA) licence", kind: "license", registry: "cpa_board", aliases: ["cpa", "certified public accountant", "cpa license", "cpa licence"] },
  CMA: { name: "Certified Management Accountant (CMA)", kind: "certification", aliases: ["cma", "certified management accountant"] },
  CIA: { name: "Certified Internal Auditor (CIA)", kind: "certification", aliases: ["certified internal auditor"] },
  EA: { name: "Enrolled Agent (EA)", kind: "license", aliases: ["enrolled agent"] },
  BAR: { name: "State Bar admission", kind: "license", registry: "bar_directory", aliases: ["bar admission", "admitted to the", "state bar", "licensed attorney", "admitted to practice", "bar in good standing", "member of the", "bar"] },
  NALA_CP: { name: "NALA Certified Paralegal (CP)", kind: "certification", registry: "association_directory", aliases: ["nala", "certified paralegal", "nala cp"] },
  NFPA_RP: { name: "NFPA Registered Paralegal (RP)", kind: "certification", aliases: ["registered paralegal", "nfpa"] },
  CPE_ESTIMATOR: { name: "ASPE Certified Professional Estimator (CPE)", kind: "certification", registry: "association_directory", aliases: ["certified professional estimator", "aspe", "cpe"] },
  CCE: { name: "AACE Certified Cost Professional", kind: "certification", aliases: ["certified cost professional", "certified cost engineer", "aace"] },
  AWS_CERT: { name: "AWS Certification", kind: "certification", aliases: ["aws certified", "aws certification"] },
  FORKLIFT: { name: "Forklift certification", kind: "certification", aliases: ["forklift certification", "forklift certified"] },
};

/** Codes that should never be matched by the very loose alias "bar"/"cpe" outside the right family. */
export function credentialCodesIn(text: string, family?: Family): string[] {
  const n = norm(text);
  const found = Object.entries(CREDENTIALS)
    .filter(([, def]) => def.aliases.some((a) => hasTerm(n, a)))
    .map(([code]) => code);
  return found.filter((code) => {
    if (code === "BAR") return !family || family === "legal";
    if (code === "CPE_ESTIMATOR") return !family || family === "estimating";
    if (code === "RN" && found.includes("CCRN") && !/\brn\b|registered nurse|nursing licen/i.test(text)) return false;
    if (code === "JOURNEYMAN_ELECTRICIAN" && found.includes("MASTER_ELECTRICIAN") && !/journeyman/i.test(text)) return false;
    return true;
  });
}

// ---------- Skills / tools ----------

export const SKILLS: Record<string, string[]> = {
  // accounting / finance
  "Month-end close": ["month end close", "monthly close", "financial close", "close process", "month end"],
  Consolidation: ["consolidation", "consolidations", "multi entity", "intercompany"],
  GAAP: ["gaap", "us gaap"],
  "Financial reporting": ["financial reporting", "financial statements", "financial statement preparation"],
  "General ledger": ["general ledger", "journal entries", "account reconciliations", "reconciliations", "balance sheet reconciliations"],
  "Audit": ["audit", "external audit", "internal audit", "audit coordination", "audits"],
  "Budgeting & forecasting": ["budgeting", "forecasting", "fp&a", "financial planning"],
  "ASC 606": ["asc 606", "revenue recognition"],
  "SOX / internal controls": ["sox", "sarbanes oxley", "internal controls"],
  NetSuite: ["netsuite"],
  SAP: ["sap"],
  "Oracle Financials": ["oracle", "oracle financials"],
  QuickBooks: ["quickbooks"],
  "Advanced Excel": ["excel", "advanced excel", "pivot tables", "xlookup", "vlookup"],
  "Power BI": ["power bi"],
  "Public accounting / Big 4": ["public accounting", "big 4", "big four"],
  // tax
  "Corporate tax (1120)": ["corporate tax", "1120", "c corp", "corporate income tax"],
  "Partnership tax (1065)": ["partnership tax", "1065", "k 1", "partnership returns"],
  "ASC 740 tax provision": ["asc 740", "tax provision", "income tax provision"],
  "Multistate tax (SALT)": ["salt", "state and local tax", "multistate"],
  "Tax research": ["tax research"],
  "CCH Axcess": ["cch axcess", "cch", "prosystem"],
  OneSource: ["onesource"],
  "Oil & gas industry": ["oil and gas", "oil & gas", "energy industry", "energy sector"],
  // legal
  Litigation: ["litigation", "litigation support"],
  "E-discovery": ["e discovery", "ediscovery", "electronic discovery"],
  Relativity: ["relativity"],
  "Court e-filing (PACER/CM-ECF)": ["e filing", "efiling", "pacer", "cm ecf", "electronic filing"],
  "Trial preparation": ["trial prep", "trial preparation", "trial binders"],
  "Legal research": ["legal research", "westlaw", "lexisnexis"],
  Clio: ["clio"],
  iManage: ["imanage"],
  "M&A": ["m&a", "mergers and acquisitions", "mergers & acquisitions"],
  "Contract drafting & negotiation": ["contract drafting", "drafting and negotiating", "contract negotiation", "commercial contracts", "drafting"],
  "Securities": ["securities", "sec reporting", "private placements"],
  "Private equity / VC": ["private equity", "venture capital"],
  "Due diligence": ["due diligence"],
  "AmLaw 200 firm experience": ["amlaw", "large firm", "big law", "biglaw"],
  // estimating
  "Quantity takeoff": ["quantity takeoff", "quantity takeoffs", "takeoffs", "take offs"],
  Bluebeam: ["bluebeam", "bluebeam revu"],
  "On-Screen Takeoff": ["on screen takeoff", "ost"],
  "Blueprint reading": ["blueprint", "blueprints", "plans and specifications", "construction documents", "read plans"],
  "Bid preparation": ["bid preparation", "bid proposals", "bid packages", "hard bid"],
  Procore: ["procore"],
  ProEst: ["proest"],
  "Sage Estimating": ["sage estimating", "timberline"],
  "MEP estimating": ["mep", "mechanical electrical plumbing"],
  "Bid leveling": ["bid leveling", "subcontractor bids", "sub coverage"],
  "Value engineering": ["value engineering"],
  // nursing
  "Critical care": ["critical care", "icu", "intensive care", "micu", "sicu", "cvicu"],
  "Ventilator management": ["ventilator", "ventilator management", "mechanical ventilation"],
  "Epic EMR": ["epic", "epic emr"],
  "Vasoactive drip titration": ["titration", "vasoactive", "drip titration"],
  CRRT: ["crrt"],
  // electrical
  "Commercial wiring": ["commercial wiring", "commercial electrical"],
  "Conduit bending": ["conduit", "conduit bending", "emt"],
  "NEC code knowledge": ["nec", "national electrical code"],
  "Electrical troubleshooting": ["electrical troubleshooting", "troubleshoot electrical"],
  "PLC / controls": ["plc", "plcs"],
  "Switchgear & panels": ["switchgear", "panel installation", "panels", "service upgrades"],
  // hvac
  "HVAC diagnostics": ["hvac diagnostics", "diagnose", "diagnostics"],
  Refrigeration: ["refrigeration", "refrigerant"],
  "Heat pumps": ["heat pump", "heat pumps"],
  "Rooftop units (RTU)": ["rooftop units", "rtu", "rtus"],
  "Commercial HVAC": ["commercial hvac"],
  "Building automation": ["building automation", "bms", "bas"],
  // trucking
  "OTR driving": ["otr", "over the road", "long haul"],
  "Regional driving": ["regional"],
  "Dry van": ["dry van"],
  Reefer: ["reefer", "refrigerated freight"],
  Flatbed: ["flatbed"],
  "ELD / hours of service": ["eld", "electronic logging", "hours of service", "hos"],
  // software
  Python: ["python"],
  Django: ["django"],
  FastAPI: ["fastapi"],
  Flask: ["flask"],
  AWS: ["aws", "amazon web services"],
  PostgreSQL: ["postgresql", "postgres"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Microservices: ["microservices"],
  "REST APIs": ["rest api", "rest apis", "restful"],
  Kafka: ["kafka"],
  Redis: ["redis"],
  Terraform: ["terraform"],
  "CI/CD": ["ci cd", "github actions", "jenkins"],
  "Open-source contributions": ["open source", "github contributions"],
  "Fintech / payments": ["fintech", "payments", "financial technology"],
  "Healthcare industry": ["healthcare", "health system", "hospital finance", "health care"],
  // warehouse / admin
  Forklift: ["forklift"],
  "Inventory control": ["inventory"],
  "RF scanning": ["rf scanner", "rf scanning"],
  "Microsoft Office": ["microsoft office", "ms office", "outlook"],
  "Data entry": ["data entry"],
  "Customer service": ["customer service"],
};

export function skillsIn(text: string): string[] {
  return findTerms(text, SKILLS);
}

// ---------- Experience domains (matched against job titles + summaries) ----------

export const DOMAINS: Record<string, string[]> = {
  icu: ["icu", "intensive care", "critical care", "micu", "sicu", "cvicu"],
  nursing: ["nurse", "rn", "nursing"],
  electrical: ["electrician", "electrical"],
  hvac: ["hvac", "refrigeration"],
  driving: ["driver", "cdl", "truck", "trucking", "tractor trailer", "tractor-trailer"],
  accounting: ["accountant", "accounting", "controller", "auditor", "audit", "financial reporting", "finance manager", "cfo"],
  management: ["manager", "controller", "director", "supervisor", "head of", "lead", "cfo"],
  tax: ["tax"],
  litigation: ["litigation", "litigator", "trial"],
  paralegal: ["paralegal", "legal assistant"],
  corporate_law: ["corporate", "m&a", "transactional", "mergers"],
  attorney: ["attorney", "counsel", "lawyer"],
  estimating: ["estimator", "estimating", "preconstruction", "quantity surveyor"],
  commercial: ["commercial"],
  software: ["engineer", "developer", "software"],
  backend: ["backend", "back end", "python", "api", "platform"],
  warehouse: ["warehouse", "forklift", "logistics"],
};

export function domainsIn(text: string): string[] {
  const found = findTerms(text, DOMAINS).filter((d) => d !== "management");
  // "managing", "supervising", "leadership" etc. mean the years must be in a management role
  if (/manag|supervis|leadership|\blead(ing)? (a )?team|director/i.test(text)) found.push("management");
  return found;
}

// ---------- Education ----------

export const EDU_RANK: Record<EduLevel, number> = {
  high_school: 1,
  certificate: 2,
  associate: 3,
  bachelor: 4,
  master: 5,
  jd: 5,
  doctorate: 6,
};

export const EDU_TERMS: Record<EduLevel, string[]> = {
  high_school: ["high school", "ged", "diploma"],
  certificate: ["certificate", "certificate program", "trade school", "apprenticeship"],
  associate: ["associate degree", "associates degree", "associates", "adn", "aas"],
  bachelor: ["bachelor", "bachelors", "bsn", "bs", "ba", "bba", "undergraduate degree", "four year degree", "4 year degree"],
  master: ["master", "masters", "mba", "mst", "msn", "ms in", "llm", "ll m"],
  jd: ["jd", "juris doctor", "law degree", "j d"],
  doctorate: ["phd", "doctorate"],
};

export const EDU_FIELDS: Record<string, string[]> = {
  accounting: ["accounting"],
  finance: ["finance"],
  business: ["business"],
  taxation: ["taxation", "tax"],
  nursing: ["nursing", "bsn", "adn"],
  "computer science": ["computer science"],
  engineering: ["engineering"],
  "construction management": ["construction management", "construction science"],
  law: ["law", "juris doctor", "jd"],
  securities: ["securities"],
  "paralegal studies": ["paralegal"],
};

// ---------- Schedule ----------

export const SCHEDULE: Record<string, string[]> = {
  nights: ["night", "nights", "night shift", "overnight", "nocturnal"],
  days: ["day shift", "days"],
  weekends: ["weekend", "weekends"],
  twelve_hour: ["12 hour", "12 hr"],
  on_call: ["on call"],
  otr: ["otr", "over the road"],
  regional: ["regional"],
  local: ["local", "home daily"],
  home_weekly: ["home weekly"],
  busy_season: ["busy season", "tax season", "extended hours"],
  hybrid: ["hybrid"],
  remote: ["remote"],
  onsite: ["on site", "onsite", "in office", "in the office"],
  weekdays: ["monday through friday", "monday friday", "m f", "weekdays"],
};

/** pairs that contradict each other: [required, candidate preference] */
export const SCHEDULE_CONFLICTS: Array<[string, string]> = [
  ["nights", "days"],
  ["days", "nights"],
  ["otr", "local"],
  ["regional", "local"],
  ["busy_season", "weekdays"],
  ["weekends", "weekdays"],
  ["onsite", "remote"],
  ["hybrid", "remote"],
  ["on_call", "weekdays"],
];

export const LANGUAGES = ["spanish", "vietnamese", "mandarin", "french", "portuguese", "korean", "tagalog", "arabic", "hindi"];

export const STOPWORDS = new Set(
  "a an and or the of to in on for with at by from as is are be must have has ability able strong experience years year required preferred plus including include etc knowledge working work skills skill proficiency proficient familiarity familiar industry background hands environment team demonstrated solid excellent".split(" "),
);

export const FAMILY_LABEL: Record<Family, string> = {
  nursing: "Nursing",
  electrical: "Electrical trades",
  hvac: "HVAC",
  trucking: "Trucking / logistics",
  accounting: "Accounting & finance",
  tax: "Tax",
  legal: "Legal",
  estimating: "Construction estimating",
  software: "Software engineering",
  warehouse_admin: "Warehouse & admin",
};

/** Families searched for a job of a given family (adjacent talent counts). */
export const SEARCH_FAMILIES: Record<Family, Family[]> = {
  nursing: ["nursing"],
  electrical: ["electrical"],
  hvac: ["hvac"],
  trucking: ["trucking"],
  accounting: ["accounting"],
  tax: ["tax", "accounting"],
  legal: ["legal"],
  estimating: ["estimating"],
  software: ["software"],
  warehouse_admin: ["warehouse_admin"],
};

export const FAMILY_KEYWORDS: Record<Family, string[]> = {
  nursing: ["nurse", "rn", "nursing", "icu", "lpn", "bsn"],
  electrical: ["electrician", "electrical", "journeyman", "wiring"],
  hvac: ["hvac", "refrigeration", "heating", "air conditioning"],
  trucking: ["cdl", "truck", "driver", "otr", "freight"],
  tax: ["tax manager", "tax senior", "tax accountant", "tax director", "tax"],
  accounting: ["accountant", "controller", "accounting", "cpa", "gaap", "audit", "bookkeeper"],
  legal: ["paralegal", "attorney", "legal", "counsel", "litigation", "law firm", "lawyer"],
  estimating: ["estimator", "estimating", "takeoff", "preconstruction", "bid"],
  software: ["software", "engineer", "developer", "python", "backend", "api"],
  warehouse_admin: ["warehouse", "forklift", "administrative", "receptionist", "office"],
};

export function guessFamily(title: string, jd: string): Family {
  const t = norm(title);
  const all = norm(title + " " + jd);
  let best: Family = "warehouse_admin";
  let bestScore = 0;
  for (const [fam, words] of Object.entries(FAMILY_KEYWORDS) as [Family, string[]][]) {
    const score = words.reduce((s, w) => s + (hasTerm(t, w) ? 5 : 0) + (hasTerm(all, w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = fam;
    }
  }
  return best;
}
