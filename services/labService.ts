import axiosInstance from "@/providers/axios";
import { LabActionType, LabRunType, MixRequestType, ReactionResultType } from "@/types";

export const startLabRun = async (): Promise<LabRunType> => {
  const response = await axiosInstance.post("/api/lab/runs");
  return response.data.data;
};

export const fetchLabRun = async (id: string): Promise<LabRunType> => {
  const response = await axiosInstance.get(`/api/lab/runs/${id}`);
  return response.data.data;
};

export const logLabAction = async (id: string, action: Partial<LabActionType>): Promise<LabRunType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/action`, action);
  return response.data.data;
};

export const mixChemicals = async (id: string, request: MixRequestType): Promise<ReactionResultType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/mix`, request);
  return response.data.data;
};

export const completeLabRun = async (id: string): Promise<LabRunType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${id}/complete`);
  return response.data.data;
};
