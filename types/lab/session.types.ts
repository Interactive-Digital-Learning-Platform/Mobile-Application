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

export type SessionType = {
  _id: string;
  userId: string;
  experimentId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
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

export type SelectionResultType =
  | { complete: true; correct: string[]; unnecessaryCount: 0; missingCount: 0; missingBuildsCount: 0; nextPhase: string }
  | {
      complete: false;
      correct: string[];
      unnecessaryItems: string[];
      missingCount: number;
      missingBuildsCount: number;
      hint: string;
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
export type HintNotificationType = {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
};

export type LogStepActionResponseType = {
  data: { actionType: string };
  meta: {
    suggestHint: boolean;
    stepErrors: number;
    currentStep: number;
    reactionResult: ReactionResultType | null;
    intervention: InterventionType;
  };
};

export type HintResponseType = {
  hintLevel: number;
  hintText: string;
  stepId: number;
};
