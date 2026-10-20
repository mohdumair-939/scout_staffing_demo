// Deterministic fallbacks for every AI step. They must never throw and never return empty.
import type { ClarifyQuestion, Criterion, CriterionCategory, Extraction, JobInput, RemovedRequirement } from "@/lib/data/types";
import type { ScoredCandidate } from "@/lib/matching/pipeline";
import { credentialCodesIn, CREDENTIALS, guessFamily, LANGUAGES, skillsIn } from "@/lib/matching/synonyms";
import { protectedTraitIn } from "./guardrail";
import type { Explanation, PacketText, Screening } from "./schemas";

// ---------------------------------------------------------------- extraction

type Section = "mandatory" | "preferred" | "skip" | "neutral";

const HEADER_RULES: Array<[RegExp, Section]> = [
  [/^(preferred|nice to have|nice-to-have|bonus|pluses|desired|preferred qualifications|a plus)/i, "preferred"],
  [/^(requirements|required|qualifications|must have|must-have|minimum qualifications|what you need|what you bring|you have)/i, "mandatory"],
  [/^(responsibilities|what you.ll do|duties|about|who we are|the role|benefits|perks|what we offer|our company)/i, "skip"],
  [/^(other|additional|schedule|physical|location|compensation)/i, "neutral"],
];

