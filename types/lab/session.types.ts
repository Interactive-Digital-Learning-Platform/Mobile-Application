import { ReactionResultType } from "./chemical.types";
import { InterventionType } from "./lab-run.types";

// --- Session history / dashboard stats (GET /api/sessions/history, /api/sessions/stats) ---

export type SessionHistoryFilterType = {
  subject?: string;
  grade?: number;
  status?: "in_progress" | "completed" | "abandoned";
  dateFrom?: string;
  dateTo?: string;
  scoreMin?: number;
  scoreMax?: number;
  page?: number;
  limit?: number;
};

export type SessionHistoryItemType = {
  _id: string;
  score: number;
  totalTime: number;
  createdAt: string;
  attemptNumber: number;
  aiFeedback: { summary: string | null };
  // Nullable: a populate() against a deleted/re-seeded Experiment resolves to null rather than
  // throwing — getSessionStats hits this directly (getUserSessions' aggregation instead drops
  // such rows via $unwind, so history list items are never null here in practice).
  experimentId: { _id: string; title: string; subject: string; difficulty: string; thumbnailColor: string } | null;
};

export type SessionHistoryResponseType = {
  data: SessionHistoryItemType[];
  pagination: { total: number; page: number };
};

export type SessionStatsType = {
  bestScore: number | null;
  completedCount: number;
  lastCompletedPractical: SessionHistoryItemType | null;
};

// Computed, already-safe "what to show right now" block from GET /api/sessions/:id — spares the
// frontend from locating the current Main Step/Current Task inside the (separately-fetched, more
// heavily filtered) experiment doc itself. `task` is null for a Main Step with no microSteps
// defined (unmigrated practicals) — the workspace then falls back to showing just the Main Step.
export type CurrentTaskType = {
  mainStep: { stepId: number; title: string; instruction: string; order: number; totalMainSteps: number };
  task: { microStepId: number; prompt: string; order: number; totalMicroSteps: number } | null;
} | null;

export type SessionType = {
  _id: string;
  userId: string;
  experimentId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  // Which Current Task within currentStep the student is on — server-authoritative, resets to 1
  // whenever currentStep advances. Irrelevant/unused for a step with no microSteps.
  currentMicroStep: number;
  currentTask: CurrentTaskType;
  score: number;
  phase: "equipment_selection" | "chemical_selection" | "procedure" | "completed";
  equipmentSelection?: { selected: string[] };
  chemicalSelection?: { selected: string[] };
  // Compounds built via the Compound Builder never enter chemicalSelection.selected (building
  // satisfies the requirement instead of tapping a chip) — read this separately for anything
  // that needs the student's *full* material set, e.g. the workspace's materials shelf.
  builtCompounds?: { chemical: string; attempts: number; completedAt: string | null }[];
  labRunId?: string | null;
};

// Chemical selection is non-blocking (like equipment selection): every submission advances the
// student into the workspace. `complete` is purely informational now — it drives the tone of the
// transient feedback note, not whether the student may proceed.
export type SelectionResultType =
  | { complete: true; correct: string[]; unnecessaryCount?: 0; missingCount: 0; missingBuildsCount: 0; nextPhase: string; alreadyEntered?: boolean }
  | {
      complete: false;
      correct: string[];
      unnecessaryItems: string[];
      missingCount: number;
      missingBuildsCount: number;
      hint: string | null;
      nextPhase?: string;
      alreadyEntered?: boolean;
    };

// Equipment selection is a learning/preparation step, not a gate — every submission (with at
// least one item picked) advances the student, so unlike SelectionResultType above there's no
// "complete: false" branch that blocks anything. `fullyCorrect` is purely informational.
export type EquipmentSelectionResultType = {
  fullyCorrect: boolean;
  correct: string[];
  missingCount: number;
  unnecessaryItems: string[];
  hint: string | null;
  nextPhase: string;
};

