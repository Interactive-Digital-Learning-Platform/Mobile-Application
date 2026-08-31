// --- Lab Tutor chat domain types ---
//
// Post-practical report types moved to ./report.types.ts (still re-exported from @/types/lab).

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
