// --- Lab domain types ---

export type ChemicalCategory =
  | "acid" | "base" | "salt" | "metal" | "non-metal" | "metalloid" | "indicator" | "gas" | "organic" | "oxide";

export type ChemicalState = "solid" | "liquid" | "gas" | "aqueous";

export type SafetyClassification = "safe" | "caution" | "hazardous" | "corrosive" | "flammable" | "toxic";

// "element" = a raw first-20-syllabus-or-not element; "compound" = a substance made of multiple
// elements, either handed to the student ready-made or (if isBuildableFromElements) constructible
// via the Compound Builder from elements with atomicNumber <= 20.
export type ChemicalKind = "element" | "compound";

export type ChemicalType = {
  _id: string;
  name: string;
  symbol: string;
  formula: string | null;
  atomicNumber?: number | null;
  atomicMass?: number | null;
  group?: number | null;
  period?: number | null;
  electronConfiguration?: string | null;
  valency?: number | null;
  category: ChemicalCategory;
  chemicalType: ChemicalKind;
  isBuildableFromElements?: boolean;
  state: ChemicalState;
  color: string;
  concentration?: string | null;
  phValue?: number | null;
  safetyClassification: SafetyClassification;
  hazardInfo: string[];
  commonUses: string[];
  iconKey?: string | null;
};

export type ReactionEducationalInfo = {
  electronConfiguration?: string | null;
  lewisStructureDescription?: string | null;
  molecularGeometry?: string | null;
  bondType?: "ionic" | "covalent" | "polar covalent" | "metallic" | null;
  explanation: string;
};

export type ReactionObservableChanges = {
  colorChange: { from: string | null; to: string | null };
  gasProduced: boolean;
  gasName?: string | null;
  precipitateFormed: boolean;
  precipitateColor?: string | null;
  heatProduced: boolean;
  energyChange: "exothermic" | "endothermic" | "none";
};

export type ReactionResultType = {
  found: true;
  reaction: {
    id: string;
    name: string;
    balancedEquation: string;
    reactionType: string;
    products: { chemical: ChemicalType; coefficient: number }[];
    observableChanges: ReactionObservableChanges;
    educationalInfo: ReactionEducationalInfo;
    safetyNotes: string[];
  };
} | {
  found: false;
  reason: string;
  explanation?: string | null;
  hint?: string | null;
};

// One physical container/tool placed on the bench, keyed by a client-generated instanceId (not
// equipmentType) so multiple instances of the same type (two beakers) can coexist.
export type EquipmentContentType = { chemical: string; volume: number | null; mass: number | null };

export type LastMeasurementType = {
  measurementType: "ph" | null;
  value: number | null;
  targetId: string | null;
  measuredAt: string | null;
} | null;

export type EquipmentInstanceType = {
  instanceId: string;
  equipmentType: string;
  position: { x: number; y: number };
  contents: EquipmentContentType[];
  temperature: number;
  isHeated: boolean;
  // Probe-role equipment only (e.g. pH meter) — see PhMeterInstrument.tsx.
  probeTargetId?: string | null;
  lastMeasurement?: LastMeasurementType;
};

export type LabActionType = {
  actionType:
    | "create_equipment"
    | "move_equipment"
    | "remove_equipment"
    | "add_chemical"
    | "remove_chemical"
    | "mix"
    | "heat"
    | "cool"
    | "stir"
    | "measure"
    | "pour"
    | "reset"
    | "probe_measure"
    | "probe_detach";
  equipment?: string | null;
  chemicalIds?: string[];
  quantity?: number | null;
  unit?: string | null;
  temperature?: number | null;
  reactionId?: string | null;
  resultType?: "reaction_success" | "no_reaction" | null;
  timestamp: string;
};

// Request payloads for POST /api/lab/runs/:id/action — discriminated by actionType so each
// variant only allows the fields that endpoint actually reads (see labRun.controller.js).
export type LogLabActionRequestType =
  | { actionType: "create_equipment"; instanceId: string; equipmentType: string; position?: { x: number; y: number } }
  | { actionType: "move_equipment"; instanceId: string; position: { x: number; y: number } }
  | { actionType: "remove_equipment"; instanceId: string }
  | { actionType: "add_chemical"; instanceId: string; chemicalId: string; quantity?: number; unit?: string }
  | { actionType: "reset"; instanceId: string }
  | { actionType: "heat"; instanceId: string; heated?: boolean; temperature?: number }
  | { actionType: "probe_measure"; instanceId: string; targetInstanceId: string }
  | { actionType: "probe_detach"; instanceId: string };

// POST /api/lab/runs/:id/action now checks for a reaction continuously (add_chemical/heat), so
// the response carries the live bench state plus whatever the reaction engine found this time,
// plus a proactive AI Tutor safety check (see checkSafetyIntervention in labRun.controller.js).
export type LogLabActionResponseType = {
  labRun: LabRunType;
  reactionResult: ReactionResultType | null;
  intervention: InterventionType;
};

export type LabRunType = {
  _id: string;
  userId: string;
  sessionId?: string | null;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  endedAt?: string | null;
  equipment: EquipmentInstanceType[];
  actions: LabActionType[];
  reactionsTriggered: string[];
  tutorConversation: { role: "user" | "assistant"; content: string; timestamp: string }[];
};

export type MixRequestType = {
  instanceId: string;
  chemicalIds: string[];
  conditions?: { heated?: boolean; temperature?: number; stirred?: boolean };
};

export type TutorRequestType = {
  question: string;
};

export type TutorResponseType = {
  answer: string;
};

// --- Practical (Experiment/Session) domain types ---

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

export type PracticalDetailType = PracticalSummaryType & {
  objectives: string[];
  materials: string[];
  steps: PracticalStepType[];
  relatedConcepts: { _id: string; name: string; description: string; simpleExplanation: string }[];
  expectedObservations: string[];
  safetyInformation: string[];
  userAttempts: number;
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

// --- Compound Builder domain types ---

export type CompoundBuildParticipantType = {
  chemicalId: string;
  name: string;
  symbol: string;
  color: string;
};

export type CompoundBuildTemplateType = {
  compound: { _id: string; name: string; symbol: string; formula: string | null; color: string };
  reactants: CompoundBuildParticipantType[];
  products: CompoundBuildParticipantType[];
  coefficientOptions: number[];
};

export type CompoundBuildRequestType = {
  compoundId: string;
  reactantCoefficients: { chemicalId: string; coefficient: number }[];
  productCoefficient: number;
};

export type CompoundBuildResultType =
  | {
      correct: true;
      attempts: number;
      compound: { name: string; symbol: string };
      balancedEquation: string;
      educationalInfo: ReactionEducationalInfo;
    }
  | { correct: false; attempts: number; hint: string };

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

export type InterventionType = {
  type: "unknown_combination" | "unnecessary_heat" | "heating_empty_container" | "repeated_mistake";
  hint: string;
} | null;

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
    procedural: { stepId: number; detail: string }[];
    conceptual: { code: string; description: string; relatedStep: number | null; correctionStrategy: string }[];
  };
  aiFeedback: {
    summary: string;
    strengths: string[];
    suggestions: string[];
  };
  conceptsToImprove: string[];
  finalUnderstandingAssessment: string | null;
  score: number;
  totalTime: number;
};
