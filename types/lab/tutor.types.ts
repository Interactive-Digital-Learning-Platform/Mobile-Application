// --- Lab Tutor chat domain types ---

export type CitationType = {
  title: string;
  from: string;
  content: string;
};

export type MessageType = {
  id: string;
  localID: string;
  serverID?: string;
  createdAt: Date;
  role: string;
  content: string;
  isLoading?: boolean;
  isError?: boolean;
  type: string;
  citations?: CitationType[];
  tokens?: number;
};

// One Current Task inside a Main Step's performance breakdown.
export type ReportTaskType = {
  microStepId: number;
  prompt: string | null;
  timeSpentSeconds: number;
  expectedTimeSeconds: number | null;
  score: number;
  hintsRequested: number;
  highestHintLevel: number;
  helpUsed: boolean;
  hintPenalty: number;
  helpPenalty: number;
  timeScore: number | null;
  equipmentMistakes: number;
  chemicalMistakes: number;
};

// One Main Step's deterministic performance breakdown (backend reportAnalyticsService).
export type ReportStepType = {
  stepId: number;
  title: string;
  timeSpentSeconds: number;
  expectedTimeSeconds: number | null;
  score: number;
  timeScore: number | null;
  hintsRequested: number;
  highestHintLevel: number;
  helpUsed: boolean;
  retries: number;
  equipmentMistakes: number;
  chemicalMistakes: number;
  hintPenalty: number;
  helpPenalty: number;
  conceptualErrorCount: number;
  proceduralErrorCount: number;
  struggleIndex: number;
  status: "Strong" | "Good" | "Fair" | "Challenging";
  reasons: string[];
  tasks: ReportTaskType[];
};

export type LabReportType = {
  experimentName: string;
  subject: string;
  studentActions: {
    actionType: string;
    stepId: number;
    equipment: string | null;
    chemicals: string[];
    quantity: number | null;
    unit: string | null;
    timestamp: string;
  }[];
  equipmentUsed: string[];
  chemicalsUsed: { _id: string; name: string; symbol: string }[];
  procedureFollowed: { stepId: number; title: string; instruction: string }[];
  observations: string[];
  errorsDetected: {
    // Grouped + student-readable (backend reportAnalyticsService) — never a raw action code.
    procedural: { stepId: number; stepTitle: string; message: string; count: number }[];
    conceptual: { code: string; description: string; relatedStep: number | null; correctionStrategy: string }[];
  };
  aiFeedback: {
    // Phase 3 — LLM turns the deterministic analytics into prose; it never computes numbers.
    summary: string;
    strengths: string[]; // specific things done well
    struggleAnalysis?: string[]; // one entry per most-struggled step, parallel to mostStruggledSteps
    recommendations?: string[]; // actionable next steps (preferred over `suggestions`)
    suggestions: string[]; // legacy rule-based tips
  };
  conceptsToImprove: string[];
  // "What We Noticed" — misconceptions the Bayesian model inferred from the student's bench
  // actions (backend studentModelService). Only present for a treatment-arm session with the
  // model driving the diagnosis; null/absent otherwise. `probability` 0–1, `signalCount` = how
  // many bench actions pointed to it, `firstSeenStep` = the step it first showed up on.
  misconceptionInsight?: {
    cluster: string | null;
    items: {
      code: string;
      title: string | null;
      description: string | null;
      correctionStrategy: string | null;
      probability: number;
      signalCount: number;
      firstSeenStep: number | null;
    }[];
  } | null;
  // Curriculum placement of the whole practical — "this practical is covered by <lesson>, pp. A–B
  // of the <textbook>". Shown regardless of performance. null until the curriculum map is synced.
  practicalReference?: {
    bookTitle: string | null;
    lessonTitle: string;
    sectionTitle: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    displayText: string;
  } | null;
  // Extra textbook pages for the specific steps the student struggled on. Empty when they didn't
  // struggle, or until the curriculum map is synced.
  followUpReading?: {
    stepId: number | null;
    stepTitle: string | null;
    bookTitle: string | null;
    lessonTitle: string;
    sectionTitle: string | null;
    pageStart: number | null;
    pageEnd: number | null;
  }[];
  finalUnderstandingAssessment: string | null;
  // Final score = round(performanceScore * 0.90 + timeScore * 0.10), or performanceScore alone
  // when timeScore is null (practical has no expected-duration config). All computed once at
  // completion (backend labScoringService) — the report endpoint only reads these.
  score: number;
  performanceScore?: number;
  timeScore?: number | null;
  totalHintPenalty?: number; // sum of per-task cumulative hint penalties
  totalHelpPenalty?: number; // sum of per-task Help penalties (-5 each)
  totalTime: number; // wall-clock session duration, seconds
  totalActiveTime?: number; // summed active Current-Task time, seconds
  // Per-Main-Step performance breakdown (empty for unmigrated practicals) + the deterministic
  // struggle ranking + guidance summary. All from the backend reportAnalyticsService — no LLM.
  stepBreakdown?: ReportStepType[];
  mostStruggledSteps?: { stepId: number; title: string; struggleIndex: number; reasons: string[] }[];
  guidanceSummary?: {
    hint1Count: number;
    hint2Count: number;
    hint3Count: number;
    helpCount: number;
    totalDeduction: number;
  };
  // Per-Current-Task breakdown (research-facing; the UI uses stepBreakdown.tasks instead).
  microStepBreakdown?: {
    stepId: number;
    microStepId: number;
    equipmentMistakes: number;
    chemicalMistakes: number;
    hintsRequested: number;
    highestHintLevel: number;
    helpUsed: boolean;
    solvedIndependently: boolean;
    timeSpentSeconds: number;
    taskScore: number;
    hintPenalty: number;
    helpPenalty: number;
    timeScore: number | null;
    expectedTimeSeconds: number | null;
  }[];
};

// ── Lab → Notes handoff (Phase 4) ────────────────────────────────────────────────────────────
// Normalized, self-contained student-performance context. The Lab feature fetches this by
// sessionId and hands it to the Notes feature — the Lab does NOT generate the note. All fields
// are pre-computed/verified (Phase 1 scoring, Phase 2 analytics, Phase 3 LLM prose).
export type LabNoteContextType = {
  source: "lab_practical";
  sessionId: string;
  experimentId: string | null;
  experimentName: string;
  subject: string | null;
  grade: number | null;
  completedAt: string | null;

  finalScore: number;
  performanceScore: number;
  timeScore: number | null;
  totalTimeSeconds: number;
  totalActiveTimeSeconds: number;

  understanding: string | null;
  summary: string | null;
  strengths: string[];
  struggleAnalysis: string[];
  recommendations: string[];
  conceptsToImprove: string[];

  stepPerformance: {
    stepId: number;
    title: string;
    timeSpentSeconds: number;
    score: number;
    hintsUsed: number;
    helpUsed: boolean;
    retries: number;
    equipmentMistakes: number;
    chemicalMistakes: number;
    status: "Strong" | "Good" | "Fair" | "Challenging";
  }[];
  mostStruggledSteps: { stepId: number; title: string; reasons: string[] }[];
  misconceptions: { code: string; description: string; relatedStep: number | null; correctionStrategy: string }[];
  proceduralErrors: { stepId: number; stepTitle: string; message: string; count: number }[];
  curriculumReference: {
    bookTitle: string | null;
    lessonTitle: string;
    sectionTitle: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    displayText: string;
  } | null;
};
