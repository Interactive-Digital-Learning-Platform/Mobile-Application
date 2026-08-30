import { labClient } from "@/api/apiClients";
import {
  EquipmentSelectionResultType,
  HelpRevealType,
  HintResponseType,
  LabNoteContextType,
  LabReportType,
  LogStepActionRequestType,
  LogStepActionResponseType,
  SelectionResultType,
  SessionHistoryFilterType,
  SessionHistoryResponseType,
  SessionStatsType,
  SessionType,
} from "@/types/lab";

// --- Sessions (guided experiment flow) ---

export const startSession = async (experimentId: string): Promise<SessionType> => {
  const response = await labClient.post("/sessions/start", { experimentId });
  return response.data.data;
};

export const fetchSession = async (sessionId: string): Promise<SessionType> => {
  const response = await labClient.get(`/sessions/${sessionId}`);
  return response.data.data;
};

export const submitEquipmentSelection = async (
  sessionId: string,
  selectedEquipment: string[],
): Promise<EquipmentSelectionResultType> => {
  const response = await labClient.post(`/sessions/${sessionId}/equipment-selection`, {
    selectedEquipment,
  });
  return response.data.data;
};

export const submitChemicalSelection = async (
  sessionId: string,
  selectedChemicalIds: string[],
): Promise<SelectionResultType> => {
  const response = await labClient.post(`/sessions/${sessionId}/chemical-selection`, {
    selectedChemicalIds,
  });
  return response.data.data;
};

export const logStepAction = async (
  sessionId: string,
  payload: LogStepActionRequestType,
): Promise<LogStepActionResponseType> => {
  const response = await labClient.post(`/sessions/${sessionId}/action`, payload);
  return response.data;
};

// microStepId is advisory only (see LogStepActionRequestType) — the server always hints/reveals
// against session.currentMicroStep for stepId, never trusts a client-passed value to pick which
// Current Task is "current." Passed through anyway so it's available for any client-side logging.
export const requestStepHint = async (
  sessionId: string,
  stepId: number,
  microStepId?: number | null,
): Promise<HintResponseType> => {
  const response = await labClient.post(`/sessions/${sessionId}/hint`, { stepId, microStepId });
  return response.data.data;
};

export const requestStepHelp = async (
  sessionId: string,
  stepId: number,
  microStepId?: number | null,
): Promise<HelpRevealType> => {
  const response = await labClient.post(`/sessions/${sessionId}/help`, { stepId, microStepId });
  return response.data.data;
};

export const completeSession = async (
  sessionId: string,
): Promise<{
  score: number;
  performanceScore?: number;
  timeScore?: number | null;
  totalTime: number;
  totalActiveTime?: number;
}> => {
  const response = await labClient.post(`/sessions/${sessionId}/complete`);
  return response.data.data;
};

// Lab → Notes handoff (Phase 4). The Notes feature calls this by sessionId to build a
// personalized revision note — the Lab side never generates the note itself.
export const fetchLabNoteContext = async (sessionId: string): Promise<LabNoteContextType> => {
  const response = await labClient.get(`/sessions/${sessionId}/note-context`);
  return response.data.data;
};

export const fetchSessionReport = async (sessionId: string): Promise<LabReportType> => {
  const response = await labClient.get(`/sessions/${sessionId}/report`);
  return response.data.data;
};

export const fetchSessionHistory = async (
  filters: SessionHistoryFilterType,
): Promise<SessionHistoryResponseType> => {
  const response = await labClient.get("/sessions/history", { params: filters });
  return response.data;
};

export const fetchSessionStats = async (): Promise<SessionStatsType> => {
  const response = await labClient.get("/sessions/stats");
  return response.data.data;
};
