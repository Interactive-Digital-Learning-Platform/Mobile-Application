import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchBiologyVisualizationById, fetchBiologyVisualizations, generateBiologyVisualization } from "@/api/lab";

export const useBiologyVisualizations = () => {
  return useQuery({
    queryKey: ["biologyVisualizations"],
    queryFn: fetchBiologyVisualizations,
  });
};

export const useBiologyVisualization = (id: string | undefined) => {
  return useQuery({
    queryKey: ["biologyVisualization", id],
    queryFn: () => fetchBiologyVisualizationById(id as string),
    enabled: !!id,
  });
};

export const useGenerateBiologyVisualization = () => {
  return useMutation({
    mutationFn: generateBiologyVisualization,
  });
};
