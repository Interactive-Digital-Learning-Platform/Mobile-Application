import { useQuery } from "@tanstack/react-query";
import { fetchExperiments, fetchExperimentById, fetchExperimentInfo, fetchExperimentsBySubject } from "@/api/lab";

export const useExperiments = (subject: string) => {
  return useQuery({
    queryKey: ["experiments", subject],
    queryFn: () => fetchExperiments(subject),
  });
};

export const useExperimentsBySubject = (subject: string) => {
  return useQuery({
    queryKey: ["experimentsBySubject", subject],
    queryFn: () => fetchExperimentsBySubject(subject),
  });
};

export const useExperiment = (experimentId: string | undefined) => {
  return useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => fetchExperimentById(experimentId as string),
    enabled: !!experimentId,
  });
};

export const useExperimentInfo = (experimentId: string | undefined) => {
  return useQuery({
    queryKey: ["experimentInfo", experimentId],
    queryFn: () => fetchExperimentInfo(experimentId as string),
    enabled: !!experimentId,
  });
};
