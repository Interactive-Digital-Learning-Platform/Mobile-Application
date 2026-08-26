import { labClient } from "@/api/apiClients";
import { BiologyVisualizationDetailType, BiologyVisualizationSummaryType } from "@/types/lab";

// --- Biology Concept Visualizations ---

export const fetchBiologyVisualizations = async (): Promise<BiologyVisualizationSummaryType[]> => {
  const response = await labClient.get("/biology");
  return response.data.data;
};

export const fetchBiologyVisualizationById = async (id: string): Promise<BiologyVisualizationDetailType> => {
  const response = await labClient.get(`/biology/${id}`);
  return response.data.data;
};
