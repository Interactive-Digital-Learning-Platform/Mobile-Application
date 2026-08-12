import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteQuizSession,
  fetchAIFeedback,
  fetchAnalytics,
  fetchMe,
  fetchQuizSession,
  fetchQuizSessions,
  generateQuiz,
  saveQuizProgress,
  submitQuiz,
  submitQuizTimeout,
  syncUser,
} from "@/api/quizAPI";
import type {
  GenerateQuizRequest,
  QuizSessionSummary,
  SaveProgressRequest,
  SubmitQuizRequest,
} from "@/types/quizModuleTypes";

export const quizKeys = {
  all:         ["quiz"] as const,
  sessions:    ["quiz", "sessions"] as const,
  session:     (id: number) => ["quiz", "session", id] as const,
  analyticsMe: ["analytics", "me"] as const,
  aiFeedback:  ["analytics", "feedback"] as const,
  me:          ["user", "me"] as const,
};

export function useUserMeQuery() {
  return useQuery({
    queryKey: quizKeys.me,
    queryFn: fetchMe,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useUserSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username?: string) => syncUser(username),
    onSuccess: (data) => {
      queryClient.setQueryData(quizKeys.me, data);
    },
  });
}

export function useGenerateQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateQuizRequest) => generateQuiz(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.sessions });
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe });
    },
  });
}

export function useQuizSessionsQuery() {
  return useQuery({
    queryKey: quizKeys.sessions,
    queryFn: fetchQuizSessions,
    staleTime: 60 * 1000,
  });
}

export function useQuizSessionQuery(sessionId: number | null) {
  return useQuery({
    queryKey: quizKeys.session(sessionId ?? 0),
    queryFn: () => fetchQuizSession(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveQuizProgressMutation() {
  return useMutation({
    mutationFn: (payload: SaveProgressRequest) => saveQuizProgress(payload),
  });
}

export function useDeleteQuizSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => deleteQuizSession(sessionId),
    onMutate: async (sessionId: number) => {
      // Remove it from the list immediately rather than waiting on the
      // server round-trip; onError below puts it back if the delete fails.
      await queryClient.cancelQueries({ queryKey: quizKeys.sessions });

      const previousSessions = queryClient.getQueryData<QuizSessionSummary[]>(quizKeys.sessions);

      if (previousSessions) {
        queryClient.setQueryData<QuizSessionSummary[]>(
          quizKeys.sessions,
          previousSessions.filter((s) => s.session_id !== sessionId)
        );
      }

      return { previousSessions };
    },
    onError: (_err, _sessionId, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(quizKeys.sessions, context.previousSessions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.sessions });
    },
  });
}

export function useSubmitQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitQuizRequest) => submitQuiz(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.sessions });
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe });
      queryClient.invalidateQueries({ queryKey: quizKeys.aiFeedback });
      queryClient.invalidateQueries({
        queryKey: quizKeys.session(variables.session_id),
      });
    },
  });
}

export function useSubmitQuizTimeoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitQuizRequest) => submitQuizTimeout(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.sessions });
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe });
      queryClient.invalidateQueries({ queryKey: quizKeys.aiFeedback });
      queryClient.invalidateQueries({
        queryKey: quizKeys.session(variables.session_id),
      });
    },
  });
}

export function useAnalyticsMeQuery() {
  return useQuery({
    queryKey: quizKeys.analyticsMe,
    queryFn: fetchAnalytics,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useAnalyticsFeedbackQuery(enabled = true) {
  return useQuery({
    queryKey: quizKeys.aiFeedback,
    queryFn: fetchAIFeedback,
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
