import { z } from "zod";

export const FAMILIES = ["nursing", "electrical", "hvac", "trucking", "accounting", "tax", "legal", "estimating", "software", "warehouse_admin"] as const;
export const CATEGORIES = ["skill", "license", "experience", "education", "location", "schedule", "physical", "tools", "background", "language", "other"] as const;
export const QUESTION_KINDS = ["toggle_mandatory", "set_value", "add_criterion", "info"] as const;

// Schemas sent to the model stay simple (no length limits); callers check counts afterwards.

export const ExtractionSchema = z.object({
  occupationFamily: z.enum(FAMILIES),
  criteria: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      text: z.string().describe("Short requirement, e.g. 'Active CPA license'"),
      value: z.string().describe("Min years, radius in miles, licence code (CPA, RN, BAR, CDL-A...) or degree level; empty string if none"),
      mandatory: z.boolean(),
      quote: z.string().describe("Exact text copied from the JD that supports this criterion"),
    }),
  ),
  removed: z.array(
    z.object({
      quote: z.string().describe("Exact JD text of the discriminatory requirement"),
      trait: z.string().describe("Protected trait, e.g. Age, Religion"),
      reason: z.string(),
    }),
  ),
  questions: z.array(
    z.object({
      question: z.string(),
      why: z.string(),
      kind: z.enum(QUESTION_KINDS),
      targetIndex: z.number().int().describe("Index of the criterion this question is about, or -1"),
      category: z.enum(CATEGORIES).describe("Category of a criterion to add, for add_criterion"),
    }),
  ),
});
export type ExtractionAI = z.infer<typeof ExtractionSchema>;

export const ClarifySchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      value: z.string(),
      mandatory: z.boolean(),
    }),
  ),
  additions: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      text: z.string(),
      value: z.string(),
      mandatory: z.boolean(),
    }),
  ),
  summary: z.string().describe("One sentence describing what changed"),
});

export const ExplainSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  unknowns: z.array(z.string()),
});
export type Explanation = z.infer<typeof ExplainSchema>;

export const ScreeningSchema = z.object({
  questions: z.array(z.object({ question: z.string(), criterionId: z.string(), why: z.string() })),
});
export type Screening = z.infer<typeof ScreeningSchema>;

export const PacketSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  considerations: z.array(z.string()),
});
export type PacketText = z.infer<typeof PacketSchema>;

export const SourceRationaleSchema = z.object({
  rationales: z.array(z.object({ sourceId: z.string(), reason: z.string() })),
});
