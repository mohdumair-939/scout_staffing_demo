// Protected-trait guardrail. Runs on every extraction (AI or rules): a requirement that
// screens on a protected trait is never used as a criterion.

interface TraitRule {
  trait: string;
  test: RegExp;
  /** extra words that must also appear for ambiguous terms */
  context?: RegExp;
  reason: string;
}

const PREF = /prefer|only|must|ideal|candidates|applicants|need not|suitable|looking for|fit our|should be/i;

const RULES: TraitRule[] = [
  { trait: "Age", test: /\b(under|over|younger than|older than|below|above)\s+\d{2}\b|\bbetween \d{2} and \d{2}\b|\byoung(er)?\b|\byouthful\b|digital natives?|\bmax(imum)? age\b|\bage (limit|requirement)\b/i, reason: "Age preferences are not lawful requirements (ADEA protects workers 40+)." },
  { trait: "Sex / gender", test: /\b(female|male|women|men|woman|gender|girls?|guys)\b/i, context: PREF, reason: "Sex or gender preferences are sex discrimination under Title VII." },
  { trait: "Pregnancy", test: /pregnan/i, reason: "Excluding pregnant applicants violates the Pregnancy Discrimination Act." },
  { trait: "Religion", test: /\b(christian|muslim|jewish|hindu|buddhist|catholic|religio\w*|church\w*|faith\w*)\b/i, context: PREF, reason: "Religious requirements are religious discrimination under Title VII." },
  { trait: "National origin", test: /native (english )?speakers?|u\.?\s?s\.?-born|born in the|national origin|nationality|no accents?/i, reason: "Requirements about birthplace or native language can discriminate on national origin." },
  { trait: "Race / color", test: /\b(race|racial|white|black|asian|hispanic|latino|latina|caucasian)\b/i, context: PREF, reason: "Race or color preferences are prohibited under Title VII." },
  { trait: "Disability", test: /\b(disabilit\w*|disabled|handicap\w*|able-bodied)\b/i, context: PREF, reason: "Excluding people with disabilities violates the ADA; state the essential job functions instead." },
  { trait: "Marital / family status", test: /\bmarital\b|\bmarried\b|\bsingle (candidates|applicants|people|individuals)\b|\bno (kids|children)\b|childless/i, reason: "Marital and family status are protected in many states and are not job-related." },
  { trait: "Sexual orientation", test: /sexual orientation|\b(gay|lesbian|straight|heterosexual)\b/i, context: PREF, reason: "Sexual orientation is protected under Title VII." },
];

/** Equal-opportunity boilerplate mentions protected traits in order to protect them. */
const EEO = /equal (employment )?opportunity|\beeo\b|without regard|do(es)? not discriminate|regardless of|reasonable accommodation|affirmative action/i;

export interface GuardrailHit {
  trait: string;
  reason: string;
}

export function protectedTraitIn(text: string): GuardrailHit | null {
  if (EEO.test(text)) return null;
  for (const r of RULES) {
    if (r.test.test(text) && (!r.context || r.context.test(text))) return { trait: r.trait, reason: r.reason };
  }
  return null;
}
