import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mixChemicals } from "@/services/labService";
import { MixRequestType } from "@/types";

export const useMixChemicals = (labRunId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MixRequestType) => mixChemicals(labRunId as string, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labRun", labRunId] });
    },
  });
};
