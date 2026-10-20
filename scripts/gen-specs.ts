// Per-sample generator specs: titles, employers, skills and credentials that line up
// with each sample's cached criteria, so every sample gets a realistic mix of
// strong, partial and failing matches.
import type { EduLevel, Family, SourceId } from "../lib/data/types";

export interface EduTemplate {
  level: EduLevel;
  degree: string;
  field: string;
}

export interface CredTemplate {
  code: string;
  name: string;
  issuer: string;
  state?: string;
  /** registry that lists it, if any */
  registry?: "license_registry" | "cpa_board" | "bar_directory" | "association_directory";
  registryName?: string;
  numberPrefix: string;
  digits: number;
  /** years the credential is valid */
  validYears: number;
  /** state used for "wrong state" archetypes */
  wrongState?: string;
  wrongIssuer?: string;
  /** passive candidates found through this registry */
  passiveSource?: SourceId;
}

export interface GenSpec {
  sampleId: string;
  family: Family;
  city: string;
  radius: number;
  minYears: number;
  /** minimum years for the current (senior) role, e.g. management years */
  currentMinYears: number;
  titles: { lead: string[]; mid: string[]; junior: string[]; adjacent: string[]; prev: string[] };
  summaries: { lead: string[]; mid: string[]; junior: string[]; adjacent: string[]; prev: string[] };
  employers: string[];
  /** main licence (mandatory or preferred) */
  cred?: CredTemplate;
  /** other mandatory credentials */
  extraCreds: CredTemplate[];
  /** preferred credentials */
  niceCreds: CredTemplate[];
  mustSkills: string[];
  niceSkills: string[];
  baseSkills: string[];
  edu: { meets: EduTemplate[]; lower: EduTemplate[]; wrongField?: EduTemplate[]; nice?: EduTemplate[]; schools: string[] };
  schedule?: { ok: string[]; conflict: string };
  background?: { ok: string; bad: string };
  physical?: string;
  niceLanguage?: string;
  passiveSources: SourceId[];
  activeJobTitle: string;
}

const AHA = "American Heart Association";

