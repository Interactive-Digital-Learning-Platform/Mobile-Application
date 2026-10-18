import { labClient, getLabResourceUrl } from "@/api/apiClients";
import { ChemicalType, CompoundBuildRequestType, CompoundBuildResultType, CompoundBuildTemplateType } from "@/types/lab";

// --- Chemicals ---

export type ChemicalFilters = {
  search?: string;
  category?: string;
  state?: string;
};

// The API returns `imageUrl` as either an absolute URL or a lab-relative media path; resolve it
// once here so the rest of the app treats `chemical.imageUrl` as a ready-to-load string.
const resolveArtwork = (c: ChemicalType): ChemicalType => ({
  ...c,
  imageUrl: c.imageUrl ? getLabResourceUrl(c.imageUrl) : null,
});

export const fetchChemicals = async (filters: ChemicalFilters = {}): Promise<ChemicalType[]> => {
  const response = await labClient.get("/chemicals", { params: filters });
  return (response.data.data as ChemicalType[]).map(resolveArtwork);
};

export const fetchChemicalById = async (id: string): Promise<ChemicalType> => {
  const response = await labClient.get(`/chemicals/${id}`);
  return resolveArtwork(response.data.data as ChemicalType);
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
