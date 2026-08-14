import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchCompoundBuildTemplate, submitCompoundBuild } from "@/services/compoundBuilderService";
import { CompoundBuildRequestType } from "@/types/labModuleTypes";

export const useCompoundBuildTemplate = (experimentId: string | undefined, compoundId: string | undefined) => {
  return useQuery({
    queryKey: ["compoundBuildTemplate", experimentId, compoundId],
    queryFn: () => fetchCompoundBuildTemplate(experimentId as string, compoundId as string),
    enabled: !!experimentId && !!compoundId,
  });
};

export const useSubmitCompoundBuild = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: (payload: CompoundBuildRequestType) => submitCompoundBuild(sessionId as string, payload),
  });
};
