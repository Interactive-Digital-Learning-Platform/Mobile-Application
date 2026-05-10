/**
 * quizApi.ts
 * ──────────
 * Typed Axios functions for every quiz-service endpoint.
 *
 * Base URL is read from EXPO_PUBLIC_BACKEND_URL via the shared axiosInstance.
 */

import axiosInstance from "@/providers/axios";
import {
  AIFeedbackResponse,
  AnswerItem,
  DraftAnswer,
  GenerateQuizRequest,
  GenerateQuizResponse,
  QuestionOut,
  QuizSessionSummary,
  SavedQuizResponse,
  SaveProgressRequest,
  SaveProgressResponse,
  SubmitQuizRequest,
  SubmitQuizResponse,
  UserAnalyticsResponse,
  UserOut,
} from "./types";

// ── User ──────────────────────────────────────────────────────────────────────

/** GET /api/v1/user/me — lazy-provisions the user in DB on first call */
export async function fetchMe(): Promise<UserOut> {
  const { data } = await axiosInstance.get<UserOut>("/api/v1/user/me");
  return data;
}

/** POST /api/v1/user/sync — idempotent sync after Clerk login */
export async function syncUser(): Promise<UserOut> {
  const { data } = await axiosInstance.post<UserOut>("/api/v1/user/sync");
  return data;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

/** POST /api/v1/quiz/generate */
export async function generateQuiz(
  payload: GenerateQuizRequest
): Promise<GenerateQuizResponse> {
  const { data } = await axiosInstance.post<GenerateQuizResponse>(
    "/api/v1/quiz/generate",
    payload
  );
  return data;
}

/** GET /api/v1/quiz/sessions — all sessions for the current user */
export async function fetchQuizSessions(): Promise<QuizSessionSummary[]> {
  const { data } = await axiosInstance.get<QuizSessionSummary[]>("/api/v1/quiz/sessions");
  return data;
}

/** GET /api/v1/quiz/sessions/:sessionId */
export async function fetchQuizSession(
  sessionId: number
): Promise<SavedQuizResponse> {
  const { data } = await axiosInstance.get<SavedQuizResponse>(
    `/api/v1/quiz/sessions/${sessionId}`
  );
  return data;
}

/** POST /api/v1/quiz/progress/save — debounced autosave during a session */
export async function saveQuizProgress(
  payload: SaveProgressRequest
): Promise<SaveProgressResponse> {
  const { data } = await axiosInstance.post<SaveProgressResponse>(
    "/api/v1/quiz/progress/save",
    payload
  );
  return data;
}

/** DELETE /api/v1/quiz/sessions/:sessionId — removes session, keeps Analytics */
export async function deleteQuizSession(sessionId: number): Promise<void> {
  await axiosInstance.delete(`/api/v1/quiz/sessions/${sessionId}`);
}

/** POST /api/v1/quiz/submit — final submission with ended_by = submitted */
export async function submitQuiz(
  payload: SubmitQuizRequest
): Promise<SubmitQuizResponse> {
  const { data } = await axiosInstance.post<SubmitQuizResponse>(
    "/api/v1/quiz/submit",
    payload
  );
  return data;
}

/** POST /api/v1/quiz/submit-timeout — finalizes session when timer hits zero */
export async function submitQuizTimeout(
  payload: SubmitQuizRequest
): Promise<SubmitQuizResponse> {
  const { data } = await axiosInstance.post<SubmitQuizResponse>(
    "/api/v1/quiz/submit-timeout",
    payload
  );
  return data;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** GET /api/v1/analytics/me */
export async function fetchAnalytics(): Promise<UserAnalyticsResponse> {
  const { data } = await axiosInstance.get<UserAnalyticsResponse>(
    "/api/v1/analytics/me"
  );
  return data;
}

/** GET /api/v1/analytics/feedback */
export async function fetchAIFeedback(): Promise<AIFeedbackResponse> {
  const { data } = await axiosInstance.get<AIFeedbackResponse>(
    "/api/v1/analytics/feedback"
  );
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts the frontend answers map into AnswerItem[] for the backend.
 *
 * @param questions       Array of QuestionOut from GenerateQuizResponse
 * @param answers         Record<questionIndex, optionIndex> from session state
 * @param questionTimes   Per-question elapsed times in seconds
 * @param repeatedIndices Set of question indices that were repeated
 */
export function buildAnswerPayload(
  questions: QuestionOut[],
  answers: Record<number, number>,
  questionTimes?: Record<number, number>,
  repeatedIndices?: Set<number>
): AnswerItem[] {
  return questions.map((q, i) => {
    const selectedIndex = answers[i];
    const selectedAnswer =
      selectedIndex !== undefined && q.options
        ? q.options[selectedIndex] ?? ""
        : "";
    return {
      question_id: q.id,
      selected_answer: selectedAnswer,
      response_time: questionTimes?.[i] ?? 0,
      is_repeated: repeatedIndices?.has(i) ?? false,
    };
  });
}

/**
 * Builds draft answers for progress save from the current session state.
 */
export function buildDraftAnswers(
  questions: QuestionOut[],
  answers: Record<number, number>,
  questionTimes: Record<number, number>
): DraftAnswer[] {
  return questions.map((q, i) => {
    const selectedIndex = answers[i];
    const selectedAnswer =
      selectedIndex !== undefined && q.options
        ? q.options[selectedIndex] ?? null
        : null;
    return {
      question_id: q.id,
      selected_answer: selectedAnswer,
      response_time: questionTimes[i] ?? null,
    };
  });
}
