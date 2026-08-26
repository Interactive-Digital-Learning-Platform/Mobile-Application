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

export type BiologyVisualizationStageType = {
  stageId: number;
  title: string;
  durationMs: number;
  explanation: string;
  componentIds: string[];
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
