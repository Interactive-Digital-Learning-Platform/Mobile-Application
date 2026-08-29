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
  // Curriculum placement of the whole practical — "this practical is covered by <lesson>, pp. A–B
  // of the <textbook>". Shown regardless of performance. null until the curriculum map is synced.
  practicalReference?: {
    bookTitle: string | null;
    lessonTitle: string;
    sectionTitle: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    displayText: string;
  } | null;
  // Extra textbook pages for the specific steps the student struggled on. Empty when they didn't
  // struggle, or until the curriculum map is synced.
  followUpReading?: {
    stepId: number | null;
    stepTitle: string | null;
    bookTitle: string | null;
    lessonTitle: string;
    sectionTitle: string | null;
    pageStart: number | null;
    pageEnd: number | null;
  }[];
  finalUnderstandingAssessment: string | null;
  score: number;
  totalTime: number;
};
