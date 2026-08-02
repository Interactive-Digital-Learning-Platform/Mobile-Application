import axiosInstance from "@/providers/axios";
import { CompoundBuildRequestType, CompoundBuildResultType, CompoundBuildTemplateType } from "@/types";

export const fetchCompoundBuildTemplate = async (
  experimentId: string,
  compoundId: string
): Promise<CompoundBuildTemplateType> => {
  const response = await axiosInstance.get(`/api/experiments/${experimentId}/compounds/${compoundId}/build-template`);
  return response.data.data;
};

export const submitCompoundBuild = async (
  sessionId: string,
  payload: CompoundBuildRequestType
): Promise<CompoundBuildResultType> => {
  const response = await axiosInstance.post(`/api/sessions/${sessionId}/compound-builds`, payload);
  return response.data.data;
};
