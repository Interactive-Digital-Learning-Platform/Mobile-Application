/**
 * use-quiz.ts
 * ────────────
 * React Query hooks for the Personalized Quiz Service.
 *
 * Hook overview:
 *   useUserMeQuery              — query:    GET    /api/v1/user/me
 *   useUserSyncMutation         — mutation: POST   /api/v1/user/sync
 *   useGenerateQuizMutation     — mutation: POST   /api/v1/quiz/generate
 *   useQuizSessionsQuery        — query:    GET    /api/v1/quiz/sessions
 *   useQuizSessionQuery         — query:    GET    /api/v1/quiz/sessions/:id
 *   useSaveQuizProgressMutation — mutation: POST   /api/v1/quiz/progress/save
 *   useDeleteQuizSessionMutation— mutation: DELETE /api/v1/quiz/sessions/:id
 *   useSubmitQuizMutation       — mutation: POST   /api/v1/quiz/submit
 *   useSubmitQuizTimeoutMutation— mutation: POST   /api/v1/quiz/submit-timeout
 *   useAnalyticsMeQuery         — query:    GET    /api/v1/analytics/me
 *   useAnalyticsFeedbackQuery   — query:    GET    /api/v1/analytics/feedback
 */

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
  UserAnalyticsResponse,
} from "@/types/quizModuleTypes";

// ── Query Keys ────────────────────────────────────────────────────────────────

export const quizKeys = {
  all:         ["quiz"] as const,
  sessions:    ["quiz", "sessions"] as const,
  session:     (id: number) => ["quiz", "session", id] as const,
  analyticsMe: ["analytics", "me"] as const,
  aiFeedback:  ["analytics", "feedback"] as const,
  me:          ["user", "me"] as const,
};

// ── useUserMeQuery ────────────────────────────────────────────────────────────

/**
 * Query: GET /api/v1/user/me
 * Lazily provisions the user in DB on first call. Cache: ['user', 'me'].
 */
export function useUserMeQuery() {
  return useQuery({
    queryKey: quizKeys.me,
    queryFn: fetchMe,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

// ── useUserSyncMutation ───────────────────────────────────────────────────────

/**
 * Mutation: POST /api/v1/user/sync
 * Idempotent — call once after Clerk auth completes.
 * On success seeds the ['user', 'me'] cache.
 */
export function useUserSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncUser,
    onSuccess: (data) => {
      queryClient.setQueryData(quizKeys.me, data);
    },
  });
}

// ── useGenerateQuizMutation ───────────────────────────────────────────────────

/**
 * Mutation: POST /api/v1/quiz/generate
 * Generates or retrieves a cached quiz. Button is disabled (isPending) while running.
 * Invalidates the sessions list AND analytics — a new session changes
 * `total_sessions`, which StatisticButton reads via useAnalyticsMeQuery.
 */
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

// ── useQuizSessionsQuery ──────────────────────────────────────────────────────

/**
 * Query: GET /api/v1/quiz/sessions
 * Returns a summary list of all sessions for the current user.
 * Cache: ['quiz', 'sessions'].
 */
export function useQuizSessionsQuery() {
  return useQuery({
    queryKey: quizKeys.sessions,
    queryFn: fetchQuizSessions,
    staleTime: 60 * 1000,
  });
}

// ── useQuizSessionQuery ───────────────────────────────────────────────────────

/**
 * Query: GET /api/v1/quiz/sessions/:sessionId
 * Only runs when sessionId is provided. Cache: ['quiz', 'session', id].
 * If latest_progress exists, the caller should restore session state.
 * If completion exists, show the completed-results UI.
 */
