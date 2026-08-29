import { useQuery } from "@tanstack/react-query";
import {
  fetchExperiments,
  fetchExperimentById,
  fetchExperimentInfo,
  fetchExperimentsBySubject,
  fetchExperimentWalkthrough,
} from "@/api/lab";

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

// DEV ONLY — powers components/lab/dev/DevWalkthroughOverlay. Disabled entirely outside __DEV__
// (the query never fires), and the backend endpoint responds 404 in production anyway. Remove
// this hook with that component before shipping.
export const useExperimentWalkthrough = (experimentId: string | undefined) => {
  return useQuery({
    queryKey: ["experimentWalkthrough", experimentId],
    queryFn: () => fetchExperimentWalkthrough(experimentId as string),
    enabled: __DEV__ && !!experimentId,
    staleTime: Infinity,
    retry: false,
  });
};
