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
