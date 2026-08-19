import { labClient } from "@/api/apiClients";
import { ChemicalType, CompoundBuildRequestType, CompoundBuildResultType, CompoundBuildTemplateType } from "@/types/lab";

// --- Chemicals ---

export type ChemicalFilters = {
  search?: string;
  category?: string;
  state?: string;
};

export const fetchChemicals = async (filters: ChemicalFilters = {}): Promise<ChemicalType[]> => {
  const response = await labClient.get("/chemicals", { params: filters });
  return response.data.data;
};

export const fetchChemicalById = async (id: string): Promise<ChemicalType> => {
  const response = await labClient.get(`/chemicals/${id}`);
  return response.data.data;
};

// --- Compound Builder ---

export const fetchCompoundBuildTemplate = async (
  experimentId: string,
  compoundId: string,
): Promise<CompoundBuildTemplateType> => {
  const response = await labClient.get(
    `/experiments/${experimentId}/compounds/${compoundId}/build-template`,
  );
  return response.data.data;
};

export const submitCompoundBuild = async (
  sessionId: string,
  payload: CompoundBuildRequestType,
): Promise<CompoundBuildResultType> => {
  const response = await labClient.post(`/sessions/${sessionId}/compound-builds`, payload);
  return response.data.data;
};
