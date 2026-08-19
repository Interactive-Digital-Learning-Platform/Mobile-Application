import { labClient } from "@/api/apiClients";
import {
  EquipmentSelectionResultType,
  HintResponseType,
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

export const requestStepHint = async (
  sessionId: string,
  stepId: number,
): Promise<HintResponseType> => {
  const response = await labClient.post(`/sessions/${sessionId}/hint`, { stepId });
  return response.data.data;
};

export const completeSession = async (
  sessionId: string,
): Promise<{ score: number; totalTime: number }> => {
  const response = await labClient.post(`/sessions/${sessionId}/complete`);
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
