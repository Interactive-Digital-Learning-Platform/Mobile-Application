import { ViewStyle, TextStyle, ImageSourcePropType } from "react-native";
import { LucideIcon } from "lucide-react-native";
import z from "zod";
import { messageSchema } from "@/schemas/messageSchemas";

export type customButtonType = {
  title: string;
  handlePress: () => void;
  buttonStyles?: ViewStyle;
  isLoading?: boolean;
  textStyles?: TextStyle;
  image?: ImageSourcePropType;
  backgroundColor?: string;
  borderColor?: string;
};

export type HeaderProps = {
  IconComponent?: LucideIcon;
  title?: string;
  onIconPress?: () => void;
};

export type signUpFormValues = {
  username: string,
  email: string,
  password: string
}

export type signInFormValues = {
  email: string,
  password: string
}

export type TabIconType = {
  icon : ImageSourcePropType,
  name : string,
  color : string,
  focused: boolean
}

export type QuickActionType = {
  icon: LucideIcon,
  title : string,
  prompt : string,
  get?: () => string
}

export type CitationType = {
  title: string,
  from : string,
  content: string
}

export type MessageType = {
  id: string,
  createdAt : Date,
  role: string,
  content: string,
  isLoading? : boolean,
  isError? : boolean,
  type: string,
  citations? : CitationType[],
  tokens?: number
}

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
  category: ChemicalCategory;
  chemicalType: ChemicalKind;
  isBuildableFromElements?: boolean;
  state: ChemicalState;
  color: string;
  concentration?: string | null;
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

export type EquipmentInstanceType = {
  equipmentType: string;
  position?: { x: number; y: number };
  chemicalIds: string[];
  temperature?: number | null;
};

export type LabActionType = {
  actionType: "add_chemical" | "remove_chemical" | "mix" | "heat" | "cool" | "stir" | "measure" | "pour" | "reset";
  equipment?: string | null;
  chemicalIds?: string[];
  quantity?: number | null;
  unit?: string | null;
  temperature?: number | null;
  reactionId?: string | null;
  resultType?: "reaction_success" | "no_reaction" | null;
  timestamp: string;
};

export type LabRunType = {
  _id: string;
  userId: string;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  endedAt?: string | null;
  equipmentState: Record<string, EquipmentInstanceType>;
  actions: LabActionType[];
  reactionsTriggered: string[];
  tutorConversation: { role: "user" | "assistant"; content: string; timestamp: string }[];
};

export type MixRequestType = {
  equipment: string;
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
  type: "unknown_combination" | "unnecessary_heat" | "repeated_mistake";
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

