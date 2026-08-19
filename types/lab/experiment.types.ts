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
};

export type PracticalStepType = {
  stepId: number;
  title: string;
  instruction: string;
  actionType: "measure" | "add" | "observe" | "record" | "calculate" | "setup" | "mix" | "heat" | "filter" | "pour" | "stir";
  timeLimit: number;
  isOptional: boolean;
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
