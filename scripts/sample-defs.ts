// Source of truth for the 11 sample JDs and their hand-checked cached extractions.
// `npm run generate` writes these to data/samples/*.json.
import type { ClarifyQuestion, Criterion, CriterionCategory, Family, RemovedRequirement, SampleJob } from "../lib/data/types";

const M = true;
const P = false;

function c(id: string, category: CriterionCategory, text: string, value: string, mandatory: boolean, quote: string): Criterion {
  return { id, category, text, value, mandatory, quote, origin: "extracted" };
}

function q(id: string, question: string, why: string, kind: ClarifyQuestion["kind"], targetId = "", category: CriterionCategory = "other"): ClarifyQuestion {
  return { id, question, why, kind, targetId, category };
}

function removed(quote: string, trait: string, reason: string): RemovedRequirement {
  return { quote, trait, reason };
}

function sample(
  s: Omit<SampleJob, "extraction" | "employmentType"> & { employmentType?: string },
  family: Family,
  criteria: Criterion[],
  removedList: RemovedRequirement[],
  questions: ClarifyQuestion[],
): SampleJob {
  return {
    employmentType: "Full-time",
    ...s,
    jd: s.jd.trim(),
    extraction: { family, criteria, removed: removedList, questions },
  };
}

export const SAMPLES: SampleJob[] = [
  // ---------------------------------------------------------------- MAIN
  sample(
    {
      sampleId: "controller-dallas",
      group: "main",
      label: "Controller",
      client: "Lone Star Freight Holdings",
      title: "Controller",
      location: "Dallas, TX",
      payRange: "$150,000 – $175,000 + 15% bonus",
      jd: `
Lone Star Freight Holdings is a fast-growing, PE-backed logistics company with 6 legal entities and $320M in annual revenue. We are hiring a Controller to own accounting operations and report directly to the CFO.

What you'll do
- Lead the monthly close and deliver accurate financial statements within 8 business days.
- Own multi-entity consolidation and intercompany eliminations.
- Manage a team of 5 (2 senior accountants, 2 staff accountants, 1 AP specialist).
- Coordinate the annual external audit and maintain internal controls.
- Partner with FP&A on budgeting and forecasting.

Requirements
- Active CPA license (Texas, or any U.S. state with practice mobility).
- 8+ years of progressive accounting experience.
- At least 3 years managing accounting teams.
- Hands-on month-end close and consolidation experience under US GAAP.
- Strong ERP skills: NetSuite or SAP.
- Bachelor's degree in Accounting or Finance.
- Must be able to work on-site in Dallas at least 3 days per week (hybrid).

Nice to have
- Public accounting (Big 4) audit background.
- Experience with ASC 606 revenue recognition.
- Power BI or advanced Excel reporting.
- MBA.

Other
- We prefer candidates under 45 who can grow with the company long term.
`,
    },
    "accounting",
    [
      c("c1", "license", "Active CPA license (Texas, or any U.S. state with practice mobility)", "CPA", M, "Active CPA license (Texas, or any U.S. state with practice mobility)"),
      c("c2", "experience", "8+ years of progressive accounting experience", "8", M, "8+ years of progressive accounting experience"),
      c("c3", "experience", "3+ years managing accounting teams", "3", M, "At least 3 years managing accounting teams"),
      c("c4", "skill", "Month-end close and consolidation", "", M, "Hands-on month-end close and consolidation experience under US GAAP"),
      c("c5", "tools", "ERP: NetSuite or SAP", "", M, "Strong ERP skills: NetSuite or SAP"),
      c("c6", "education", "Bachelor's degree in Accounting or Finance", "bachelor", M, "Bachelor's degree in Accounting or Finance"),
      c("c7", "location", "On-site in Dallas 3 days/week (hybrid), within 35 miles", "35", M, "Must be able to work on-site in Dallas at least 3 days per week (hybrid)"),
      c("c8", "skill", "Public accounting (Big 4) audit background", "", P, "Public accounting (Big 4) audit background"),
      c("c9", "skill", "ASC 606 revenue recognition", "", P, "Experience with ASC 606 revenue recognition"),
      c("c10", "tools", "Power BI or advanced Excel reporting", "", P, "Power BI or advanced Excel reporting"),
      c("c11", "education", "MBA", "master", P, "MBA"),
    ],
    [removed("We prefer candidates under 45 who can grow with the company long term", "Age", "An age preference is not a lawful requirement (ADEA protects workers 40+). It was not used for matching.")],
    [
      q("q1", "Is an active CPA license required on day one, or is CPA-eligible acceptable?", "Decides whether strong candidates still sitting for the exam are blocked.", "toggle_mandatory", "c1"),
      q("q2", "What commute radius should we search for the 3-day on-site requirement?", "The JD doesn't state a radius; we assumed 35 miles.", "set_value", "c7"),
      q("q3", "Is relocation assistance available for out-of-area candidates?", "Several strong passive candidates live outside the Dallas area.", "add_criterion", "", "location"),
      q("q4", "Is Big 4 / public accounting experience a must-have or a nice-to-have?", "Listed as nice-to-have, but clients often screen on it.", "toggle_mandatory", "c8"),
      q("q5", "Are extended hours expected during quarter-end close or the audit?", "Not stated; affects candidates who need fixed hours.", "add_criterion", "", "schedule"),
    ],
  ),
  sample(
    {
      sampleId: "senior-accountant-chicago",
      group: "main",
      label: "Senior Accountant",
      client: "Lakeshore Health Partners",
      title: "Senior Accountant",
      location: "Chicago, IL 60603",
      payRange: "$85,000 – $100,000",
      jd: `
Lakeshore Health Partners operates 14 outpatient clinics across Chicagoland. Our corporate accounting team is looking for a Senior Accountant to own key parts of the close.

Responsibilities
- Prepare journal entries, balance sheet reconciliations and monthly financial statements.
- Support the annual audit and quarterly reviews.
- Maintain fixed asset and prepaid schedules.
- Help improve close processes and documentation.

Requirements
- Bachelor's degree in Accounting.
- 4+ years of accounting experience, including general ledger and account reconciliations.
- Advanced Excel (pivot tables, XLOOKUP).
- Based within commuting distance of our Chicago Loop office (hybrid, 2 days remote).
- Must be a native English speaker.

Preferred
- CPA or CPA candidate.
- NetSuite experience.
- Public accounting experience.
- Healthcare industry background.
`,
    },
    "accounting",
    [
      c("c1", "education", "Bachelor's degree in Accounting", "bachelor", M, "Bachelor's degree in Accounting"),
      c("c2", "experience", "4+ years of accounting experience", "4", M, "4+ years of accounting experience"),
      c("c3", "skill", "General ledger and account reconciliations", "", M, "including general ledger and account reconciliations"),
      c("c4", "skill", "Monthly financial statements preparation", "", M, "Prepare journal entries, balance sheet reconciliations and monthly financial statements"),
      c("c5", "tools", "Advanced Excel (pivot tables, XLOOKUP)", "", M, "Advanced Excel (pivot tables, XLOOKUP)"),
      c("c6", "location", "Commutable to the Chicago Loop office, within 30 miles (hybrid)", "30", M, "Based within commuting distance of our Chicago Loop office (hybrid, 2 days remote)"),
      c("c7", "license", "CPA or CPA candidate", "CPA", P, "CPA or CPA candidate"),
      c("c8", "tools", "NetSuite", "", P, "NetSuite experience"),
      c("c9", "skill", "Public accounting experience", "", P, "Public accounting experience"),
      c("c10", "other", "Healthcare industry background", "", P, "Healthcare industry background"),
    ],
    [removed("Must be a native English speaker", "National origin", "\"Native speaker\" requirements can discriminate on national origin (Title VII). If English fluency matters, state the level of proficiency needed instead.")],
    [
      q("q1", "Is the CPA truly optional, or expected within 12–18 months?", "Changes how CPA candidates rank against non-CPAs.", "toggle_mandatory", "c7"),
      q("q2", "Would a Finance degree with accounting coursework be accepted?", "Several experienced candidates hold Finance degrees.", "set_value", "c1"),
      q("q3", "Is overtime expected during month-end close?", "Not stated in the JD.", "add_criterion", "", "schedule"),
      q("q4", "What level of English proficiency does the role actually need?", "Replaces the removed \"native speaker\" line with a lawful, job-related requirement.", "add_criterion", "", "language"),
    ],
  ),
  sample(
    {
      sampleId: "tax-manager-houston",
      group: "main",
      label: "Tax Manager",
      client: "Gulf Coast Energy Partners",
      title: "Tax Manager",
      location: "Houston, TX",
      payRange: "$140,000 – $165,000",
      jd: `
Gulf Coast Energy Partners is a midstream energy company with operations in Texas, Louisiana and New Mexico. We are adding a Tax Manager to our corporate tax group.

Responsibilities
- Manage federal and state compliance for corporate and partnership entities.
- Prepare the quarterly and annual income tax provision.
- Supervise two tax seniors and coordinate with outside advisors.
- Support audits and tax research on new transactions.

Requirements
- Active CPA license.
- 7+ years of tax experience, including at least 2 years supervising staff.
- Expertise in corporate (Form 1120) and partnership (Form 1065) tax compliance.
- ASC 740 income tax provision experience.
- Located in the Houston area (within 40 miles); on-site 4 days per week.
- Available for extended hours during busy season (Feb–Apr, Aug–Oct).

Preferred
- Big 4 or regional public accounting firm experience.
- Master's in Taxation (MST).
- Oil & gas industry experience.
- CCH Axcess or OneSource.

This role suits a young, high-energy professional.
`,
    },
    "tax",
    [
      c("c1", "license", "Active CPA license", "CPA", M, "Active CPA license"),
      c("c2", "experience", "7+ years of tax experience", "7", M, "7+ years of tax experience"),
      c("c3", "skill", "Corporate (Form 1120) and partnership (Form 1065) tax compliance", "", M, "Expertise in corporate (Form 1120) and partnership (Form 1065) tax compliance"),
      c("c4", "skill", "ASC 740 income tax provision", "", M, "ASC 740 income tax provision experience"),
      c("c5", "location", "Houston area, within 40 miles (on-site 4 days/week)", "40", M, "Located in the Houston area (within 40 miles)"),
      c("c6", "schedule", "Extended hours during busy season", "", M, "Available for extended hours during busy season (Feb–Apr, Aug–Oct)"),
      c("c7", "experience", "2+ years supervising tax staff", "2", P, "including at least 2 years supervising staff"),
      c("c8", "skill", "Big 4 or regional public accounting experience", "", P, "Big 4 or regional public accounting firm experience"),
      c("c9", "education", "Master's in Taxation (MST)", "master", P, "Master's in Taxation (MST)"),
      c("c10", "skill", "Oil & gas industry experience", "", P, "Oil & gas industry experience"),
      c("c11", "tools", "CCH Axcess or OneSource", "", P, "CCH Axcess or OneSource"),
    ],
    [removed("This role suits a young, high-energy professional.", "Age", "\"Young\" is an age preference (ADEA). Describe the work instead, e.g. \"comfortable with busy-season workloads\".")],
    [
      q("q1", "Would an Enrolled Agent (EA) be considered in place of a CPA?", "EAs are common in partnership tax; the CPA is currently a hard requirement.", "set_value", "c1"),
      q("q2", "Are the 2 years of supervising staff a must-have?", "Extracted as preferred because it sits inside the experience line.", "toggle_mandatory", "c7"),
      q("q3", "Is remote work possible outside busy season?", "Affects candidates outside the 40-mile radius.", "add_criterion", "", "schedule"),
      q("q4", "Is there flexibility above $165K for Big 4 managers?", "Big 4 tax managers in Houston often expect more.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "paralegal-atlanta",
      group: "main",
      label: "Litigation Paralegal",
      client: "Peachtree Litigation Group LLP",
      title: "Litigation Paralegal",
      location: "Atlanta, GA 30309",
      payRange: "$65,000 – $80,000",
      jd: `
Peachtree Litigation Group LLP is a 40-attorney commercial litigation firm in Midtown Atlanta. We are hiring an experienced Litigation Paralegal to support two trial teams.

Responsibilities
- Manage document productions and review databases.
- Draft discovery requests, subpoenas and correspondence.
- Prepare for depositions, hearings and trial.
- Maintain case calendars and court deadlines.

Requirements
- 3+ years of experience as a litigation paralegal.
- Paralegal certificate (ABA-approved program) or a bachelor's degree.
- E-discovery experience with Relativity.
- E-filing in state and federal courts (PACER / CM/ECF).
- Trial preparation: exhibits, trial binders and witness files.
- Work on-site at our Midtown Atlanta office (within 30 miles).

Preferred
- NALA Certified Paralegal (CP) credential.
- Bilingual English/Spanish.
- Experience with iManage or Clio.
- Legal research using Westlaw.

Female candidates preferred to balance the team.
`,
    },
    "legal",
    [
      c("c1", "experience", "3+ years as a litigation paralegal", "3", M, "3+ years of experience as a litigation paralegal"),
      c("c2", "education", "Paralegal certificate or bachelor's degree", "certificate", M, "Paralegal certificate (ABA-approved program) or a bachelor's degree"),
      c("c3", "tools", "E-discovery with Relativity", "", M, "E-discovery experience with Relativity"),
      c("c4", "skill", "Court e-filing (PACER / CM/ECF)", "", M, "E-filing in state and federal courts (PACER / CM/ECF)"),
      c("c5", "skill", "Trial preparation (exhibits, trial binders)", "", M, "Trial preparation: exhibits, trial binders and witness files"),
      c("c6", "location", "On-site in Midtown Atlanta, within 30 miles", "30", M, "Work on-site at our Midtown Atlanta office (within 30 miles)"),
      c("c7", "license", "NALA Certified Paralegal (CP)", "NALA_CP", P, "NALA Certified Paralegal (CP) credential"),
      c("c8", "language", "Bilingual English/Spanish", "Spanish", P, "Bilingual English/Spanish"),
      c("c9", "tools", "iManage or Clio", "", P, "Experience with iManage or Clio"),
      c("c10", "skill", "Legal research (Westlaw)", "", P, "Legal research using Westlaw"),
    ],
    [removed("Female candidates preferred to balance the team.", "Sex / gender", "A gender preference is sex discrimination under Title VII. It was not used for matching.")],
    [
      q("q1", "Is overtime expected in the weeks before trial?", "Common for litigation teams; not stated.", "add_criterion", "", "schedule"),
      q("q2", "Is the NALA CP needed for client billing rates?", "Some clients only bill certified paralegals at the senior rate.", "toggle_mandatory", "c7"),
      q("q3", "Would 2 years of litigation experience plus a certificate be considered?", "Opens the pool to strong junior paralegals.", "set_value", "c1"),
      q("q4", "Is there flexibility above $80K for senior paralegals?", "Top candidates in Midtown are at $78–85K.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "attorney-charlotte",
      group: "main",
      label: "Corporate Attorney",
      client: "Carolina Ridge Law LLP",
      title: "Corporate Associate Attorney (M&A)",
      location: "Charlotte, NC",
      payRange: "$185,000 – $225,000",
      jd: `
Carolina Ridge Law LLP is a growing middle-market corporate firm. Our M&A practice is hiring a mid-level Corporate Associate.

What you'll do
- Run buy-side and sell-side M&A deals from LOI to closing.
- Draft purchase agreements, disclosure schedules and closing sets.
- Lead diligence teams and coordinate with specialist practice groups.
- Advise private companies on governance and financing.

Requirements
- J.D. from an ABA-accredited law school.
- Admitted to the North Carolina State Bar and in good standing.
- 4+ years of corporate transactional experience, ideally M&A.
- Drafting and negotiating purchase agreements, disclosure schedules and ancillary documents.
- Leading due diligence workstreams.
- Based in Charlotte, NC (hybrid, within 40 miles).

Preferred
- Private equity or venture capital transactions.
- Securities offerings experience.
- Large-firm (AmLaw 200) training.
- LL.M. in Taxation or Securities.

Must be a practicing Christian to fit our firm culture.
`,
    },
    "legal",
    [
      c("c1", "education", "J.D. from an ABA-accredited law school", "jd", M, "J.D. from an ABA-accredited law school"),
      c("c2", "license", "Admitted to the North Carolina State Bar, in good standing", "BAR", M, "Admitted to the North Carolina State Bar and in good standing"),
      c("c3", "experience", "4+ years of corporate transactional (M&A) experience", "4", M, "4+ years of corporate transactional experience, ideally M&A"),
      c("c4", "skill", "Drafting and negotiating purchase agreements", "", M, "Drafting and negotiating purchase agreements, disclosure schedules and ancillary documents"),
      c("c5", "skill", "Leading due diligence", "", M, "Leading due diligence workstreams"),
      c("c6", "location", "Charlotte, NC (hybrid), within 40 miles", "40", M, "Based in Charlotte, NC (hybrid, within 40 miles)"),
      c("c7", "skill", "Private equity or venture capital transactions", "", P, "Private equity or venture capital transactions"),
      c("c8", "skill", "Securities offerings", "", P, "Securities offerings experience"),
      c("c9", "other", "Large-firm (AmLaw 200) training", "", P, "Large-firm (AmLaw 200) training"),
      c("c10", "education", "LL.M. in Taxation or Securities", "master", P, "LL.M. in Taxation or Securities"),
    ],
    [removed("Must be a practicing Christian to fit our firm culture.", "Religion", "A religious requirement is religious discrimination under Title VII. It was not used for matching.")],
    [
      q("q1", "Will you consider attorneys admitted in another state who can be admitted in NC within 6 months?", "Strong SC- and VA-admitted associates live in the Charlotte area.", "toggle_mandatory", "c2"),
      q("q2", "Is M&A specifically required, or is general corporate work (financing, governance) acceptable?", "Narrows or widens the experience match.", "set_value", "c3"),
      q("q3", "What is the annual billable-hour target?", "Candidates moving from large firms often ask first.", "add_criterion", "", "schedule"),
      q("q4", "How many days per week are in the office?", "\"Hybrid\" isn't defined.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "estimator-phoenix",
      group: "main",
      label: "Construction Estimator",
      client: "Desert Peak Builders",
      title: "Senior Construction Estimator",
      location: "Phoenix, AZ",
      payRange: "$95,000 – $120,000",
      jd: `
Desert Peak Builders is a commercial general contractor building schools, medical offices and light industrial projects across the Valley.

What you'll do
- Own estimates from conceptual budgets through hard bid.
- Build detailed quantity takeoffs and cost models.
- Solicit, review and level subcontractor bids.
- Present bid strategy and assumptions to leadership.

Requirements
- 5+ years of commercial construction estimating experience.
- Perform takeoffs using Bluebeam Revu or On-Screen Takeoff.
- Read and interpret blueprints, plans and specifications.
- Prepare hard bid and negotiated bid packages for commercial projects from $5M to $50M.
- Solicit and level subcontractor bids.
- Live within 40 miles of Phoenix; occasional job site visits across the Valley.

Preferred
- ASPE Certified Professional Estimator (CPE).
- Bachelor's degree in Construction Management or Engineering.
- Experience with ProEst or Sage Estimating.
- Bilingual English/Spanish.
- Able to walk active job sites and climb ladders during site visits.

Single candidates preferred because of the travel schedule.
`,
    },
    "estimating",
    [
      c("c1", "experience", "5+ years of commercial construction estimating", "5", M, "5+ years of commercial construction estimating experience"),
      c("c2", "tools", "Takeoff software: Bluebeam Revu or On-Screen Takeoff", "", M, "Perform takeoffs using Bluebeam Revu or On-Screen Takeoff"),
      c("c3", "skill", "Blueprint and specification reading", "", M, "Read and interpret blueprints, plans and specifications"),
      c("c4", "skill", "Hard bid and negotiated bid packages ($5M–$50M commercial)", "", M, "Prepare hard bid and negotiated bid packages for commercial projects from $5M to $50M"),
      c("c5", "skill", "Subcontractor bid leveling", "", M, "Solicit and level subcontractor bids"),
      c("c6", "location", "Within 40 miles of Phoenix", "40", M, "Live within 40 miles of Phoenix"),
      c("c7", "license", "ASPE Certified Professional Estimator (CPE)", "CPE_ESTIMATOR", P, "ASPE Certified Professional Estimator (CPE)"),
      c("c8", "education", "Bachelor's in Construction Management or Engineering", "bachelor", P, "Bachelor's degree in Construction Management or Engineering"),
      c("c9", "tools", "ProEst or Sage Estimating", "", P, "Experience with ProEst or Sage Estimating"),
      c("c10", "language", "Bilingual English/Spanish", "Spanish", P, "Bilingual English/Spanish"),
      c("c11", "physical", "Walk active job sites and climb ladders", "", P, "Able to walk active job sites and climb ladders during site visits"),
    ],
    [removed("Single candidates preferred because of the travel schedule.", "Marital status", "Marital status is protected in many states and is not job-related. Describe the travel instead.")],
    [
      q("q1", "How much travel is expected: Valley job sites only, or out of state?", "Replaces the removed marital-status line with the real job requirement.", "add_criterion", "", "schedule"),
      q("q2", "Is Bluebeam specifically required, or is any digital takeoff tool fine?", "Some strong estimators use PlanSwift or STACK.", "set_value", "c2"),
      q("q3", "Will the estimator cover self-performed trades, or subcontracted scopes only?", "Changes which estimating background fits best.", "info"),
      q("q4", "Is the ASPE CPE expected within a set timeframe?", "Currently preferred only.", "toggle_mandatory", "c7"),
    ],
  ),
  // ---------------------------------------------------------------- OTHER INDUSTRIES
  sample(
    {
      sampleId: "rn-icu-houston",
      group: "other",
      label: "ICU Registered Nurse",
      client: "Bayou City Medical Center",
      title: "Registered Nurse – ICU (Nights)",
      location: "Houston, TX 77030",
      payRange: "$48 – $62 / hour + night differential",
      jd: `
Bayou City Medical Center is a 600-bed teaching hospital in the Texas Medical Center. Our 32-bed Medical ICU is hiring night-shift Registered Nurses.

Requirements
- Active Texas RN license or multistate (compact) RN license.
- 2+ years of recent ICU nursing experience (MICU, SICU or CVICU).
- Current BLS and ACLS certifications.
- Experience with ventilator management and vasoactive drip titration.
- Able to work 12-hour night shifts, including every third weekend.
- Live within 30 miles of the Texas Medical Center.

Preferred
- CCRN certification.
- BSN degree.
- Epic EMR experience.
- CRRT experience.
- Bilingual English/Spanish.
- Ability to lift and reposition patients up to 50 lbs.

Not suitable for pregnant applicants due to physical demands.
`,
    },
    "nursing",
    [
      c("c1", "license", "Active Texas or multistate (compact) RN license", "RN", M, "Active Texas RN license or multistate (compact) RN license"),
      c("c2", "experience", "2+ years of recent ICU nursing experience", "2", M, "2+ years of recent ICU nursing experience (MICU, SICU or CVICU)"),
      c("c3", "license", "Current BLS and ACLS", "BLS, ACLS", M, "Current BLS and ACLS certifications"),
      c("c4", "skill", "Ventilator management and vasoactive drip titration", "", M, "Experience with ventilator management and vasoactive drip titration"),
      c("c5", "schedule", "12-hour night shifts, every third weekend", "", M, "Able to work 12-hour night shifts, including every third weekend"),
      c("c6", "location", "Within 30 miles of the Texas Medical Center", "30", M, "Live within 30 miles of the Texas Medical Center"),
      c("c7", "license", "CCRN certification", "CCRN", P, "CCRN certification"),
      c("c8", "education", "BSN degree", "bachelor", P, "BSN degree"),
      c("c9", "tools", "Epic EMR", "", P, "Epic EMR experience"),
      c("c10", "skill", "CRRT experience", "", P, "CRRT experience"),
      c("c11", "language", "Bilingual English/Spanish", "Spanish", P, "Bilingual English/Spanish"),
      c("c12", "physical", "Lift and reposition patients up to 50 lbs", "50", P, "Ability to lift and reposition patients up to 50 lbs"),
    ],
    [removed("Not suitable for pregnant applicants due to physical demands.", "Pregnancy", "Excluding pregnant applicants violates the Pregnancy Discrimination Act. Physical demands are listed as job requirements instead.")],
    [
      q("q1", "Do you accept compact licenses from any NLC state, or Texas only?", "Several strong nurses hold multistate licenses from other states.", "set_value", "c1"),
      q("q2", "Must the CCRN be obtained within 12 months of hire?", "Currently preferred.", "toggle_mandatory", "c7"),
      q("q3", "Are travel / contract nurses acceptable for this opening?", "Widens the active pool considerably.", "info"),
      q("q4", "Is there a sign-on bonus or relocation package?", "Helps convert passive ICU nurses.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "electrician-denver",
      group: "other",
      label: "Journeyman Electrician",
      client: "Front Range Electric Co.",
      title: "Journeyman Electrician – Commercial",
      location: "Denver, CO",
      payRange: "$36 – $44 / hour",
      jd: `
Front Range Electric Co. is a union-scale commercial electrical contractor working on offices, schools and data centers along the Front Range.

Requirements
- Active Colorado Journeyman Electrician license.
- 4+ years of commercial electrical experience.
- Conduit bending (EMT, rigid) and commercial wiring.
- Strong working knowledge of the NEC.
- OSHA 10 card.
- Reliable transportation; job sites within 35 miles of Denver.

Preferred
- OSHA 30.
- Switchgear and panel installation.
- PLC / controls experience.
- Monday–Friday, 6:30am–3pm; occasional Saturdays.
- Lift 50 lbs and work on ladders and lifts.

Applicants over 50 need not apply.
`,
    },
    "electrical",
    [
      c("c1", "license", "Active Colorado Journeyman Electrician license", "JOURNEYMAN_ELECTRICIAN", M, "Active Colorado Journeyman Electrician license"),
      c("c2", "experience", "4+ years of commercial electrical experience", "4", M, "4+ years of commercial electrical experience"),
      c("c3", "skill", "Conduit bending and commercial wiring", "", M, "Conduit bending (EMT, rigid) and commercial wiring"),
      c("c4", "skill", "NEC code knowledge", "", M, "Strong working knowledge of the NEC"),
      c("c5", "license", "OSHA 10 card", "OSHA_10", M, "OSHA 10 card"),
      c("c6", "location", "Job sites within 35 miles of Denver", "35", M, "job sites within 35 miles of Denver"),
      c("c7", "license", "OSHA 30", "OSHA_30", P, "OSHA 30"),
      c("c8", "skill", "Switchgear and panel installation", "", P, "Switchgear and panel installation"),
      c("c9", "skill", "PLC / controls", "", P, "PLC / controls experience"),
      c("c10", "schedule", "Monday–Friday days, occasional Saturdays", "", P, "Monday–Friday, 6:30am–3pm; occasional Saturdays"),
      c("c11", "physical", "Lift 50 lbs, work on ladders and lifts", "50", P, "Lift 50 lbs and work on ladders and lifts"),
    ],
    [removed("Applicants over 50 need not apply.", "Age", "Excluding applicants over 50 violates the ADEA. It was not used for matching.")],
    [
      q("q1", "Is the Colorado license required on day one, or can out-of-state journeymen apply by reciprocity?", "Wyoming and Texas journeymen are in the pool.", "toggle_mandatory", "c1"),
      q("q2", "Are prevailing-wage or union job sites involved?", "Affects pay expectations.", "info"),
      q("q3", "Is a company vehicle provided?", "\"Reliable transportation\" may exclude some candidates.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "hvac-austin",
      group: "other",
      label: "HVAC Technician",
      client: "Hill Country Comfort Systems",
      title: "HVAC Service Technician",
      location: "Austin, TX",
      payRange: "$28 – $38 / hour + on-call pay",
      jd: `
Hill Country Comfort Systems services residential and light commercial HVAC systems across Central Texas.

Requirements
- EPA Section 608 Universal certification.
- 3+ years of HVAC service experience, residential and light commercial.
- Diagnose and repair heat pumps, split systems and rooftop units.
- Participate in an on-call rotation (one weekend per month).
- Valid driver's license and a clean driving record.
- Service area within 30 miles of Austin.

Preferred
- Texas ACR Technician registration (TDLR).
- NATE certification.
- Building automation (BAS) experience.
- Bilingual English/Spanish.
`,
    },
    "hvac",
    [
      c("c1", "license", "EPA Section 608 Universal certification", "EPA_608", M, "EPA Section 608 Universal certification"),
      c("c2", "experience", "3+ years of HVAC service experience", "3", M, "3+ years of HVAC service experience, residential and light commercial"),
      c("c3", "skill", "Heat pumps and rooftop units", "", M, "Diagnose and repair heat pumps, split systems and rooftop units"),
      c("c4", "schedule", "On-call rotation, one weekend per month", "", M, "Participate in an on-call rotation (one weekend per month)"),
      c("c5", "background", "Valid driver's license and clean driving record", "", M, "Valid driver's license and a clean driving record"),
      c("c6", "location", "Service area within 30 miles of Austin", "30", M, "Service area within 30 miles of Austin"),
      c("c7", "license", "Texas ACR Technician registration (TDLR)", "ACR_TECH", P, "Texas ACR Technician registration (TDLR)"),
      c("c8", "license", "NATE certification", "NATE", P, "NATE certification"),
      c("c9", "skill", "Building automation (BAS)", "", P, "Building automation (BAS) experience"),
      c("c10", "language", "Bilingual English/Spanish", "Spanish", P, "Bilingual English/Spanish"),
    ],
    [],
    [
      q("q1", "Is a company truck provided for on-call?", "Affects the driving-record requirement.", "info"),
      q("q2", "Is the TDLR registration required on day one?", "Texas requires registration to perform HVAC work; the JD lists it as preferred.", "toggle_mandatory", "c7"),
      q("q3", "Is there a tool allowance?", "Common question from experienced techs.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "cdl-san-antonio",
      group: "other",
      label: "CDL-A Truck Driver",
      client: "Alamo Regional Freight",
      title: "CDL-A Regional Truck Driver",
      location: "San Antonio, TX",
      payRange: "$1,350 – $1,650 / week",
      jd: `
Alamo Regional Freight runs dry van and reefer freight across Texas, Oklahoma and Louisiana.

Requirements
- Valid Class A CDL (CDL-A).
- 2+ years of verifiable tractor-trailer driving experience.
- Clean MVR: no more than 2 moving violations in 3 years, no DUI.
- Current DOT medical card.
- Regional routes, home weekly (out 5–6 days).
- Must live within 50 miles of our San Antonio terminal.

Preferred
- Hazmat and tanker endorsements.
- Reefer experience.
- ELD / hours-of-service experience.

Must be a U.S.-born citizen.
`,
    },
    "trucking",
    [
      c("c1", "license", "Valid Class A CDL", "CDL-A", M, "Valid Class A CDL (CDL-A)"),
      c("c2", "experience", "2+ years of tractor-trailer driving", "2", M, "2+ years of verifiable tractor-trailer driving experience"),
      c("c3", "background", "Clean MVR (≤2 moving violations in 3 years, no DUI)", "", M, "Clean MVR: no more than 2 moving violations in 3 years, no DUI"),
      c("c4", "license", "Current DOT medical card", "DOT_MEDICAL", M, "Current DOT medical card"),
      c("c5", "schedule", "Regional routes, home weekly", "", M, "Regional routes, home weekly (out 5–6 days)"),
      c("c6", "location", "Within 50 miles of the San Antonio terminal", "50", M, "Must live within 50 miles of our San Antonio terminal"),
      c("c7", "license", "Hazmat and tanker endorsements", "HAZMAT, TANKER", P, "Hazmat and tanker endorsements"),
      c("c8", "skill", "Reefer experience", "", P, "Reefer experience"),
      c("c9", "skill", "ELD / hours-of-service", "", P, "ELD / hours-of-service experience"),
    ],
    [removed("Must be a U.S.-born citizen.", "National origin / citizenship", "Requiring U.S. birth discriminates on national origin. Work authorization can be required; place of birth cannot.")],
    [
      q("q1", "Is the 2-year experience minimum firm, or will you take CDL school grads with 1 year?", "Insurance requirements often decide this.", "set_value", "c2"),
      q("q2", "Are hazmat endorsements needed on day one for any lanes?", "Currently preferred.", "toggle_mandatory", "c7"),
      q("q3", "Is there a sign-on bonus?", "Common in regional driver hiring.", "info"),
    ],
  ),
  sample(
    {
      sampleId: "backend-austin",
      group: "other",
      label: "Senior Backend Engineer",
      client: "Cobalt Ledger Inc.",
      title: "Senior Backend Engineer (Python)",
      location: "Austin, TX 78701",
      payRange: "$165,000 – $195,000 + equity",
      jd: `
Cobalt Ledger builds reconciliation software for mid-market finance teams. We're hiring a Senior Backend Engineer for our payments platform team.

Requirements
- 5+ years of professional backend software engineering experience.
- Expert Python.
- Production experience with FastAPI or Django.
- PostgreSQL schema design and query tuning.
- Building REST APIs and microservices on AWS.
- Docker and CI/CD pipelines.
- Hybrid in Austin (2 days/week in office), within 40 miles.

Preferred
- Kubernetes.
- Kafka or other event streaming.
- Terraform.
- Open-source contributions.
- Fintech or payments experience.

We are looking for digital natives.
`,
    },
    "software",
    [
      c("c1", "experience", "5+ years of backend software engineering", "5", M, "5+ years of professional backend software engineering experience"),
      c("c2", "skill", "Expert Python", "", M, "Expert Python"),
      c("c3", "tools", "FastAPI or Django", "", M, "Production experience with FastAPI or Django"),
      c("c4", "tools", "PostgreSQL", "", M, "PostgreSQL schema design and query tuning"),
      c("c5", "skill", "REST APIs and microservices on AWS", "", M, "Building REST APIs and microservices on AWS"),
      c("c6", "tools", "Docker and CI/CD", "", M, "Docker and CI/CD pipelines"),
      c("c7", "location", "Hybrid in Austin, within 40 miles", "40", M, "Hybrid in Austin (2 days/week in office), within 40 miles"),
      c("c8", "tools", "Kubernetes", "", P, "Kubernetes"),
      c("c9", "tools", "Kafka", "", P, "Kafka or other event streaming"),
      c("c10", "tools", "Terraform", "", P, "Terraform"),
      c("c11", "other", "Open-source contributions", "", P, "Open-source contributions"),
      c("c12", "other", "Fintech or payments experience", "", P, "Fintech or payments experience"),
    ],
    [removed("We are looking for digital natives.", "Age (proxy)", "\"Digital native\" is a well-known proxy for age and can support an ADEA claim. It was not used for matching.")],
    [
      q("q1", "Is fully remote possible for an exceptional candidate?", "Several strong passive engineers are outside Austin.", "toggle_mandatory", "c7"),
      q("q2", "Is Go or Java backend experience acceptable in place of Python?", "Widens the pool.", "set_value", "c2"),
      q("q3", "Is there an on-call rotation?", "Not stated; matters for senior engineers.", "add_criterion", "", "schedule"),
    ],
  ),
];
