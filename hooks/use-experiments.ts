import { useQuery } from "@tanstack/react-query";
import { fetchExperiments, fetchExperimentById } from "@/services/experimentService";

export const useExperiments = (subject: string) => {
  return useQuery({
    queryKey: ["experiments", subject],
    queryFn: () => fetchExperiments(subject),
  });
};

export const useExperiment = (experimentId: string | undefined) => {
  return useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => fetchExperimentById(experimentId as string),
    enabled: !!experimentId,
  });
};