export const SPECS: GenSpec[] = [
  {
    sampleId: "controller-dallas",
    family: "accounting",
    city: "Dallas",
    radius: 35,
    minYears: 8,
    currentMinYears: 3,
    titles: {
      lead: ["Controller", "Assistant Controller", "Corporate Controller", "Division Controller"],
      mid: ["Accounting Manager", "Senior Accounting Manager"],
      junior: ["Staff Accountant", "Accountant I"],
      adjacent: ["FP&A Manager", "Senior Financial Analyst"],
      prev: ["Senior Accountant", "Senior Auditor", "Accounting Supervisor"],
    },
    summaries: {
      lead: [
        "Leads a team of 6 accountants; owns month-end close and multi-entity consolidation for 5 entities under US GAAP.",
        "Manages accounting team of 4; financial reporting, consolidation and audit coordination for a $250M distributor.",
      ],
      mid: ["Manages GL team of 3; month-end close, account reconciliations and accounting policies."],
      junior: ["Journal entries, bank reconciliations and AP support."],
      adjacent: ["Budgeting, forecasting and board reporting; partners with accounting on close."],
      prev: ["Senior accountant: month-end close, reconciliations and audit support.", "Audit senior in public accounting, manufacturing and logistics clients."],
    },
    employers: ["Brazos Industrial Supply", "Redline Logistics", "Cedar Ridge Foods", "Summit Peak Hospitality", "Meridian Packaging Co.", "Granite Bay Manufacturing", "Northgate Retail Group", "Ironwood Energy Services", "Pecan Street Capital", "Whitfield & Crane LLP"],
    cred: { code: "CPA", name: "Certified Public Accountant (CPA)", issuer: "Texas State Board of Public Accountancy", state: "TX", registry: "cpa_board", registryName: "Mock TX State Board of Public Accountancy", numberPrefix: "", digits: 6, validYears: 1, passiveSource: "cpa_board" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["Month-end close", "Consolidation", "NetSuite", "General ledger"],
    niceSkills: ["Public accounting / Big 4", "ASC 606", "Power BI"],
    baseSkills: ["GAAP", "Financial reporting", "Audit", "SOX / internal controls", "Budgeting & forecasting"],
    edu: {
      meets: [{ level: "bachelor", degree: "BBA, Accounting", field: "Accounting" }, { level: "bachelor", degree: "BS, Finance", field: "Finance" }],
      lower: [{ level: "associate", degree: "AAS, Accounting", field: "Accounting" }],
      wrongField: [{ level: "bachelor", degree: "BA, Economics", field: "Economics" }],
      nice: [{ level: "master", degree: "MBA", field: "Business Administration" }],
      schools: ["University of North Texas", "Texas A&M University", "UT Arlington", "Baylor University", "Texas Tech University", "SMU"],
    },
    passiveSources: ["data_provider", "cpa_board"],
    activeJobTitle: "Controller",
  },
  {
    sampleId: "senior-accountant-chicago",
    family: "accounting",
    city: "Chicago",
    radius: 30,
    minYears: 4,
    currentMinYears: 2,
    titles: {
      lead: ["Senior Accountant", "Senior GL Accountant"],
      mid: ["Senior Accountant", "Accountant II"],
      junior: ["Staff Accountant", "Junior Accountant"],
      adjacent: ["Financial Analyst", "Billing Specialist"],
      prev: ["Staff Accountant", "Audit Associate"],
    },
    summaries: {
      lead: ["Owns general ledger, account reconciliations and monthly financial statements for a multi-site provider."],
      mid: ["General ledger, journal entries and account reconciliations; supports monthly financial statements."],
      junior: ["AP/AR support and bank reconciliations."],
      adjacent: ["Variance analysis and budget support; limited GL exposure."],
      prev: ["Staff accountant: journal entries and account reconciliations.", "Audit associate in public accounting."],
    },
    employers: ["Lakefront Medical Group", "Harbor Point Insurance", "Wabash Logistics", "North Branch Foods", "Prairie State Health", "Loop Street Partners", "Fulton Market Brands", "Kessler & Moy CPAs"],
    cred: { code: "CPA", name: "Certified Public Accountant (CPA)", issuer: "Illinois Dept. of Financial & Professional Regulation", state: "IL", registry: "cpa_board", registryName: "Mock IL Board of Examiners / IDFPR", numberPrefix: "065.", digits: 6, validYears: 3, passiveSource: "cpa_board" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["General ledger", "Financial reporting", "Advanced Excel"],
    niceSkills: ["NetSuite", "Public accounting / Big 4", "Healthcare industry"],
    baseSkills: ["GAAP", "Audit", "QuickBooks"],
    edu: {
      meets: [{ level: "bachelor", degree: "BS, Accounting", field: "Accounting" }],
      lower: [{ level: "associate", degree: "AAS, Accounting", field: "Accounting" }],
      wrongField: [{ level: "bachelor", degree: "BS, Finance", field: "Finance" }],
      schools: ["DePaul University", "Loyola University Chicago", "University of Illinois Chicago", "Northern Illinois University", "Illinois State University"],
    },
    passiveSources: ["data_provider", "cpa_board"],
    activeJobTitle: "Senior Accountant",
  },
  {
    sampleId: "tax-manager-houston",
    family: "tax",
    city: "Houston",
    radius: 40,
    minYears: 7,
    currentMinYears: 2,
    titles: {
      lead: ["Tax Manager", "Senior Tax Manager"],
      mid: ["Tax Supervisor", "Senior Tax Accountant"],
      junior: ["Tax Associate", "Tax Staff Accountant"],
      adjacent: ["Senior Accountant (Tax & Treasury)", "Payroll Tax Specialist"],
      prev: ["Tax Senior", "Senior Tax Accountant"],
    },
    summaries: {
      lead: ["Manages corporate and partnership tax compliance (1120, 1065) and the ASC 740 provision; supervises 3 tax staff."],
      mid: ["Prepares 1120 and 1065 returns and quarterly tax provision workpapers; reviews staff work."],
      junior: ["Prepares individual and simple partnership tax returns."],
      adjacent: ["Sales & use tax filings and treasury support."],
      prev: ["Tax senior in public accounting: corporate and partnership tax returns for energy clients."],
    },
    employers: ["Bluebonnet Midstream", "Permian Basin Resources", "Gulfport Tax Advisors", "Whitfield & Crane LLP", "Lyndale Holdings", "San Jacinto Chemicals", "Bayport Refining", "Moreland Hayes CPAs"],
    cred: { code: "CPA", name: "Certified Public Accountant (CPA)", issuer: "Texas State Board of Public Accountancy", state: "TX", registry: "cpa_board", registryName: "Mock TX State Board of Public Accountancy", numberPrefix: "", digits: 6, validYears: 1, passiveSource: "cpa_board" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["Corporate tax (1120)", "Partnership tax (1065)", "ASC 740 tax provision"],
    niceSkills: ["Public accounting / Big 4", "Oil & gas industry", "OneSource"],
    baseSkills: ["Multistate tax (SALT)", "Tax research", "Advanced Excel"],
    edu: {
      meets: [{ level: "bachelor", degree: "BBA, Accounting", field: "Accounting" }],
      lower: [{ level: "associate", degree: "AAS, Accounting", field: "Accounting" }],
      nice: [{ level: "master", degree: "MS, Taxation (MST)", field: "Taxation" }],
      schools: ["University of Houston", "Texas A&M University", "Rice University", "University of Texas at Austin", "Sam Houston State University"],
    },
    schedule: { ok: ["Open to busy season extended hours", "Flexible, including busy season"], conflict: "Monday–Friday only, no overtime (weekdays)" },
    passiveSources: ["data_provider", "cpa_board"],
    activeJobTitle: "Tax Manager",
  },
  {
    sampleId: "paralegal-atlanta",
    family: "legal",
    city: "Atlanta",
    radius: 30,
    minYears: 3,
    currentMinYears: 2,
    titles: {
      lead: ["Senior Litigation Paralegal", "Litigation Paralegal"],
      mid: ["Litigation Paralegal", "Trial Paralegal"],
      junior: ["Legal Assistant", "Paralegal Intern"],
      adjacent: ["Corporate Paralegal", "Real Estate Paralegal"],
      prev: ["Litigation Paralegal", "Litigation Legal Assistant"],
    },
    summaries: {
      lead: ["Commercial litigation paralegal: Relativity reviews, e-filing via PACER/CM-ECF, trial binders and exhibits for 3 trials."],
      mid: ["Litigation support: discovery, e-filing in state and federal courts, deposition prep."],
      junior: ["Calendaring, filing and correspondence for a litigation group."],
      adjacent: ["Entity formation, closing sets and corporate minute books."],
      prev: ["Litigation paralegal: document productions and trial preparation."],
    },
    employers: ["Hartwell & Pike LLP", "Magnolia Row Law Group", "Dunmore Castell LLP", "Brightwater Legal", "Kessler Vance & Ortiz LLP", "Copper Hill Counsel", "Buckhead Trial Partners"],
    cred: { code: "NALA_CP", name: "NALA Certified Paralegal (CP)", issuer: "NALA – The Paralegal Association", registry: "association_directory", registryName: "Mock NALA Credential Directory", numberPrefix: "CP-", digits: 5, validYears: 5, passiveSource: "association_directory" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["E-discovery", "Relativity", "Court e-filing (PACER/CM-ECF)", "Trial preparation"],
    niceSkills: ["iManage", "Legal research", "Litigation"],
    baseSkills: ["Litigation", "Microsoft Office"],
    edu: {
      meets: [{ level: "certificate", degree: "Paralegal Certificate (ABA-approved)", field: "Paralegal Studies" }, { level: "bachelor", degree: "BA, Political Science", field: "Political Science" }],
      lower: [{ level: "high_school", degree: "High school diploma", field: "" }],
      schools: ["Georgia State University", "Kennesaw State University", "Emory University", "University of Georgia", "Clayton State University"],
    },
    niceLanguage: "Spanish",
    passiveSources: ["data_provider", "association_directory"],
    activeJobTitle: "Litigation Paralegal",
  },
  {
    sampleId: "attorney-charlotte",
    family: "legal",
    city: "Charlotte",
    radius: 40,
    minYears: 4,
    currentMinYears: 2,
    titles: {
      lead: ["Senior Associate Attorney, Corporate", "Corporate Associate Attorney"],
      mid: ["Corporate Associate Attorney", "Associate Attorney, M&A"],
      junior: ["Junior Associate Attorney", "Law Clerk"],
      adjacent: ["Litigation Associate Attorney", "Compliance Counsel"],
      prev: ["Associate Attorney, Corporate", "Corporate Associate"],
    },
    summaries: {
      lead: ["Corporate M&A: drafting and negotiating purchase agreements, leading due diligence for middle-market deals ($20M–$400M)."],
      mid: ["Corporate transactional work: M&A, drafting ancillary documents and due diligence."],
      junior: ["Research memos and diligence support."],
      adjacent: ["Commercial litigation and regulatory matters."],
      prev: ["Corporate associate at a large firm: private equity M&A and securities offerings."],
    },
    employers: ["Hartwell & Pike LLP", "Dunmore Castell LLP", "Piedmont Bancorp", "Sable Ridge Capital", "Queen City Partners LLP", "Catawba Legal Group", "Ashby Morrow LLP"],
    cred: { code: "BAR", name: "North Carolina State Bar", issuer: "North Carolina State Bar", state: "NC", registry: "bar_directory", registryName: "Mock NC State Bar Directory", numberPrefix: "", digits: 5, validYears: 1, wrongState: "SC", wrongIssuer: "South Carolina Bar", passiveSource: "bar_directory" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["Contract drafting & negotiation", "Due diligence"],
    niceSkills: ["Private equity / VC", "Securities", "AmLaw 200 firm experience"],
    baseSkills: ["M&A", "Legal research"],
    edu: {
      meets: [{ level: "jd", degree: "J.D.", field: "Law" }],
      lower: [{ level: "bachelor", degree: "BA, Political Science", field: "Political Science" }],
      nice: [{ level: "master", degree: "LL.M., Taxation", field: "Taxation" }],
      schools: ["Wake Forest University School of Law", "UNC School of Law", "Duke University School of Law", "Campbell Law School", "University of South Carolina School of Law"],
    },
    passiveSources: ["data_provider", "bar_directory"],
    activeJobTitle: "Corporate Associate Attorney",
  },
  {
    sampleId: "estimator-phoenix",
    family: "estimating",
    city: "Phoenix",
    radius: 40,
    minYears: 5,
    currentMinYears: 2,
    titles: {
      lead: ["Senior Estimator", "Senior Commercial Estimator", "Chief Estimator"],
      mid: ["Estimator", "Commercial Estimator"],
      junior: ["Assistant Estimator", "Project Coordinator"],
      adjacent: ["Residential Estimator", "Project Engineer"],
      prev: ["Estimator", "Commercial Estimator"],
    },
    summaries: {
      lead: ["Commercial estimating for K-12 and medical office projects ($5M–$60M): takeoffs, hard bids, subcontractor bid leveling."],
      mid: ["Commercial estimating: quantity takeoffs, bid packages, sub coverage."],
      junior: ["Supports estimators with plan rooms and bid invitations."],
      adjacent: ["Residential takeoffs and pricing for production homes."],
      prev: ["Commercial estimator: takeoffs from construction documents and hard bid preparation."],
    },
    employers: ["Saguaro Commercial Builders", "Red Rock Construction Group", "Arcadia Mechanical", "Canyon State Contractors", "Highmark Builders", "Sunbelt Interiors", "Camelback Constructors"],
    cred: { code: "CPE_ESTIMATOR", name: "ASPE Certified Professional Estimator (CPE)", issuer: "American Society of Professional Estimators", registry: "association_directory", registryName: "Mock ASPE Member Directory", numberPrefix: "CPE-", digits: 4, validYears: 3, passiveSource: "association_directory" },
    extraCreds: [],
    niceCreds: [],
    mustSkills: ["Bluebeam", "Blueprint reading", "Bid preparation", "Bid leveling"],
    niceSkills: ["ProEst", "MEP estimating", "Procore"],
    baseSkills: ["Quantity takeoff", "Value engineering"],
    edu: {
      meets: [{ level: "bachelor", degree: "BS, Construction Management", field: "Construction Management" }, { level: "bachelor", degree: "BS, Civil Engineering", field: "Engineering" }],
      lower: [{ level: "associate", degree: "AAS, Construction Technology", field: "Construction" }],
      schools: ["Arizona State University", "Northern Arizona University", "University of Arizona", "Phoenix College"],
    },
    physical: "Comfortable walking job sites and climbing ladders",
    niceLanguage: "Spanish",
    passiveSources: ["data_provider", "association_directory"],
    activeJobTitle: "Senior Construction Estimator",
  },
  {
    sampleId: "rn-icu-houston",
    family: "nursing",
    city: "Houston",
    radius: 30,
    minYears: 2,
    currentMinYears: 2,
    titles: {
      lead: ["ICU Registered Nurse", "Charge Nurse – MICU", "CVICU Registered Nurse"],
      mid: ["ICU Registered Nurse", "SICU Staff Nurse"],
      junior: ["Registered Nurse – Med/Surg", "New Graduate RN"],
      adjacent: ["Step-Down Unit RN", "Emergency Department RN"],
      prev: ["ICU Registered Nurse", "MICU Staff Nurse"],
    },
    summaries: {
      lead: ["MICU nurse, 1:2 ratio; ventilator management, vasoactive drip titration, CRRT. Epic charting."],
      mid: ["SICU nurse caring for post-surgical ICU patients; ventilators and drips."],
      junior: ["Med/surg nursing, 1:5 ratio."],
      adjacent: ["Progressive care / step-down nursing; telemetry."],
      prev: ["ICU nurse: critical care for ventilated patients."],
    },
    employers: ["Bayou General Hospital", "Gulf Coast Regional Hospital", "Riverbend Medical Center", "St. Brigid's Health", "Harris Crossing Hospital", "Lone Pine Medical Center", "Westchase Methodist Hospital"],
    cred: { code: "RN", name: "Registered Nurse (RN)", issuer: "Texas Board of Nursing", state: "TX", registry: "license_registry", registryName: "Mock Texas Board of Nursing License Verification", numberPrefix: "", digits: 6, validYears: 2, wrongState: "CA", wrongIssuer: "California Board of Registered Nursing", passiveSource: "license_registry" },
    extraCreds: [
      { code: "BLS", name: "BLS Provider", issuer: AHA, numberPrefix: "BLS-", digits: 7, validYears: 2 },
      { code: "ACLS", name: "ACLS Provider", issuer: AHA, numberPrefix: "ACLS-", digits: 7, validYears: 2 },
    ],
    niceCreds: [{ code: "CCRN", name: "CCRN (Adult)", issuer: "AACN Certification Corporation", numberPrefix: "CCRN-", digits: 6, validYears: 3 }],
    mustSkills: ["Ventilator management", "Vasoactive drip titration"],
    niceSkills: ["Epic EMR", "CRRT"],
    baseSkills: ["Critical care"],
    edu: {
      meets: [{ level: "bachelor", degree: "BSN", field: "Nursing" }, { level: "associate", degree: "ADN", field: "Nursing" }],
      lower: [{ level: "associate", degree: "ADN", field: "Nursing" }],
      schools: ["University of Texas Health Science Center", "Texas Woman's University", "Houston Community College", "Prairie View A&M University", "University of Houston"],
    },
    schedule: { ok: ["Nights, 12-hour shifts", "Open to any shift"], conflict: "Day shift only" },
    physical: "Can lift and reposition patients up to 50 lbs",
    niceLanguage: "Spanish",
    passiveSources: ["data_provider", "license_registry"],
    activeJobTitle: "Registered Nurse – ICU (Nights)",
  },
  {
    sampleId: "electrician-denver",
    family: "electrical",
    city: "Denver",
    radius: 35,
    minYears: 4,
    currentMinYears: 2,
    titles: {
      lead: ["Journeyman Electrician", "Lead Journeyman Electrician", "Electrical Foreman"],
      mid: ["Journeyman Electrician", "Commercial Electrician"],
      junior: ["Apprentice Electrician", "Electrical Helper"],
      adjacent: ["Residential Electrician", "Maintenance Electrician"],
      prev: ["Commercial Electrician", "Journeyman Electrician"],
    },
    summaries: {
      lead: ["Commercial electrical: conduit bending, commercial wiring, switchgear and panels on office and data center projects; NEC."],
      mid: ["Commercial electrical installs: EMT conduit, wiring, panels; works to NEC."],
      junior: ["Pulls wire and assists journeymen on residential jobs."],
      adjacent: ["Residential service calls and panel upgrades."],
      prev: ["Commercial electrical: tenant finish and conduit runs."],
    },
    employers: ["Mile High Electric", "Peak Power Contractors", "Summit Line Electric", "Foothills Electrical Services", "Cherry Creek Electric", "Platte Valley Electrical"],
    cred: { code: "JOURNEYMAN_ELECTRICIAN", name: "Journeyman Electrician", issuer: "Colorado State Electrical Board", state: "CO", registry: "license_registry", registryName: "Mock Colorado DORA License Lookup", numberPrefix: "JW.", digits: 7, validYears: 3, wrongState: "WY", wrongIssuer: "Wyoming Electrical Board", passiveSource: "license_registry" },
    extraCreds: [{ code: "OSHA_10", name: "OSHA 10-Hour Construction", issuer: "OSHA Outreach Training", numberPrefix: "OSHA10-", digits: 7, validYears: 20 }],
    niceCreds: [{ code: "OSHA_30", name: "OSHA 30-Hour Construction", issuer: "OSHA Outreach Training", numberPrefix: "OSHA30-", digits: 7, validYears: 20 }],
    mustSkills: ["Conduit bending", "Commercial wiring", "NEC code knowledge"],
    niceSkills: ["Switchgear & panels", "PLC / controls"],
    baseSkills: ["Electrical troubleshooting", "Blueprint reading"],
    edu: {
      meets: [{ level: "certificate", degree: "IBEW / IEC apprenticeship", field: "Electrical" }],
      lower: [{ level: "high_school", degree: "High school diploma", field: "" }],
      schools: ["IEC Rocky Mountain", "Red Rocks Community College", "Emily Griffith Technical College"],
    },
    schedule: { ok: ["Days, Monday–Friday, Saturdays OK", "Open to any shift"], conflict: "Nights only" },
    physical: "Can lift 50 lbs; works on ladders and lifts",
    passiveSources: ["data_provider", "license_registry"],
    activeJobTitle: "Journeyman Electrician – Commercial",
  },
  {
    sampleId: "hvac-austin",
    family: "hvac",
    city: "Austin",
    radius: 30,
    minYears: 3,
    currentMinYears: 2,
    titles: {
      lead: ["Lead HVAC Service Technician", "Senior HVAC Technician"],
      mid: ["HVAC Service Technician", "HVAC Technician II"],
      junior: ["HVAC Apprentice", "HVAC Installer Helper"],
      adjacent: ["Appliance Repair Technician", "Maintenance Technician"],
      prev: ["HVAC Technician", "HVAC Service Technician"],
    },
    summaries: {
      lead: ["Residential and light commercial HVAC service: heat pumps, split systems, rooftop units; refrigeration diagnostics."],
      mid: ["HVAC service calls: heat pumps and RTUs, refrigerant charging."],
      junior: ["Assists on HVAC installs; ductwork."],
      adjacent: ["Appliance and general building maintenance."],
      prev: ["HVAC service technician: residential systems and heat pumps."],
    },
    employers: ["Lone Star Air", "Capital Comfort HVAC", "Bluebonnet Heating & Air", "Pecan Valley Mechanical", "Hill Country Air Pros", "Balcones Mechanical"],
    cred: { code: "EPA_608", name: "EPA Section 608 Universal", issuer: "ESCO Institute (EPA-approved)", numberPrefix: "608-", digits: 8, validYears: 99 },
    extraCreds: [],
    niceCreds: [
      { code: "ACR_TECH", name: "ACR Technician Registration", issuer: "Texas Department of Licensing and Regulation", state: "TX", registry: "license_registry", registryName: "Mock TDLR License Search", numberPrefix: "ACR-T", digits: 6, validYears: 1, passiveSource: "license_registry" },
      { code: "NATE", name: "NATE Core + Heat Pump", issuer: "North American Technician Excellence", numberPrefix: "NATE-", digits: 6, validYears: 2 },
    ],
    mustSkills: ["Heat pumps", "Rooftop units (RTU)"],
    niceSkills: ["Building automation"],
    baseSkills: ["HVAC diagnostics", "Refrigeration"],
    edu: {
      meets: [{ level: "certificate", degree: "HVAC Technician Certificate", field: "HVAC" }],
      lower: [{ level: "high_school", degree: "High school diploma", field: "" }],
      schools: ["Austin Community College", "Texas State Technical College", "Lincoln Tech"],
    },
    schedule: { ok: ["Days, on-call rotation OK (weekends)", "Open to any shift, on call"], conflict: "Monday–Friday days only (weekdays)" },
    background: { ok: "Valid TX driver's license; clean driving record (0 violations)", bad: "3 moving violations and 1 at-fault accident in last 3 years" },
    niceLanguage: "Spanish",
    passiveSources: ["data_provider", "license_registry"],
    activeJobTitle: "HVAC Service Technician",
  },
  {
    sampleId: "cdl-san-antonio",
    family: "trucking",
    city: "San Antonio",
    radius: 50,
    minYears: 2,
    currentMinYears: 1,
    titles: {
      lead: ["CDL-A Regional Driver", "CDL-A Truck Driver", "Lead Driver / Trainer"],
      mid: ["CDL-A Truck Driver", "Tractor-Trailer Driver"],
      junior: ["CDL-B Delivery Driver", "Driver Trainee"],
      adjacent: ["Local Delivery Driver", "Yard Jockey"],
      prev: ["Tractor-Trailer Driver", "OTR Truck Driver"],
    },
    summaries: {
      lead: ["Regional tractor-trailer driver, dry van and reefer across TX/OK/LA; ELD, 0 preventable accidents."],
      mid: ["Tractor-trailer driver, regional dry van freight."],
      junior: ["Box truck deliveries, local routes."],
      adjacent: ["Local deliveries in a straight truck."],
      prev: ["OTR tractor-trailer driver, 48 states."],
    },
    employers: ["Mesquite Freight Lines", "Lonestar Haulers", "Riverwalk Transport", "Big Country Logistics", "Hondo Carriers", "Brush Country Trucking"],
    cred: { code: "CDL-A", name: "Commercial Driver's License – Class A", issuer: "Texas Department of Public Safety", state: "TX", registry: "license_registry", registryName: "Mock Texas DPS CDL Status Check", numberPrefix: "", digits: 8, validYears: 5, passiveSource: "license_registry" },
    extraCreds: [{ code: "DOT_MEDICAL", name: "DOT Medical Examiner's Certificate", issuer: "FMCSA National Registry examiner", numberPrefix: "MEC-", digits: 7, validYears: 2 }],
    niceCreds: [
      { code: "HAZMAT", name: "Hazmat (H) endorsement", issuer: "Texas Department of Public Safety", numberPrefix: "H-", digits: 6, validYears: 5 },
      { code: "TANKER", name: "Tanker (N) endorsement", issuer: "Texas Department of Public Safety", numberPrefix: "N-", digits: 6, validYears: 5 },
    ],
    mustSkills: [],
    niceSkills: ["Reefer", "ELD / hours of service"],
    baseSkills: ["Dry van", "Regional driving"],
    edu: {
      meets: [{ level: "high_school", degree: "High school diploma", field: "" }],
      lower: [{ level: "high_school", degree: "GED", field: "" }],
      schools: ["Alamo Colleges CDL Program", "Roadmaster Drivers School", "Sage Truck Driving School"],
    },
    schedule: { ok: ["Regional, home weekly", "Open to OTR or regional"], conflict: "Local only, home daily" },
    background: { ok: "Clean MVR: 0 violations in 3 years", bad: "DUI (2024) and 3 moving violations in 3 years" },
    passiveSources: ["data_provider", "license_registry"],
    activeJobTitle: "CDL-A Regional Truck Driver",
  },
  {
    sampleId: "backend-austin",
    family: "software",
    city: "Austin",
    radius: 40,
    minYears: 5,
    currentMinYears: 2,
    titles: {
      lead: ["Senior Backend Engineer", "Staff Software Engineer (Backend)"],
      mid: ["Backend Software Engineer", "Software Engineer II (Backend)"],
      junior: ["Software Engineer I", "Junior Developer"],
      adjacent: ["Frontend Engineer", "Data Engineer"],
      prev: ["Backend Software Engineer", "Software Engineer (Python)"],
    },
    summaries: {
      lead: ["Backend Python services (FastAPI) on AWS: REST APIs, microservices, PostgreSQL; leads platform team."],
      mid: ["Backend Python/Django APIs; PostgreSQL; Docker deployments."],
      junior: ["Bug fixes and small features in a Django monolith."],
      adjacent: ["React frontend and design systems."],
      prev: ["Backend software engineer building Python APIs."],
    },
    employers: ["Lattice Payments", "Quillstone Analytics", "Riverstack Cloud", "Fernway Health Tech", "Parcelbird", "Blue Mesa Software", "Tinroof Labs"],
    extraCreds: [],
    niceCreds: [{ code: "AWS_CERT", name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", numberPrefix: "AWS-", digits: 8, validYears: 3 }],
    mustSkills: ["Python", "FastAPI", "PostgreSQL", "REST APIs", "Microservices", "AWS", "Docker", "CI/CD"],
    niceSkills: ["Kubernetes", "Kafka", "Terraform", "Open-source contributions", "Fintech / payments"],
    baseSkills: ["Redis"],
    edu: {
      meets: [{ level: "bachelor", degree: "BS, Computer Science", field: "Computer Science" }],
      lower: [{ level: "certificate", degree: "Coding bootcamp certificate", field: "Software" }],
      schools: ["University of Texas at Austin", "Texas State University", "Texas A&M University", "Rice University"],
    },
    passiveSources: ["data_provider", "oss_portfolio"],
    activeJobTitle: "Senior Backend Engineer (Python)",
  },
];
