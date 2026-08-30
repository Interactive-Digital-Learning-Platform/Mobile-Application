import { useMutation, useQuery } from "@tanstack/react-query";
import {
  startSession,
  fetchSession,
  submitEquipmentSelection,
  submitChemicalSelection,
  logStepAction,
  requestStepHint,
  requestStepHelp,
  completeSession,
  fetchSessionReport,
  fetchLabNoteContext,
  fetchSessionHistory,
  fetchSessionStats,
} from "@/api/lab";
import { LogStepActionRequestType, SessionHistoryFilterType } from "@/types/lab";

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
    mutationFn: ({ stepId, microStepId }: { stepId: number; microStepId?: number | null }) =>
      requestStepHint(sessionId as string, stepId, microStepId),
  });
};

export const useRequestStepHelp = (sessionId: string | undefined) => {
  return useMutation({
    mutationFn: ({ stepId, microStepId }: { stepId: number; microStepId?: number | null }) =>
      requestStepHelp(sessionId as string, stepId, microStepId),
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

// Lab → Notes handoff context (Phase 4). Used by the Notes-owned "from a practical" screen.
export const useLabNoteContext = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ["labNoteContext", sessionId],
    queryFn: () => fetchLabNoteContext(sessionId as string),
    enabled: !!sessionId,
  });
};

export const useSessionHistory = (filters: SessionHistoryFilterType) => {
  return useQuery({
    queryKey: ["sessionHistory", filters],
    queryFn: () => fetchSessionHistory(filters),
  });
};

export const useSessionStats = () => {
  return useQuery({
    queryKey: ["sessionStats"],
    queryFn: fetchSessionStats,
  });
};
