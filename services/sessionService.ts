import axiosInstance from "@/providers/axios";
import {
  HintResponseType,
  LabReportType,
  LogStepActionRequestType,
  LogStepActionResponseType,
  SelectionResultType,
  SessionType,
} from "@/types";

export const startSession = async (experimentId: string): Promise<SessionType> => {
  const response = await axiosInstance.post("/api/sessions/start", { experimentId });
  return response.data.data;
};

export const fetchSession = async (sessionId: string): Promise<SessionType> => {
  const response = await axiosInstance.get(`/api/sessions/${sessionId}`);
  return response.data.data;
};

export const submitEquipmentSelection = async (sessionId: string, selectedEquipment: string[]): Promise<SelectionResultType> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/equipment-selection`, { selectedEquipment });
  return response.data.data;
};

export const submitChemicalSelection = async (sessionId: string, selectedChemicalIds: string[]): Promise<SelectionResultType> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/chemical-selection`, { selectedChemicalIds });
  return response.data.data;
};

export const logStepAction = async (
  sessionId: string,
  payload: LogStepActionRequestType
): Promise<LogStepActionResponseType> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/action`, payload);
  return response.data;
};

export const requestStepHint = async (sessionId: string, stepId: number): Promise<HintResponseType> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/hint`, { stepId });
  return response.data.data;
};

export const completeSession = async (sessionId: string): Promise<{ score: number; totalTime: number }> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/complete`);
  return response.data.data;
};

export const fetchSessionReport = async (sessionId: string): Promise<LabReportType> => {
  const response = await axiosInstance.get(`/api/sessions/${sessionId}/report`);
  return response.data.data;
};
