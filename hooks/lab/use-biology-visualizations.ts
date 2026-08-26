import { useQuery } from "@tanstack/react-query";
import { fetchBiologyVisualizationById, fetchBiologyVisualizations } from "@/api/lab";

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
