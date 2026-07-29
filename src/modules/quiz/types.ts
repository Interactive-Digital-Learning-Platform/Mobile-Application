/**
 * types.ts
 * ─────────
 * TypeScript interfaces that mirror the Pydantic v2 schemas in the backend.
 * Keep these in sync with:
 *   - app/schemas/quiz.py
 *   - app/schemas/analytics.py
 *   - app/schemas/user.py
 */

// ── Quiz Generation ────────────────────────────────────────────────────────────

export interface GenerateQuizRequest {
  grade?: number;         // defaults to 10 on backend if omitted
  subject: string;
  // Both omitted by default — the backend chooses them automatically:
  // lesson via AI (groq_service.choose_lesson), difficulty via accuracy
  // history (difficulty_service). Only set these to force a manual override.
  lesson?: string;
  difficulty?: "easy" | "medium" | "hard";
  question_count: number; // 1–30
  excluded_question_ids?: number[]; // IDs already seen by this user — backend excludes them for variety
  force_cache?: boolean;            // Skip AI, serve from DB pool — user-chosen fallback after AI failure
}

/** A single question returned from the backend. correct_answer is included. */
export interface QuestionOut {
  id: number;
  question: string;
  options: string[] | null;
  subject: string;
  lesson: string;
  difficulty: string;
  correct_answer: string | null;
}

export interface GenerateQuizResponse {
  session_id: number;
  questions: QuestionOut[];
  cache_hit: boolean;
  // The difficulty/lesson the backend actually used — chosen automatically
  // unless the request explicitly overrode them.
  difficulty: string;
  lesson: string;
}

// ── Progress save ──────────────────────────────────────────────────────────────

export interface DraftAnswer {
  question_id: number;
  selected_answer: string | null;
  response_time: number | null;
}

export interface SaveProgressRequest {
  session_id: number;
  remaining_time: number | null;
  answered_count: number;
  repeated_question_ids: number[];
  weak_lessons_hint: string[];
  draft_answers: DraftAnswer[];
}

export interface SaveProgressResponse {
  session_id: number;
  saved_at: string;
  remaining_time: number | null;
  answered_count: number;
  repeated_question_ids: number[];
  weak_lessons_hint: string[];
}

// ── Quiz session ───────────────────────────────────────────────────────────────

export interface QuizLatestProgress {
  remaining_time: number | null;
  answered_count: number;
  repeated_question_ids: number[];
  weak_lessons_hint: string[];
  draft_answers: DraftAnswer[];
  saved_at: string;
}

export interface QuizSessionSummary {
  session_id: number;
  subject: string;
  difficulty: string;
  question_count: number;
  created_at: string;
  answered_count: number;
  is_completed: boolean;
  accuracy: number | null;
  correct_count: number | null;
  question_ids: number[];
}

export interface QuizCompletion {
  ended_by: string;
  total_time: number;
  score: number;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  lesson_time_breakdown: Record<string, number>;
  lesson_accuracy_breakdown: Record<string, Record<string, number>>;
  repeated_lessons_right: string[];
  repeated_lessons_wrong: string[];
  repeated_correct_count: number;
  repeated_wrong_count: number;
  completed_at: string;
}

export interface SavedQuizResponse {
  session_id: number;
  subject: string;
  lesson: string;
  difficulty: string;
  question_count: number;
  generated_at: string;
  questions: QuestionOut[];
  latest_progress: QuizLatestProgress | null;
  completion: QuizCompletion | null;
}

// ── Quiz Submission ────────────────────────────────────────────────────────────

export interface AnswerItem {
  question_id: number;
  selected_answer: string;
  response_time: number; // seconds
  is_repeated: boolean;
}

export interface SubmitQuizRequest {
  session_id: number;
  answers: AnswerItem[];
  ended_by: "submitted" | "timeout";
  remaining_time_at_end: number | null;
  repeated_question_ids: number[];
}

export interface SubmitQuizResponse {
  session_id: number;
  score: number;
  accuracy: number;       // 0.0 – 100.0
  total_time: number;     // seconds
  avg_response_time: number;
  correct_count: number;
  total_questions: number;
  ended_by: string;
  lesson_time_breakdown: Record<string, number>;
  lesson_accuracy_breakdown: Record<string, Record<string, number>>;
  repeated_correct_count: number;
  repeated_wrong_count: number;
  repeated_lessons_right: string[];
  repeated_lessons_wrong: string[];
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface SubjectAnalytics {
  subject: string;
  accuracy: number;
  avg_response_time: number;
  weak_topic: string | null;
}

export interface UserAnalyticsResponse {
  overall_accuracy: number;
  overall_avg_response_time: number;
  total_sessions: number;
  subjects: SubjectAnalytics[];
  strong_subjects: string[];
  weak_subjects: string[];
}

export interface AIFeedbackResponse {
  weak_areas: string[];
  strong_areas: string[];
  suggestions: string[];
  motivational_note: string;
  generated_at: string; // ISO datetime
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserOut {
  id: number;
  clerk_id: string;
  username: string | null;
  created_at: string; // ISO datetime
}
