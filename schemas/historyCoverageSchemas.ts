import {z} from 'zod';

export const historyConceptSchema = z.object({
  id: z.string(), name: z.string(), grade: z.union([z.literal(10), z.literal(11)]), lessonId: z.string(),
  points: z.array(z.object({id: z.string(), text: z.string()})).min(1),
});
export const historyCatalogSchema = z.object({
  concepts: z.array(historyConceptSchema).min(1), modelSha256: z.string().regex(/^[a-f0-9]{64}$/), model: z.string(),
  experimental: z.literal(true), reviewRequired: z.literal(true), automaticHistoryEnabled: z.literal(false),
});
const predictionSchema = z.object({
  suggestedStatus: z.enum(['present', 'partial', 'missing']).nullable(),
  rawModelStatus: z.enum(['present', 'partial', 'missing']), status: z.null(),
  reviewRequired: z.literal(true), scoresCalibrated: z.literal(false),
  suggestionWithheld: z.boolean(), completeSuggestionWithheld: z.boolean(), modelVersion: z.string(),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
  evidence: z.object({
    points: z.array(z.object({pointId: z.string(), requirement: z.string(),
      candidateEvidence: z.string(), start: z.number().int().min(0), end: z.number().int().min(0),
      semanticCandidateEvidence: z.string(), semanticStart: z.number().int().min(0), semanticEnd: z.number().int().min(0)})).min(1),
    concerns: z.array(z.object({quote: z.string(), kind: z.string(), reason: z.string().optional(),
      start: z.number().int().min(0), end: z.number().int().min(0)})),
  }),
}).refine(p => (p.suggestionWithheld ? p.suggestedStatus === null : p.suggestedStatus !== null) &&
  (!p.completeSuggestionWithheld || (p.suggestionWithheld && p.rawModelStatus === 'present')), 'Invalid withheld suggestion');

export const historyReviewSchema = z.object({
  experimental: z.literal(true), reviewRequired: z.literal(true), mode: z.literal('manual_review'), language: z.literal('English'),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/), textSha256: z.string().regex(/^[a-f0-9]{64}$/),
  concept: historyConceptSchema, analyzedText: z.string(), offsetUnit: z.literal('unicode_code_points'),
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
export function activeHistoryReviewText(text: string): string {
  const result = text.replace(/<deleted>[\s\S]*?<\/deleted>/gi, ' ');
  if (/<\/?deleted\b/i.test(result)) throw new Error('Correct malformed deletion markers before checking the note');
  return result.replace(/\[(?:crossed out(?: heading)?):[^\]]*\]/gi, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

export function parseHistoryReviewResponse(response: unknown, input: {text: string; conceptId: string}) {
  const {data} = z.object({success: z.literal(true), data: historyReviewSchema}).parse(response);
  if (data.concept.id !== input.conceptId || data.analyzedText !== activeHistoryReviewText(input.text)) {
    throw new Error('The returned History check does not match the submitted concept and text');
  }
  return data;
}
export type HistoryConcept = z.infer<typeof historyConceptSchema>;
export type HistoryReview = z.infer<typeof historyReviewSchema>;

export const historySavedCheckSchema = z.object({
  state:z.enum(['not_requested','running','ready','failed','stale']),
  input:z.object({text:z.string(),conceptId:z.string(),language:z.literal('English'),scopeConfirmed:z.literal(true)}).optional(),
  result:historyReviewSchema.optional(),error:z.string().optional(),
}).superRefine((check,ctx)=>{
  if(['running','ready','failed'].includes(check.state)&&!check.input)ctx.addIssue({code:'custom',message:'Missing saved check input'});
  if(check.state==='ready') {
    let matches=false;
    try {matches=!!check.result&&!!check.input&&check.result.concept.id===check.input.conceptId&&check.result.analyzedText===activeHistoryReviewText(check.input.text);} catch {}
    if(!matches)ctx.addIssue({code:'custom',message:'Saved History result does not match its input'});
  }
  if(check.state!=='ready'&&check.result)ctx.addIssue({code:'custom',message:'Unfinished/stale checks cannot contain results'});
});
