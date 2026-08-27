// --- Biology Concept Visualization domain types ---
//
// Deliberately separate from the Experiment/Practical types (experiment.types.ts) — a
// visualization has no equipment/chemicals/bench grading, just stages, tappable components and
// optional knowledge-check questions. See AI-Guided-Virtual-Science-Lab-Service's
// BiologyVisualization model for the matching backend shape.

export type BiologyVisualizationComponentType = {
  componentId: string;
  label: string;
  shortInfo: string;
};

// One scene element in an AI-generated stage: a controlled-vocabulary asset performing a
// controlled-vocabulary action between two points (see backend's generatedVisualizationSchema.js
// — ASSET_TYPES/ACTION_TYPES there are the source of truth these string unions mirror). Absent
// entirely on predefined stages, which are rendered by their own hand-coded canvas instead.
export type GeneratedAssetType =
  | "sun"
  | "cloud"
  | "plant"
  | "leaf"
  | "root"
  | "stem"
  | "xylem"
  | "stomata"
  | "water_particle"
  | "water_vapour"
  | "oxygen_molecule"
  | "co2_molecule"
  | "blood_cell"
  | "alveolus"
  | "food_particle"
  | "enzyme";

export type GeneratedSceneActionType =
  | "appear"
  | "disappear"
  | "fadeIn"
  | "fadeOut"
  | "move"
  | "flow"
  | "particleFlow"
  | "arrowFlow"
  | "grow"
  | "shrink"
  | "pulse"
  | "rotate"
  | "highlight";

export type GeneratedSceneElementType = {
  elementId: string;
  assetType: GeneratedAssetType;
  action: GeneratedSceneActionType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type BiologyVisualizationStageType = {
  stageId: number;
  title: string;
  durationMs: number;
  explanation: string;
  componentIds: string[];
  // Only present on AI-generated visualizations — see GenericSceneCanvas.tsx.
  sceneElements?: GeneratedSceneElementType[];
};

export type BiologyLearningQuestionType = {
  question: string;
  options: string[];
  correctIndex: number;
  replayStageId: number | null;
};

// Returned by GET /api/biology (catalog) — summary fields only.
export type BiologyVisualizationSummaryType = {
  _id: string;
  title: string;
  description: string;
  animationKey: string;
  syllabusTopic: string;
  difficulty: "easy" | "medium" | "hard";
  durationSec: number;
  thumbnailColor: string;
  grades: number[];
};

// Returned by GET /api/biology/:id — full player detail.
export type BiologyVisualizationDetailType = BiologyVisualizationSummaryType & {
  learningObjective: string;
  keyConcept: string;
  stages: BiologyVisualizationStageType[];
  components: BiologyVisualizationComponentType[];
  learningQuestions: BiologyLearningQuestionType[];
};

// --- AI-generated visualization (POST /api/biology/generate) ---
//
// Not persisted (no _id) and not tied to a predefined canvas (no animationKey/grades) — the
// generate screen synthesizes placeholder values for those three fields before handing the
// object to VisualizationPlayer, so the player's prop type never needs to special-case this path.
export type GeneratedVisualizationContentType = Omit<BiologyVisualizationDetailType, "_id" | "animationKey" | "grades">;

export type GenerateVisualizationStatus = "supported" | "related" | "unsupported";

export type GenerateVisualizationResponseType = {
  status: GenerateVisualizationStatus;
  message?: string;
  visualization?: GeneratedVisualizationContentType;
};
