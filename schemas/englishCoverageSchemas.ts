import { z } from "zod";

const pointSchema=z.object({
  pointId:z.string(),requirement:z.string(),lexicalCoverage:z.number().min(0).max(1),
  candidateEvidence:z.string().nullable(),start:z.number().nullable(),end:z.number().nullable(),
});
const predictionSchema=z.object({
  suggestedStatus:z.enum(["present","partial","missing"]).nullable(),
  reviewRequired:z.literal(true),completeSuggestionWithheld:z.boolean(),modelVersion:z.string(),
  evidence:z.object({points:z.array(pointSchema),concerns:z.array(z.object({quote:z.string(),kind:z.string()}))}),
}).refine(p=>!p.completeSuggestionWithheld||p.suggestedStatus===null,"A withheld suggestion must have no label");
export const englishCoverageCheckSchema=z.object({
  state:z.enum(["ready","skipped","unavailable"]),
  reason:z.enum(["disabled","language","ocr_quality","lesson_scope","unsupported_concepts","runtime"]).optional(),
  modelVersion:z.string().optional(),modelSha256:z.string().optional(),textSha256:z.string().optional(),
  lessonId:z.string().optional(),checkedAt:z.string(),reviewRequired:z.literal(true),
  suggestions:z.array(z.object({conceptId:z.string(),modelConceptId:z.string().optional(),conceptName:z.string(),prediction:predictionSchema})),
}).refine(c=>c.state!=="ready"||c.suggestions.length>0,"A ready check must contain suggestions");
export type EnglishCoverageCheck=z.infer<typeof englishCoverageCheckSchema>;
