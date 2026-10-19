import { z } from "zod";
import { NotesServiceError } from "./noteErrors";

// Validate at the Notes API boundary, before malformed success payloads reach
// .map/.includes calls or React text children. Unknown fields stay available.
const strings = z.array(z.string());
const analysis = z.object({
  subject: z.string(), topic: z.string(), gradeLevel: z.string(),
  overallCompleteness: z.number().finite(), analyzedAt: z.string().optional(),
  keyConcepts: strings.default([]), partialConcepts: strings.optional(),
  strengthAreas: strings.default([]), missingConcepts: strings.default([]),
  learningGaps: z.array(z.object({ concept: z.string(), severity: z.string(), suggestion: z.string().optional() }).passthrough()).default([]),
  qualityWarnings: strings.optional(),
}).passthrough();
const note = z.object({
  _id: z.string().min(1), title: z.string(),
  status: z.enum(["uploaded", "processing", "analyzed", "failed"]),
  rawText: z.string().default(""), imageUrl: z.string().default(""),
  imageUrls: strings.optional(), createdAt: z.string(),
  userSubject: z.string().optional(), userTopic: z.string().optional(),
  analysis: analysis.optional(),
}).passthrough().refine(value => value.status !== "analyzed" || !!value.analysis);
const mindMap: z.ZodType = z.lazy(() => z.object({ label: z.string(), children: z.array(mindMap).optional() }).passthrough());
const material = z.object({
  textContent: z.string().optional(), audioUrl: z.string().optional(),
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), hint: z.string().optional(), explanation: z.string().optional(), sourceQuote: z.string().optional(), kind: z.string().optional() }).passthrough()).optional(),
  definitions: z.array(z.object({ term: z.string(), definition: z.string() }).passthrough()).optional(),
  mindMap: mindMap.optional(),
}).passthrough().refine(value => !!(value.textContent?.trim() || value.audioUrl?.trim() || value.flashcards?.length || value.definitions?.length || value.mindMap));
const overview = z.object({
  generatedTypes: strings, missingCount: z.number(), hasActiveJobs: z.boolean(),
  states: z.array(z.object({ type: z.string(), status: z.enum(["not_requested", "queued", "generating", "ready", "failed"]), available: z.boolean() }).passthrough()),
}).passthrough();
const profile = z.object({
  exists: z.boolean(), totalNotesAnalyzed: z.number(),
  subjectMastery: z.array(z.object({ subjectName: z.string(), averageWeightedCoverage: z.number(), notesAnalyzed: z.number(), trend: z.enum(["improving", "stable", "declining"]), recentScores: z.array(z.number()) }).passthrough()),
  recentSessions: z.array(z.object({ noteId: z.string(), subject: z.string(), weightedCoverage: z.number(), analyzedAt: z.string() }).passthrough()),
}).passthrough();

export type NotesResponseKind = "note" | "notes" | "verification" | "material" | "overview" | "profile" | "upload" | "processing" | "deletion" | "generation" | "consent";
const schemas = { note, notes: z.object({ notes: z.array(note) }).passthrough(),
  verification: z.object({ note }).passthrough(), material, overview, profile,
  upload: z.object({ noteId: z.string().min(1), status: z.enum(["uploaded", "processing"]) }).passthrough(),
  processing: z.object({ noteId: z.string().min(1), status: z.literal("processing") }).passthrough(),
  deletion: z.object({ deletedId: z.string().min(1) }).passthrough(),
  generation: z.object({ noteId: z.string().min(1), typesQueued: strings }).passthrough(),
  consent: z.object({ noteId: z.string(), researchConsent: z.object({ status: z.enum(["not_provided", "granted", "withdrawn"]) }).passthrough() }).passthrough() };
export function parseNotesResponse(body: unknown, kind: NotesResponseKind): any {
  const envelope = z.object({ success: z.literal(true), data: z.unknown() }).passthrough().safeParse(body);
  if (!envelope.success) throw new NotesServiceError("invalid_response");
  const result = schemas[kind].safeParse(envelope.data.data);
  if (!result.success) throw new NotesServiceError("invalid_response");
  return { ...envelope.data, data: result.data };
}
