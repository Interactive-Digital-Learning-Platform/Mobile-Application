import { ChemicalCategory, ChemicalState, SafetyClassification } from "./chemical.types";

// --- Practical (Experiment) domain types ---

export type PracticalSummaryType = {
  _id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Biology";
  grades: number[];
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: number;
  description: string;
  thumbnailColor: string;
  // Syllabus topic this practical sits under (e.g. "Acids, Bases and Salts") — GET /api/experiments
  // returns it (it's not one of the answer-bearing excluded fields). May be "" for older docs.
  lesson?: string;
};

// A single "Current Task" within a Main Step — safe subset only. No expectedIntent/expected
// equipment/expected chemicals/hints/exactAnswer here; those are answer-bearing and the backend
// never sends them (see the field-exclusion selects in experiment.controller.js /
// session.controller.js). studentPrompt is deliberately vague about the actual answer — see
// workspace.tsx's "CURRENT TASK" block.
export type PracticalMicroStepType = {
  microStepId: number;
  studentPrompt: string;
  // Safe to expose — mirrors the already-public step-level `actionType: "mix"` one level down.
  // Tells the workspace this task auto-completes the instant a reaction fires on the live bench
  // (see LabWorkspace's continuous reaction check), not what to add to trigger it.
  requiresReactionCheck?: boolean;
  // Physics sibling of requiresReactionCheck — tells the workspace this task expects a typed-in
  // calculated answer (e.g. "calculate g"), checked server-side against the bench's own reading
  // (see mechanicsEngine.js). expectedMeasurement itself (the answer) stays server-only.
  requiresMeasurementCheck?: boolean;
};

export type PracticalStepType = {
  stepId: number;
  title: string;
  instruction: string;
  actionType: "measure" | "add" | "observe" | "record" | "calculate" | "setup" | "mix" | "heat" | "filter" | "pour" | "stir";
  timeLimit: number;
  isOptional: boolean;
  // Absent/empty for practicals not yet migrated to the micro-step workflow — the workspace then
  // falls back to showing just the Main Step, exactly as it did before this feature existed.
  microSteps?: PracticalMicroStepType[];
  // Electricity (Phase B) only: when set, the workspace mounts CircuitBoard.tsx instead of the
  // free-bench LabWorkspace for this step — see circuitBoards.constants.ts for the layout.
  circuitBoardId?: string | null;
};

// Returned by GET /api/experiments/subject/:subject — grade-matched to the logged-in student and
// restricted to practicals that actually have the guided equipment/chemical-selection flow set up
// (excludes legacy generic experiments predating that flow). Distinct field set from
// PracticalSummaryType (no `subject`, since the caller already knows it; adds totalAttempts/averageScore).
export type PracticalCatalogItemType = {
  _id: string;
  title: string;
  grades: number[];
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: number;
  description: string;
  thumbnailColor: string;
  totalAttempts: number;
  averageScore: number;
};

export type PracticalDetailType = PracticalSummaryType & {
  objectives: string[];
  materials: string[];
  theory: string;
  keyConcepts: string[];
  steps: PracticalStepType[];
  relatedConcepts: { _id: string; name: string; description: string; simpleExplanation: string }[];
  expectedObservations: string[];
  safetyInformation: string[];
  userAttempts: number;
};

// --- "Learn Before You Experiment" pre-lab info (GET /api/experiments/:id/info) ---
// A deliberately different field set from PracticalDetailType/getExperimentById: this view is
// shown outside the equipment/chemical-selection UI, so it's safe (and useful) to reveal
// requiredEquipment/requiredChemicals here even though the guided flow's own experiment fetch
// withholds them to protect that phase's integrity.
export type RequiredChemicalInfoType = {
  chemical: {
    _id: string;
    name: string;
    symbol: string;
    formula: string | null;
    category: ChemicalCategory;
    state: ChemicalState;
    safetyClassification: SafetyClassification;
    hazardInfo: string[];
  };
  quantity: number | null;
  unit: string | null;
};

export type PracticalInfoType = {
  _id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Biology";
  grades: number[];
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: number;
  description: string;
  objectives: string[];
  lesson: string;
  theory: string;
  keyConcepts: string[];
  requiredEquipment: string[];
  requiredChemicals: RequiredChemicalInfoType[];
  expectedObservations: string[];
  safetyInformation: string[];
  thumbnailColor: string;
};