export function useQuizSessionQuery(sessionId: number | null) {
  return useQuery({
    queryKey: quizKeys.session(sessionId ?? 0),
    queryFn: () => fetchQuizSession(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ── useSaveQuizProgressMutation ───────────────────────────────────────────────

/**
 * Mutation: POST /api/v1/quiz/progress/save
 * Non-blocking autosave. Call on debounce, app background, and exit.
 * On success, the cached session query is NOT invalidated to avoid re-renders.
 */
export function useSaveQuizProgressMutation() {
  return useMutation({
    mutationFn: (payload: SaveProgressRequest) => saveQuizProgress(payload),
  });
}

// ── useDeleteQuizSessionMutation ──────────────────────────────────────────────

/**
 * Mutation: DELETE /api/v1/quiz/sessions/:id
 * Deletes the session + its records. The per-subject Analytics aggregate
 * (accuracy/weak_topic) is preserved, but `total_sessions` is a live count
 * that changes — StatisticButton reads it via useAnalyticsMeQuery.
 *
 * Updates both caches optimistically in `onMutate` instead of only
 * invalidating in `onSuccess`: GET /analytics/me is a slow endpoint (15s+
 * even warm — see AnalyticsOrchestrationService), so relying purely on
 * invalidation left the "Sessions" count in the header visibly out of sync
 * with the practice list for many seconds after a delete, even though the
 * list itself (backed by the much faster /quiz/sessions) had already updated.
 * `onError` rolls both caches back if the delete actually fails server-side;
 * `onSettled` still reconciles with the server either way.
 */
export function useDeleteQuizSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => deleteQuizSession(sessionId),
    onMutate: async (sessionId: number) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: quizKeys.sessions }),
        queryClient.cancelQueries({ queryKey: quizKeys.analyticsMe }),
      ]);

      const previousSessions = queryClient.getQueryData<QuizSessionSummary[]>(quizKeys.sessions);
      const previousAnalytics = queryClient.getQueryData<UserAnalyticsResponse>(quizKeys.analyticsMe);

      if (previousSessions) {
        queryClient.setQueryData<QuizSessionSummary[]>(
          quizKeys.sessions,
          previousSessions.filter((s) => s.session_id !== sessionId)
        );
      }
      if (previousAnalytics) {
        queryClient.setQueryData<UserAnalyticsResponse>(quizKeys.analyticsMe, {
          ...previousAnalytics,
          total_sessions: Math.max(0, previousAnalytics.total_sessions - 1),
        });
      }

      return { previousSessions, previousAnalytics };
    },
    onError: (_err, _sessionId, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(quizKeys.sessions, context.previousSessions);
      }
      if (context?.previousAnalytics) {
        queryClient.setQueryData(quizKeys.analyticsMe, context.previousAnalytics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.sessions });
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe });
    },
  });
}

// ── useSubmitQuizMutation ─────────────────────────────────────────────────────

/**
 * Mutation: POST /api/v1/quiz/submit
 * Final submission with ended_by = "submitted".
 * Invalidates analytics and session caches on success.
 */
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

// ── useSubmitQuizTimeoutMutation ──────────────────────────────────────────────

/**
 * Mutation: POST /api/v1/quiz/submit-timeout
 * Finalizes session when the timer reaches zero (ended_by = "timeout" on backend).
 * Invalidates the same query keys as normal submit.
 */
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

// ── useAnalyticsMeQuery ───────────────────────────────────────────────────────

/**
 * Query: GET /api/v1/analytics/me
 * Pure DB call — fast. Cache: ['analytics', 'me'].
 */
export function useAnalyticsMeQuery() {
  return useQuery({
    queryKey: quizKeys.analyticsMe,
    queryFn: fetchAnalytics,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// ── useAnalyticsFeedbackQuery ─────────────────────────────────────────────────

/**
 * Query: GET /api/v1/analytics/feedback
 * Triggers a Groq AI call — avoid aggressive refetching.
 * Cache: ['analytics', 'feedback']. staleTime: 10 min.
 */
export function useAnalyticsFeedbackQuery(enabled = true) {
  return useQuery({
    queryKey: quizKeys.aiFeedback,
    queryFn: fetchAIFeedback,
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
