import axiosInstance from "@/providers/axios";
import { LabRunType, LogLabActionRequestType, LogLabActionResponseType, MixRequestType, ReactionResultType } from "@/types";

export const startLabRun = async (sessionId?: string): Promise<LabRunType> => {
  const response = await axiosInstance.post("/api/lab/runs", sessionId ? { sessionId } : {});
  return response.data.data;
};

export const fetchLabRun = async (id: string): Promise<LabRunType> => {
  const response = await axiosInstance.get(`/api/lab/runs/${id}`);
  return response.data.data;
};

export const logLabAction = async (id: string, action: LogLabActionRequestType): Promise<LogLabActionResponseType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/action`, action);
  return {
    labRun: response.data.data,
    reactionResult: response.data.meta?.reactionResult ?? null,
    intervention: response.data.meta?.intervention ?? null,
  };
};

export const mixChemicals = async (id: string, request: MixRequestType): Promise<ReactionResultType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/mix`, request);
  return response.data.data;
};

export const completeLabRun = async (id: string): Promise<LabRunType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/complete`);
  return response.data.data;
};
