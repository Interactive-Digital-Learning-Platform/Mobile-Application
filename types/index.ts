import { ViewStyle, TextStyle, ImageSourcePropType } from "react-native";
import { type LucideIcon } from "lucide-react-native";

// ── Base UI Types ──────────────────────────────────────────────

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

// ── Auth Types ─────────────────────────────────────────────────

export type signUpFormValues = {
  username: string,
  email: string,
  password: string
}

export type signInFormValues = {
  email: string,
  password: string
}

// ── AI & Chat Types ────────────────────────────────────────────

export type CitationType = {
  title: string,
  from : string,
  content: string
}

export type MessageType = {
  id: string,
  createdAt : Date,
  role: "user" | "assistant" | "system",
  content: string,
  isLoading? : boolean,
  isError? : boolean,
  type: "text" | "code" | "image",
  citations? : CitationType[],
  tokens?: number
}

// ── Science Lab Domain Types ──────────────────────────────────────────────

export type HintType = { level: 1 | 2 | 3; text: string };

export type ExperimentStep = {
  stepId: number;
  title: string;
  instruction: string;
  expectedAction: string;
  actionType: string;
  timeLimit: number;
  hints: HintType[];
  misconceptionRisks: string[];
  isOptional?: boolean;
};

export type ExperimentType = {
  _id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Biology";
  grades: number[];
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: number;
  description: string;
  objectives: string[];
  materials: string[];
  steps: ExperimentStep[];
  thumbnailColor: string;
  commonMisconceptions: string[];
  userAttempts?: number;
  averageScore?: number;
};

export type MisconceptionDetected = {
  code: string;
  description: string;
  relatedStep: number | null;
  correctionStrategy: string;
};

export type AIFeedbackType = {
  summary: string;
  misconceptionsDetected: MisconceptionDetected[];
  strengths: string[];
  suggestions: string[];
  feedbackGeneratedAt: string;
};

export type SessionType = {
  _id: string;
  experimentId: ExperimentType;
  score: number;
  totalTime: number;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  behaviorFeatures: {
    totalErrors: number;
    totalHintsRequested: number;
    totalRetries: number;
    errorRate: number;
    struggledSteps: number[];
  };
  aiFeedback: AIFeedbackType;
  attemptNumber: number;
  createdAt: string;
};

export type ActionPayload = {
  stepId: number;
  actionType: "correct" | "incorrect" | "skipped" | "hint_requested" | "step_started" | "step_completed";
  actionDetail?: string;
  expectedAction?: string;
  timeTaken?: number;
  conceptViolated?: string;
};
