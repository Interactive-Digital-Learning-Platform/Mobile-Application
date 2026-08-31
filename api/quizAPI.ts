import { quizClient } from "@/api/apiClients";
import {
  AIFeedbackResponse,
  AnswerItem,
  CurriculumMap,
  DraftAnswer,
  GenerateQuizRequest,
  GenerateQuizResponse,
  QuestionOut,
  QuizQuoteRequest,
  QuizQuoteResponse,
  QuizSessionSummary,
  RetakeSessionResponse,
  SavedQuizResponse,
  SaveProgressRequest,
  SaveProgressResponse,
  SubmitQuizRequest,
  SubmitQuizResponse,
  UserAnalyticsResponse,
  UserOut,
} from "@/types/quizModuleTypes";

export async function fetchMe(): Promise<UserOut> {
  const { data } = await quizClient.get<UserOut>("/user/me");
  return data;
}

export async function syncUser(username?: string): Promise<UserOut> {
  const { data } = await quizClient.post<UserOut>(
    "/user/sync",
    username ? { username } : {}
  );
  return data;
}

export async function fetchCurriculum(grade: number): Promise<CurriculumMap> {
  const { data } = await quizClient.get<CurriculumMap>("/quiz/curriculum", {
    params: { grade },
  });
  return data;
}

export async function generateQuiz(
  payload: GenerateQuizRequest
): Promise<GenerateQuizResponse> {
  const { data } = await quizClient.post<GenerateQuizResponse>(
    "/quiz/generate",
    payload
  );
  return data;
}

export async function fetchQuizSessions(): Promise<QuizSessionSummary[]> {
  const { data } = await quizClient.get<QuizSessionSummary[]>("/quiz/sessions");
  return data;
}

export async function fetchQuizSession(
  sessionId: number
): Promise<SavedQuizResponse> {
  const { data } = await quizClient.get<SavedQuizResponse>(
    `/quiz/sessions/${sessionId}`
  );
  return data;
}

export async function retakeQuizSession(
  sessionId: number
): Promise<RetakeSessionResponse> {
  const { data } = await quizClient.post<RetakeSessionResponse>(
    `/quiz/sessions/${sessionId}/retake`
  );
  return data;
}

export async function saveQuizProgress(
  payload: SaveProgressRequest
): Promise<SaveProgressResponse> {
  const { data } = await quizClient.post<SaveProgressResponse>(
    "/quiz/progress/save",
    payload
  );
  return data;
}

export async function deleteQuizSession(sessionId: number): Promise<void> {
  await quizClient.delete(`/quiz/sessions/${sessionId}`);
}

export async function submitQuiz(
  payload: SubmitQuizRequest
): Promise<SubmitQuizResponse> {
  const { data } = await quizClient.post<SubmitQuizResponse>(
    "/quiz/submit",
    payload
  );
  return data;
}

export async function submitQuizTimeout(
  payload: SubmitQuizRequest
): Promise<SubmitQuizResponse> {
  const { data } = await quizClient.post<SubmitQuizResponse>(
    "/quiz/submit-timeout",
    payload
  );
  return data;
}

export async function fetchAnalytics(): Promise<UserAnalyticsResponse> {
  const { data } = await quizClient.get<UserAnalyticsResponse>(
    "/analytics/me"
  );
  return data;
}

export async function fetchAIFeedback(): Promise<AIFeedbackResponse> {
  const { data } = await quizClient.get<AIFeedbackResponse>(
    "/analytics/feedback"
  );
  return data;
}

export async function fetchMotivationalQuote(
  payload: QuizQuoteRequest
): Promise<QuizQuoteResponse> {
  const { data } = await quizClient.post<QuizQuoteResponse>(
    "/quiz/motivational-quote",
    payload
  );
  return data;
}

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
