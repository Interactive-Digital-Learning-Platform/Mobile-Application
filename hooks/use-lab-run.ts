import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startLabRun, fetchLabRun, logLabAction, completeLabRun } from "@/services/labService";
import { LabRunType, LogLabActionRequestType, LogLabActionResponseType } from "@/types";

export const useStartLabRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId?: string) => startLabRun(sessionId),
    onSuccess: (labRun: LabRunType) => {
      queryClient.setQueryData(["labRun", labRun._id], labRun);
    },
  });
};

export const useLabRun = (labRunId: string | undefined) => {
  return useQuery({
    queryKey: ["labRun", labRunId],
    queryFn: () => fetchLabRun(labRunId as string),
    enabled: !!labRunId,
  });
};

export const useLogLabAction = (labRunId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: LogLabActionRequestType) => logLabAction(labRunId as string, action),
    onSuccess: (result: LogLabActionResponseType) => {
      queryClient.setQueryData(["labRun", labRunId], result.labRun);
    },
  });
};

export const useCompleteLabRun = (labRunId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeLabRun(labRunId as string),
    onSuccess: (labRun: LabRunType) => {
      queryClient.setQueryData(["labRun", labRunId], labRun);
    },
  });
};
