import {z} from 'zod';

const textbookSchema = z.object({filename: z.string(), jobId: z.string(), pdfSha256: z.string().regex(/^[a-f0-9]{64}$/), pdfPages: z.array(z.number().int().positive()).min(1)});
export const ictConceptSchema = z.object({
  textbook: textbookSchema, scopeNote: z.string(), id: z.string(), name: z.string(), grade: z.union([z.literal(10), z.literal(11)]), lessonId: z.string(),
  points: z.array(z.object({id: z.string(), text: z.string()})).min(1),
}).refine(c => c.textbook.jobId === (c.grade === 10 ? '3fa953c7-3d14-4612-9bed-b3887cf1a624' : 'f5110037-6100-45ac-b3b6-ae6baded7ea9') &&
  c.textbook.pdfSha256 === (c.grade === 10 ? '0562035a2b8201df08e0917e70e37d834c77be2662283a8a878acc444db9a4e5' : '9d9c1a102b4e077916dd7f9a89381c6de96d0c57f75bef868e258ff33959e029'), 'Unverified ICT textbook source');
export const ictCatalogSchema = z.object({
  concepts: z.array(ictConceptSchema).min(1), modelSha256: z.literal('df42a138824f57fec3339ecb973f643cebf8899d7eaba902d5adfb40d4a3b74b'), model: z.string(),
  experimental: z.literal(true), reviewRequired: z.literal(true), automaticICTEnabled: z.literal(false),
});
const predictionSchema = z.object({
  suggestedStatus: z.enum(['present', 'partial', 'missing']).nullable(),
  rawModelStatus: z.enum(['present', 'partial', 'missing']), status: z.null(),
  reviewRequired: z.literal(true), scoresCalibrated: z.literal(false),
  suggestionWithheld: z.boolean(), completeSuggestionWithheld: z.boolean(), modelVersion: z.string(),
  modelSha256: z.literal('df42a138824f57fec3339ecb973f643cebf8899d7eaba902d5adfb40d4a3b74b'),
  evidence: z.object({
    points: z.array(z.object({pointId: z.string(), requirement: z.string(),
      candidateEvidence: z.string(), start: z.number().int().min(0), end: z.number().int().min(0),
      semanticCandidateEvidence: z.string(), semanticStart: z.number().int().min(0), semanticEnd: z.number().int().min(0)})).min(1),
    concerns: z.array(z.object({quote: z.string(), kind: z.string(), reason: z.string().optional(),
      start: z.number().int().min(0), end: z.number().int().min(0)})),
  }),
}).refine(p => p.suggestedStatus === (p.suggestionWithheld ? null : p.rawModelStatus) &&
  p.completeSuggestionWithheld === (p.suggestionWithheld && p.rawModelStatus === 'present'), 'Invalid withheld suggestion');

export const ictReviewSchema = z.object({
  experimental: z.literal(true), reviewRequired: z.literal(true), mode: z.literal('manual_review'), language: z.literal('English'),
  modelSha256: z.literal('df42a138824f57fec3339ecb973f643cebf8899d7eaba902d5adfb40d4a3b74b'), textSha256: z.string().regex(/^[a-f0-9]{64}$/),
  concept: ictConceptSchema, analyzedText: z.string(), offsetUnit: z.literal('unicode_code_points'),
  checkedAt: z.string(), prediction: predictionSchema,
}).refine(review => {
  const points = Array.from(review.analyzedText);
  const matches = (start: number, end: number, quote: string) => end >= start && end <= points.length && points.slice(start, end).join('') === quote;
  const evidence = review.prediction.evidence;
  return review.modelSha256 === review.prediction.modelSha256 &&
    evidence.points.length === review.concept.points.length &&
    new Set(evidence.points.map(p => p.pointId)).size === evidence.points.length &&
    evidence.points.every(p => review.concept.points.some(c => c.id === p.pointId && c.text === p.requirement) &&
      matches(p.start, p.end, p.candidateEvidence) && matches(p.semanticStart, p.semanticEnd, p.semanticCandidateEvidence)) &&
    evidence.concerns.every(c => matches(c.start, c.end, c.quote));
}, 'Evidence does not match the selected concept, model, or analyzed text');

/** Mirrors the service's activeOcrText; deletion markers are never model evidence. */
export function activeICTReviewText(text: string): string {
  const result = text.replace(/<deleted>[\s\S]*?<\/deleted>/gi, ' ');
  if (/<\/?deleted\b/i.test(result)) throw new Error('Correct malformed deletion markers before checking the note');
  return result.replace(/\[(?:crossed out(?: heading)?):[^\]]*\]/gi, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

export function parseICTReviewResponse(response: unknown, input: {text: string; conceptId: string}) {
  const {data} = z.object({success: z.literal(true), data: ictReviewSchema}).parse(response);
  if (data.concept.id !== input.conceptId || data.analyzedText !== activeICTReviewText(input.text)) {
    throw new Error('The returned ICT check does not match the submitted concept and text');
  }
  return data;
}
export type ICTConcept = z.infer<typeof ictConceptSchema>;
export type ICTReview = z.infer<typeof ictReviewSchema>;

export const ictReferenceSchema = z.object({conceptId: z.string(), source: textbookSchema, passages: z.array(z.object({text: z.string().min(1), pdfPages: z.array(z.number().int().positive()).min(1)})).min(1)});
export type ICTReference = z.infer<typeof ictReferenceSchema>;
export function parseICTReference(response: unknown, concept: ICTConcept): ICTReference {
  const {data} = z.object({success: z.literal(true), data: ictReferenceSchema}).parse(response);
  if (data.conceptId !== concept.id || data.source.jobId !== concept.textbook.jobId || data.source.pdfSha256 !== concept.textbook.pdfSha256 || data.source.filename !== concept.textbook.filename || JSON.stringify(data.source.pdfPages) !== JSON.stringify(concept.textbook.pdfPages) || !data.passages.every(p => p.pdfPages.some(page => concept.textbook.pdfPages.includes(page)))) throw new Error('Textbook reference does not match the selected concept');
  return data;
}