export type LogStepActionRequestType = {
  stepId: number;
  // Advisory only — the server always grades against session.currentMicroStep for this step
  // (see resolveGradingTarget in session.controller.js), never trusts this value to pick which
  // Current Task is "current." Included so it's echoed back in the logged Action for analytics.
  microStepId?: number | null;
  actionType: "correct" | "incorrect" | "skipped" | "repeated";
  equipmentType?: string | null;
  chemicalIds?: string[];
  quantity?: number;
  unit?: string;
  conditions?: { heated?: boolean };
  timeTaken?: number;
};

// Client-side only — an AI hint queued in the workspace's Hint Center (see HintCenterPanel).
// Built from an InterventionType.hint (auto-triggered by mistakes) or requestHint's hintText
// (student-requested); never sent over the network itself.
// Non-answer recovery hint from the backend (currently only "open_material_library"). Set when a
// required material is genuinely absent from the lab — lets the Hint Center offer an action
// button. Never carries the material's name/id.
export type HintSuggestedActionType = "open_material_library" | null;

// A pointer into the ingested Grade 10/11 curriculum ("read <lesson>, pp. X–Y of <book>"),
// attached by the backend to hint responses (level >= 2) and to proactive interventions on a
// repeated struggle. Precomputed offline — see the lab service's curriculumReferenceService.js.
// Not an answer: it says where to read, never what to do.
export type CurriculumReferenceType = {
  bookTitle: string | null;
  lessonTitle: string;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  displayText: string;
};

export type HintNotificationType = {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  suggestedAction?: HintSuggestedActionType;
  curriculumReference?: CurriculumReferenceType | null;
};

// Physics sibling of ReactionResultType — the bench-computed answer for a measurement microStep
// (period->g, spring constant, density...) compared against the student's submitted quantity. See
// mechanicsEngine.js's resolvePhysicsMeasurement and its call site in session.controller.js's logAction.
export type MeasurementResultType = {
  metric: string | null;
  expectedValue: number | null;
  studentValue: number | null;
  correct: boolean;
  reason: string | null;
} | null;

export type LogStepActionResponseType = {
  data: { actionType: string };
  meta: {
    suggestHint: boolean;
    stepErrors: number;
    currentStep: number;
    // Where the server put the student after this action — 1 the instant currentStep also
    // advanced (a new Main Step always starts its Current Tasks over from 1).
    currentMicroStep: number;
    reactionResult: ReactionResultType | null;
    measurementResult: MeasurementResultType;
    intervention: InterventionType;
    // True once this Current Task's highest shown hint level has reached 3 — gates the Help
    // button in HintCenterPanel. See requestHelp in session.controller.js for the matching
    // server-side check.
    helpAvailable: boolean;
  };
};

export type HintResponseType = {
  hintLevel: number;
  hintText: string;
  stepId: number;
  microStepId: number | null;
  helpAvailable: boolean;
  suggestedAction?: HintSuggestedActionType;
  // Textbook lesson/page pointer — present from hint level 2 when a confident curriculum match
  // exists, null otherwise (e.g. a Grade 11 practical before the Grade 11 textbook is ingested).
  curriculumReference?: CurriculumReferenceType | null;
};

// POST /api/sessions/:id/help — the answer reveal, only reachable after hint level 3. Chemicals
// are plain {name, symbol} (not full ChemicalType) since that's all requestHelp populates.
export type HelpRevealType = {
  stepId: number;
  microStepId: number | null;
  equipment: string[];
  chemicals: { name: string; symbol: string }[];
  // The exact action to perform, derived server-side from the hidden requirements + the live
  // bench (correct container instance, its contents, transfer tool, quantity). Falls back to
  // `explanation` when nothing more specific can be synthesised.
  actionInstruction: string | null;
  // Ordered short sequence for multi-action tasks (fill → move → dispense); [] otherwise.
  actionSteps: string[];
  explanation: string;
};
