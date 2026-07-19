import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startLabRun, fetchLabRun, completeLabRun } from "@/services/labService";
import { LabRunType } from "@/types";

export const useStartLabRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startLabRun,
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

export const useCompleteLabRun = (labRunId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeLabRun(labRunId as string),
    onSuccess: (labRun: LabRunType) => {
      queryClient.setQueryData(["labRun", labRunId], labRun);
    },
  });
};
