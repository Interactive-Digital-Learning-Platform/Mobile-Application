import { labClient } from "@/api/apiClients";
import { PracticalCatalogItemType, PracticalDetailType, PracticalInfoType, PracticalSummaryType } from "@/types/lab";

// --- Experiments (practicals) ---

export const fetchExperiments = async (subject: string): Promise<PracticalSummaryType[]> => {
  const response = await labClient.get("/experiments", { params: { subject } });
  return response.data.data;
};

// Grade-matched to the logged-in student and restricted to practicals with the guided
// equipment/chemical-selection flow set up — unlike fetchExperiments, this excludes legacy
// generic experiments that predate that flow.
export const fetchExperimentsBySubject = async (
  subject: string,
): Promise<PracticalCatalogItemType[]> => {
  const response = await labClient.get(`/experiments/subject/${subject}`);
  return response.data.data;
};

export const fetchExperimentById = async (id: string): Promise<PracticalDetailType> => {
  const response = await labClient.get(`/experiments/${id}`);
  return response.data.data;
};

export const fetchExperimentInfo = async (id: string): Promise<PracticalInfoType> => {
  const response = await labClient.get(`/experiments/${id}/info`);
  return response.data.data;
};