function headerOf(line: string): Section | null {
  const t = line.replace(/[:#*]/g, "").trim();
  if (t.length > 40 || /^[-•*]/.test(line.trim())) return null;
  for (const [re, s] of HEADER_RULES) if (re.test(t)) return s;
  return null;
}

export function classifyLine(text: string, family: ReturnType<typeof guessFamily>): CriterionCategory {
  const t = text.toLowerCase();
  if (/bilingual|fluent|spanish|language/.test(t) || LANGUAGES.some((l) => t.includes(l))) return "language";
  if (/\b\d+\+?\s*(years|yrs)\b|years of/.test(t)) return "experience";
  if (credentialCodesIn(text, family).length || /licen[cs]e|certificat(e|ion)\b(?! program)|registration|endorsement|admitted to|\bbar\b/.test(t)) {
    if (!/degree|bachelor|program/.test(t)) return "license";
  }
  if (/degree|bachelor|master|diploma|\bged\b|j\.?d\.?\b|juris|\bbsn\b|\bmba\b|certificate program|ll\.?m/.test(t)) return "education";
  if (/within \d+ miles|on-?site|hybrid|remote|commut|located in|live within|relocat|based in|service area/.test(t)) return "location";
  if (/shift|weekend|on-call|on call|overtime|schedule|home weekly|busy season|monday|extended hours|travel/.test(t)) return "schedule";
  if (/lift|lbs|pounds|stand for|climb|ladder|physical/.test(t)) return "physical";
  if (/background check|criminal|mvr|driving record|drug (test|screen)|clearance/.test(t)) return "background";
  if (skillsIn(text).some((s) => /^[A-Z]/.test(s) && /[A-Z]{2,}|Excel|NetSuite|SAP|Bluebeam|Relativity|Epic|Docker|Python|Kafka|Terraform|Kubernetes|ProEst|Clio|iManage|OneSource|Axcess|Power BI|Procore/.test(s))) return "tools";
  if (skillsIn(text).length) return "skill";
  return "other";
}

function valueFor(category: CriterionCategory, text: string, family: ReturnType<typeof guessFamily>): string {
  if (category === "experience") return text.match(/(\d+)\+?\s*(?:years|yrs)/i)?.[1] ?? "";
  if (category === "location") return text.match(/(\d+)\s*(?:miles|mi)\b/i)?.[1] ?? "";
  if (category === "license") return credentialCodesIn(text, family).join(", ");
  if (category === "education") {
    if (/j\.?d\.?\b|juris/i.test(text)) return "jd";
    if (/master|mba|ll\.?m/i.test(text)) return "master";
    if (/bachelor|bsn|four-year/i.test(text)) return "bachelor";
    if (/associate/i.test(text)) return "associate";
    if (/certificate/i.test(text)) return "certificate";
    return "";
  }
  if (category === "physical") return text.match(/(\d+)\s*(?:lbs|pounds)/i)?.[1] ?? "";
  return "";
}

function cleanText(line: string): string {
  let t = line.replace(/^(?:[-•*]|\d+[.)])\s*/, "").replace(/\.\s*$/, "").trim();
  if (t.length > 110) t = t.slice(0, 107).replace(/\s+\S*$/, "") + "…";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function extractRules(job: JobInput): Extraction {
  const family = guessFamily(job.title, job.jd);
  const lines = job.jd.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hasHeaders = lines.some((l) => headerOf(l) !== null);
  let section: Section = hasHeaders ? "skip" : "neutral";
  const criteria: Criterion[] = [];
  const removed: RemovedRequirement[] = [];

  for (const raw of lines) {
    const h = headerOf(raw);
    if (h) {
      section = h;
      continue;
    }
    const quote = raw.replace(/^[-•*]\s*/, "").trim();
    const hit = protectedTraitIn(quote);
    if (hit) {
      removed.push({ quote, trait: hit.trait, reason: `${hit.reason} It was not used for matching.` });
      continue;
    }
    if (section === "skip") continue;
    const isBullet = /^[-•*]|^\d+[.)]/.test(raw);
    if (!isBullet && section !== "neutral" && quote.length > 160) continue;
    if (!hasHeaders && !isBullet && !/must|required|preferred|years|licen|degree|certif/i.test(quote)) continue;
    const category = classifyLine(quote, family);
    const prefWords = /prefer|nice to have|a plus|\bplus\b|bonus|ideally|desired/i.test(quote);
    let mandatory: boolean;
    if (section === "mandatory") mandatory = !prefWords;
    else if (section === "preferred") mandatory = false;
    else mandatory = /must|required|requirement/i.test(quote) || (!prefWords && ["license", "experience", "location"].includes(category));
    criteria.push({
      id: `c${criteria.length + 1}`,
      category,
      text: cleanText(quote),
      value: valueFor(category, quote, family),
      mandatory,
      quote,
      origin: "extracted",
    });
  }

  // Location from the intake form if the JD itself has none.
  if (!criteria.some((c) => c.category === "location") && job.location) {
    criteria.push({ id: `c${criteria.length + 1}`, category: "location", text: `Within 30 miles of ${job.location}`, value: "30", mandatory: true, quote: "", origin: "extracted" });
  }
  return { family, criteria, removed, questions: templateQuestions(criteria, job, removed) };
}

// ---------------------------------------------------------------- clarification questions

export function templateQuestions(criteria: Criterion[], job: JobInput, removed: RemovedRequirement[]): ClarifyQuestion[] {
  const qs: ClarifyQuestion[] = [];
  const add = (question: string, why: string, kind: ClarifyQuestion["kind"], targetId = "", category: CriterionCategory = "other") =>
    qs.push({ id: `q${qs.length + 1}`, question, why, kind, targetId, category });

  const lic = criteria.find((c) => c.category === "license" && c.mandatory);
  if (lic) add(`Is the "${lic.text}" required on day one, or can it be obtained after hire?`, "Decides whether otherwise strong candidates are blocked.", "toggle_mandatory", lic.id);
  if (!job.payRange && !/\$\s?\d/.test(job.jd)) add("The pay range is missing. What is the budget?", "Needed to judge movability of passive candidates.", "info");
  const loc = criteria.find((c) => c.category === "location");
  if (loc && !loc.value) add("What commute radius should we search (in miles)?", "No radius in the JD; we assumed 30 miles.", "set_value", loc.id);
  if (loc) add("Is relocation assistance available?", "Opens the search to strong candidates outside the area.", "add_criterion", "", "location");
  const exp = criteria.find((c) => c.category === "experience" && c.mandatory);
  if (exp) add(`Is the ${exp.value || "stated"}-year minimum firm for "${exp.text}"?`, "A slightly lower minimum can add strong candidates.", "set_value", exp.id);
  if (!criteria.some((c) => c.category === "schedule")) add("What is the schedule (shift, overtime, on-call, travel)?", "Not stated; a frequent reason candidates drop out late.", "add_criterion", "", "schedule");
  if (removed.length) add("We removed a possibly discriminatory line. Is there a lawful, job-related requirement behind it?", "Keeps the real need while removing the protected trait.", "add_criterion", "", "other");
  if (qs.length < 3) add("Is remote or hybrid work possible?", "Changes the search radius.", "info");
  if (qs.length < 3) add("How many openings are there, and what is the target start date?", "Helps prioritise the shortlist.", "info");
  return qs.slice(0, 6);
}

/** Apply a recruiter's answer to the criteria without AI. */
export function applyAnswerRules(criteria: Criterion[], q: ClarifyQuestion, answer: string): { criteria: Criterion[]; summary: string } {
  const a = answer.trim();
  const target = criteria.find((c) => c.id === q.targetId);
  const yes = /^(y|yes|yep|required|must|day one|mandatory|firm|it is)\b/i.test(a);
  const no = /^(n|no|nope|not|optional|preferred|nice|flexible)\b|can be obtained|after hire|within \d+ (days|months)/i.test(a);
  const num = a.match(/(\d+)/)?.[1];
  const nextId = () => `c${Math.max(0, ...criteria.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1}`;

  if (q.kind === "toggle_mandatory" && target) {
    if (yes || no) {
      const mandatory = yes && !no;
      return {
        criteria: criteria.map((c) => (c.id === target.id ? { ...c, mandatory, origin: "clarification" } : c)),
        summary: `"${target.text}" is now ${mandatory ? "MANDATORY" : "PREFERRED"}.`,
      };
    }
  }
  if (q.kind === "set_value" && target) {
    if (num) {
      const text = /\d+/.test(target.text) ? target.text.replace(/\d+/, num) : `${target.text} (${num})`;
      return {
        criteria: criteria.map((c) => (c.id === target.id ? { ...c, value: num, text, origin: "clarification" } : c)),
        summary: `"${target.text}" updated to ${num}.`,
      };
    }
    return {
      criteria: criteria.map((c) => (c.id === target.id ? { ...c, text: `${c.text} (recruiter: ${a})`, origin: "clarification" } : c)),
      summary: `Note added to "${target.text}".`,
    };
  }
  if (q.kind === "add_criterion" || ((q.kind === "toggle_mandatory" || q.kind === "set_value") && target)) {
    if (/^(no|n|none|n\/a)$/i.test(a)) return { criteria, summary: "No change." };
    const category: CriterionCategory = q.kind === "add_criterion" ? q.category : target!.category;
    const text = a.charAt(0).toUpperCase() + a.slice(1);
    const c: Criterion = {
      id: nextId(),
      category,
      text,
      value: category === "location" || category === "experience" ? num ?? "" : "",
      mandatory: !/prefer|nice|optional|ideally|if possible/i.test(a),
      quote: "",
      origin: "clarification",
    };
    return { criteria: [...criteria, c], summary: `Added ${c.mandatory ? "mandatory" : "preferred"} criterion: "${c.text}".` };
  }
  return { criteria, summary: "Answer saved as a note (no criteria change)." };
}

// ---------------------------------------------------------------- explanations

export function explainTemplate(s: ScoredCandidate, criteria: Criterion[]): Explanation {
  const c = s.cand;
  const byId = new Map(s.matches.map((m) => [m.criterionId, m]));
  const line = (cr: Criterion) => `${cr.text}: ${byId.get(cr.id)?.evidence ?? ""}`;
  const mand = criteria.filter((x) => x.mandatory);
  const met = mand.filter((x) => byId.get(x.id)?.result === "meets");
  const strengths = [
    ...met.map(line),
    ...criteria.filter((x) => !x.mandatory && byId.get(x.id)?.result === "meets").map((x) => `Preferred: ${line(x)}`),
  ].slice(0, 6);
  const gaps = criteria.filter((x) => byId.get(x.id)?.result === "fails").map((x) => `${x.mandatory ? "Mandatory" : "Preferred"}: ${line(x)}`);
  const unknowns = criteria.filter((x) => byId.get(x.id)?.result === "unknown").map((x) => `${x.text}: no information yet`);
  const where = s.distance != null ? `, ${s.distance} mi from the job` : "";
  const pool = c.poolType === "passive" ? "a passive candidate (not actively looking)" : c.poolType === "historical" ? "a past candidate from our pool" : "an active applicant";
  const summary = `${c.name} is ${c.currentTitle.value} at ${c.currentEmployer.value}${where}, and ${pool}. Meets ${met.length} of ${mand.length} mandatory criteria${
    s.fit.mandatoryFailed ? `, does not meet ${s.fit.mandatoryFailed}` : ""
  }${s.fit.mandatoryUnknown ? `, ${s.fit.mandatoryUnknown} still unknown` : ""}.`;
  return { summary, strengths, gaps, unknowns };
}

// ---------------------------------------------------------------- screening questions

export function screeningTemplate(s: ScoredCandidate, criteria: Criterion[], jobCity?: string): Screening {
  const qs: Screening["questions"] = [];
  const byId = new Map(s.matches.map((m) => [m.criterionId, m]));
  for (const cr of criteria) {
    const m = byId.get(cr.id);
    if (!m) continue;
    const open = m.result === "unknown" || (m.result === "meets" && (m.needsVerification || m.inferredOnly));
    if (!open) continue;
    let q: string;
    switch (cr.category) {
      case "license": {
        const codes = credentialCodesIn(cr.text + " " + cr.value);
        const name = codes.map((c) => CREDENTIALS[c]?.name ?? c).join(" and ") || cr.text;
        q = m.needsVerification
          ? `Can you confirm your ${name} is active, and share the licence number so we can verify it?`
          : `Do you currently hold an active ${name}${/texas|north carolina|colorado/i.test(cr.text) ? ` (${cr.text.match(/texas|north carolina|colorado/i)![0]})` : ""}? When does it expire?`;
        break;
      }
      case "experience":
        q = m.inferredOnly ? `Your public profile suggests ${m.evidence.split("(")[0].trim()} of relevant experience. Can you walk me through those roles?` : `How many years of experience do you have with: ${cr.text.replace(/^\d+\+?\s*years? of\s*/i, "")}?`;
        break;
      case "education":
        q = `What is your highest degree or certificate, and in what field? (Role asks for: ${cr.text})`;
        break;
      case "schedule":
        q = `This role requires: ${cr.text}. Does that work for you?`;
        break;
      case "location":
        q = `Would you commute to ${jobCity ?? "the job site"}, or consider relocating?`;
        break;
      case "physical":
        q = `The role involves: ${cr.text}. Can you perform this, with or without reasonable accommodation?`;
        break;
      case "background":
        q = `The client requires: ${cr.text}. Is there anything we should know before running the check?`;
        break;
      case "language":
        q = `How would you describe your proficiency for: ${cr.text}?`;
        break;
      default:
        q = m.inferredOnly ? `Can you confirm your hands-on experience with ${m.evidence}?` : `Tell me about your hands-on experience with: ${cr.text}.`;
    }
    qs.push({ question: q, criterionId: cr.id, why: m.result === "unknown" ? "Unknown" : m.needsVerification ? "Licence not verified yet" : "Based on inferred data" });
  }
  if (!s.cand.interestConfirmed) {
    qs.push({
      question: s.cand.poolType === "passive" ? "Would you be open to hearing about a new role? What would a move need to offer?" : "Are you still interested in this role, and what is your notice period?",
      criterionId: "interest",
      why: "Interest not confirmed",
    });
  }
  return { questions: qs.slice(0, 8) };
}

// ---------------------------------------------------------------- submission packet

export function packetTemplate(s: ScoredCandidate, criteria: Criterion[], job: JobInput): PacketText {
  const c = s.cand;
  const byId = new Map(s.matches.map((m) => [m.criterionId, m]));
  const usable = (st: string) => st === "verified" || st === "self_reported";
  const lic = c.credentials.filter((x) => usable(x.status));
  const totalYears = Math.round(c.workHistory.filter((w) => usable(w.status)).reduce((sum, w) => {
    const [sy, sm] = w.start.split("-").map(Number);
    const [ey, em] = (w.end ?? "2026-10").split("-").map(Number);
    return sum + ((ey - sy) * 12 + (em - sm)) / 12;
  }, 0));
  const highlights = criteria
    .filter((cr) => cr.mandatory && byId.get(cr.id)?.result === "meets")
    .map((cr) => `${cr.text}: ${byId.get(cr.id)!.evidence}`)
    .slice(0, 6);
  for (const cr of criteria.filter((x) => !x.mandatory && byId.get(x.id)?.result === "meets").slice(0, 3)) highlights.push(`Also: ${cr.text}`);
  const considerations = criteria
    .filter((cr) => !cr.mandatory && byId.get(cr.id)?.result !== "meets")
    .map((cr) => `${cr.text}: ${byId.get(cr.id)?.result === "fails" ? "not met" : "not yet confirmed"}`)
    .slice(0, 4);
  return {
    headline: `${c.currentTitle.value} · ${totalYears}+ years · ${c.location.value.city}, ${c.location.value.state}`,
    summary: `${c.name} is currently ${c.currentTitle.value} at ${c.currentEmployer.value} and meets every mandatory requirement for the ${job.title} role at ${job.client}.${
      lic.length ? ` Credentials: ${lic.map((x) => `${x.name}${x.status === "verified" ? " (verified)" : ""}`).join(", ")}.` : ""
    } Interest in the role has been confirmed by our recruiter.`,
    highlights,
    considerations,
  };
}
