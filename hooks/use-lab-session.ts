import { useMutation, useQuery } from "@tanstack/react-query";
import {
  startSession,
  fetchSession,
  submitEquipmentSelection,
  submitChemicalSelection,
  logStepAction,
  requestStepHint,
  completeSession,
  fetchSessionReport,
} from "@/services/sessionService";
import { LogStepActionRequestType } from "@/types/labModuleTypes";

export const useStartSession = () => {
  return useMutation({ mutationFn: (experimentId: string) => startSession(experimentId) });
};

export const useSession = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession(sessionId as string),
    enabled: !!sessionId,
  });
};

export const useSubmitEquipmentSelection = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: (selectedEquipment: string[]) => submitEquipmentSelection(sessionId as string, selectedEquipment),
  });
};

export const useSubmitChemicalSelection = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: (selectedChemicalIds: string[]) => submitChemicalSelection(sessionId as string, selectedChemicalIds),
  });
};

export const useLogStepAction = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: (payload: LogStepActionRequestType) => logStepAction(sessionId as string, payload),
  });
};

export const useRequestStepHint = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: (stepId: number) => requestStepHint(sessionId as string, stepId),
  });
};

export const useCompleteSession = (sessionId: string | undefined) => {
  return useMutation({ mutationFn: () => completeSession(sessionId as string) });
};

export const useSessionReport = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ["sessionReport", sessionId],
    queryFn: () => fetchSessionReport(sessionId as string),
    enabled: !!sessionId,
  });
};
