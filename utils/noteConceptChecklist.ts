import { englishCoverageCheckSchema } from "../schemas/englishCoverageSchemas";
import { scienceSavedCheckSchema } from "../schemas/scienceReviewSchemas";
import { historySavedCheckSchema, activeHistoryReviewText } from "../schemas/historyCoverageSchemas";

export interface ChecklistPoint { id: string; text: string; quote: string | null; state: "found" | "add" | "review" }
export interface ChecklistConcept {
  id: string; curriculumId?: string; name: string;
  status: "present" | "partial" | "missing" | "review";
  points: ChecklistPoint[]; concerns: string[]; version: string; checkedAt: string;
}

/** A practice draft must never silently become coverage of the original upload.
 * Use the same deletion-marker handling as the Notes service, without adding text. */
export function checklistText(text: string) {
  try { return activeHistoryReviewText(text); } catch { return null; }
}

export function scienceChecklist(check: unknown, originalText: string): ChecklistConcept[] {
  const parsed = englishCoverageCheckSchema.safeParse(check);
  const text = checklistText(originalText);
  if (!parsed.success || parsed.data.state !== "ready" || text === null) return [];
  const data = parsed.data;
  return data.suggestions.filter(({prediction}) =>
    (!data.modelVersion || prediction.modelVersion === data.modelVersion) &&
    prediction.evidence.points.every(p => p.candidateEvidence === null ||
      (Number.isInteger(p.start) && Number.isInteger(p.end) && p.start! >= 0 && p.end! >= p.start! &&
        p.end! <= text.length && text.slice(p.start!,p.end!) === p.candidateEvidence))
  ).map(({conceptId,modelConceptId,conceptName,prediction}) => ({
    id: modelConceptId || conceptId, curriculumId: conceptId, name: conceptName,
    status: prediction.suggestedStatus ?? "review",
    points: prediction.evidence.points.map(p => ({id:p.pointId,text:p.requirement,quote:p.candidateEvidence,
      state: prediction.suggestedStatus === null ? "review" : p.lexicalCoverage === 1 ? "found" : "add"})),
    concerns: [...new Set(prediction.evidence.concerns.map(c => c.quote))],
    version: data.modelVersion || prediction.modelVersion, checkedAt: data.checkedAt,
  }));
}

export function buildScienceChecklist(automatic: unknown, saved: unknown, text: string) {
  const concepts = new Map(scienceChecklist(automatic,text).map(c => [c.id,c]));
  const parsed = scienceSavedCheckSchema.safeParse(saved);
  if (parsed.success && parsed.data.state === "ready" && parsed.data.input && parsed.data.result &&
      parsed.data.input.text === checklistText(text)) {
    for (const candidate of scienceChecklist(parsed.data.result.check,text)) {
      const prior = concepts.get(candidate.id);
      // Invalid dates cannot make an old edited check look more recent.
      if (!prior || Date.parse(candidate.checkedAt) > Date.parse(prior.checkedAt)) {
        concepts.set(candidate.id,{...candidate,curriculumId:prior?.curriculumId || candidate.curriculumId});
      }
    }
  }
  return Array.from(concepts.values());
}

export function buildHistoryChecklist(saved: unknown, text: string): ChecklistConcept[] {
  const parsed = historySavedCheckSchema.safeParse(saved);
  if (!parsed.success || parsed.data.state !== "ready" || !parsed.data.result ||
      parsed.data.result.analyzedText !== checklistText(text)) return [];
  const {result} = parsed.data, {prediction} = result;
  return [{id:result.concept.id,name:result.concept.name,status:prediction.suggestedStatus ?? "review",
    points:prediction.evidence.points.map(p => ({id:p.pointId,text:p.requirement,quote:p.semanticCandidateEvidence || null,
      // Similarity candidates do not establish which individual point is complete.
      state:"review"})),
    concerns:[...new Set(prediction.evidence.concerns.map(c => c.reason ? `${c.reason}: ${c.quote}` : c.quote))],
    version:prediction.modelVersion,checkedAt:result.checkedAt}];
}

export function sortChecklist(concepts: ChecklistConcept[]) {
  const priority = {review:0,missing:1,partial:2,present:3};
  return [...concepts].sort((a,b) => priority[a.status]-priority[b.status]);
}

export function checklistNextSteps(concept: ChecklistConcept) {
  if (concept.concerns.length) return {title:"Check this explanation",points:concept.concerns,kind:"concern" as const};
  if (concept.status === "present") return {title:"Ready for revision",points:[],kind:"complete" as const};
  const gaps = concept.points.filter(p => p.state === "add");
  return {title:gaps.length ? "Add to your notes" : "Review these ideas",
    points:(gaps.length ? gaps : concept.points).map(p => p.text),kind:"points" as const};
}
