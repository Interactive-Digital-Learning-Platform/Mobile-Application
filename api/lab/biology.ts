import { labClient } from "@/api/apiClients";
import { BiologyVisualizationDetailType, BiologyVisualizationSummaryType, GenerateVisualizationResponseType } from "@/types/lab";

// --- Biology Concept Visualizations ---

export const fetchBiologyVisualizations = async (): Promise<BiologyVisualizationSummaryType[]> => {
  const response = await labClient.get("/biology");
  return response.data.data;
};

export const fetchBiologyVisualizationById = async (id: string): Promise<BiologyVisualizationDetailType> => {
  const response = await labClient.get(`/biology/${id}`);
  return response.data.data;
};

// Not persisted server-side — see GeneratedVisualizationContentType. On a 429 (daily limit) or
// 503 (generation failed) the promise rejects with an axios error whose
// `error.response.data.message` is the user-facing string to show.
export const generateBiologyVisualization = async (question: string): Promise<GenerateVisualizationResponseType> => {
  const response = await labClient.post("/biology/generate", { question });
  return response.data.data;
};
