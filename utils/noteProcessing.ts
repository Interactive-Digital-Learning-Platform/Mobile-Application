export interface NoteProcessingProgress {
  stage: string;
  completedStages: string[];
  currentPage?: number;
  totalPages: number;
  startedAt: string;
  updatedAt: string;
}

export const PROCESSING_GROUPS = [
  { label: "Reading handwriting", stages: ["ocr_extraction", "ocr_cleaning"] },
  { label: "Identifying note context", stages: ["note_scope_assessment", "language_detection", "subject_detection"] },
  { label: "Matching curriculum", stages: ["lesson_identification", "curriculum_retrieval"] },
  { label: "Checking note coverage", stages: ["concept_matching", "english_coverage_check", "coverage_calculation", "gap_detection", "quality_verification", "saving_analysis"] },
];

const LABELS: Record<string, string> = {
  queued: "Waiting to start", ocr_extraction: "Reading handwriting", ocr_cleaning: "Checking extracted text",
  note_scope_assessment: "Checking the note's scope", language_detection: "Identifying language",
  subject_detection: "Identifying subject and grade", lesson_identification: "Finding the lesson",
  curriculum_retrieval: "Retrieving textbook references", concept_matching: "Comparing note concepts",
  english_coverage_check: "Running the coverage model", coverage_calculation: "Calculating coverage",
  gap_detection: "Preparing coverage findings", quality_verification: "Checking analysis quality",
  saving_analysis: "Saving your analysis",
};

export function processingSummary(progress?: NoteProcessingProgress): string {
  if (!progress) return "Analysis in progress";
  const label = LABELS[progress.stage] ?? "Analysis in progress";
  const page = progress.currentPage;
  if (progress.stage === "ocr_extraction" && Number.isInteger(page) && Number.isInteger(progress.totalPages) && page! >= 1 && page! <= progress.totalPages) {
    return `${label} · page ${page} of ${progress.totalPages}`;
  }
  return label;
}

export function processingGroups(progress?: NoteProcessingProgress) {
  const completed = Array.isArray(progress?.completedStages) ? progress.completedStages : [];
  return PROCESSING_GROUPS.map(group => ({
    label: group.label,
    active: Boolean(progress && group.stages.includes(progress.stage)),
    done: Boolean(progress && group.stages.every(stage => completed.includes(stage))),
  }));
}

export function elapsedSeconds(startedAt: string, now = Date.now()): number {
  const started = Date.parse(startedAt);
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
}
