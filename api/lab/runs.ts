import { labClient } from "@/api/apiClients";
import {
  LabRunType,
  LogLabActionRequestType,
  LogLabActionResponseType,
  MixRequestType,
  ReactionResultType,
  TutorResponseType,
} from "@/types/lab";

// --- Lab runs (Live Bench) ---

export const startLabRun = async (sessionId?: string): Promise<LabRunType> => {
  const response = await labClient.post("/lab/runs", sessionId ? { sessionId } : {});
  return response.data.data;
};

export const fetchLabRun = async (id: string): Promise<LabRunType> => {
  const response = await labClient.get(`/lab/runs/${id}`);
  return response.data.data;
};

export const logLabAction = async (
  id: string,
  action: LogLabActionRequestType,
): Promise<LogLabActionResponseType> => {
  const response = await labClient.post(`/lab/runs/${id}/action`, action);
  return {
    labRun: response.data.data,
    reactionResult: response.data.meta?.reactionResult ?? null,
    intervention: response.data.meta?.intervention ?? null,
  };
};

export const mixChemicals = async (
  id: string,
  request: MixRequestType,
): Promise<ReactionResultType> => {
  const response = await labClient.post(`/lab/runs/${id}/mix`, request);
  return response.data.data;
};

export const completeLabRun = async (id: string): Promise<LabRunType> => {
  const response = await labClient.post(`/lab/runs/${id}/complete`);
  return response.data.data;
};

// --- AI Tutor ---

export const askLabTutor = async (
  labRunId: string,
  question: string,
): Promise<TutorResponseType> => {
  const response = await labClient.post(`/lab/runs/${labRunId}/tutor`, { question });
  return response.data.data;
};
