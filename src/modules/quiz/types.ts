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
//
// The backend's GET /analytics/me response has grown a lot of sections over
// time (response-time stats, trend, repeated-mistakes, difficulty progress,
// mastery score, growth, recommendations). Every field added below is
// OPTIONAL (`?`) even where the backend always returns it today — the
// backend ships these sections incrementally, and older/newer app builds
// need to keep working against whichever shape the API happens to be on.
// Never assume a field is present; the Profile screen must render sensible
// fallbacks (see components/profile/) instead of crashing.

/**
 * Whether a scope (overall/subject/topic) is improving, declining, or
 * stable, comparing two non-overlapping periods of completed sessions.
 * Mirrors app/schemas/analytics.py:PerformanceTrend.
 */
export interface PerformanceTrend {
  current_period_accuracy: number;
  previous_period_accuracy: number;
  accuracy_change: number;
  current_period_sessions: number;
  previous_period_sessions: number;
  /** "improving" | "declining" | "stable" | "insufficient_data" */
  trend: string;
  /** "recent_sessions" | "weekly" | "insufficient_data" */
  method: string;
}

/** Mirrors app/schemas/analytics.py:RepeatedQuestionAnalytics. */
export interface RepeatedQuestionAnalytics {
  repeated_question_count: number;
  repeated_correct_count: number;
  repeated_incorrect_count: number;
  corrected_previous_mistakes: number;
  repeated_same_mistakes: number;
  mistake_correction_rate: number;
}

/** The 5 inputs behind mastery_score, each already 0-100. */
export interface MasteryComponents {
  accuracy_score: number;
  recent_performance_score: number;
  difficulty_score: number;
  retention_score: number;
  consistency_score: number;
}

/** One difficulty tier's performance within a subject. */
export interface SubjectDifficultyPerformance {
  difficulty: string;
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  avg_response_time: number;
  completed_sessions: number;
}

/**
 * Per-topic breakdown within a subject — derived from each question's own
 * lesson, not the session-level lesson (a quiz can span multiple topics).
 */
export interface TopicAnalytics {
  topic: string;
  total_attempted: number;
  total_correct: number;
  total_incorrect: number;
  accuracy: number;
  avg_response_time?: number;
  last_attempted_at?: string;
  /** "insufficient_data" | "weak" | "developing" | "strong" */
  status?: string;
  median_response_time?: number;
  fastest_response_time?: number;
  slowest_response_time?: number;
  correct_answer_avg_response_time?: number;
  incorrect_answer_avg_response_time?: number;
  response_time_standard_deviation?: number;
  /** "fast_and_accurate" | "fast_but_inaccurate" | "slow_and_accurate" | "slow_and_inaccurate" | "balanced" | "insufficient_data" */
  answering_behavior?: string;
  performance_trend?: PerformanceTrend;
  repeated_question_analytics?: RepeatedQuestionAnalytics;
  /** null when there isn't enough data for a mastery score yet. */
  mastery_score?: number | null;
  /** "beginner" | "developing" | "proficient" | "advanced" | "insufficient_data" */
  mastery_level?: string;
  mastery_components?: MasteryComponents | null;
}

export interface EffortComponents {
  completed_quiz_count_score: number;
  attempted_question_count_score: number;
  active_learning_days_score: number;
  completion_rate_score: number;
  weak_topic_attempts_score: number;
}

export interface ConsistencyComponents {
  active_days_score: number;
  session_spacing_score: number;
  completion_rate_score: number;
  score_stability_score: number;
  low_abandonment_score: number;
}

export interface ImprovementComponents {
  recent_accuracy_change_score: number;
  topic_improvement_score: number;
  repeated_mistake_correction_score: number;
}

export interface GrowthComponents {
  effort: EffortComponents;
  consistency: ConsistencyComponents;
  improvement: ImprovementComponents;
}

/**
 * Growth-oriented analytics — deliberately NOT a raw-score ranking. All
 * scores are null together (growth_level "insufficient_data") when there's
 * too little recent activity to describe a trajectory.
 */
export interface GrowthAnalytics {
  effort_score: number | null;
  consistency_score: number | null;
  improvement_score: number | null;
  mastery_score: number | null;
  growth_score: number | null;
  /** "starting" | "growing" | "strong_growth" | "exceptional_growth" | "insufficient_data" */
  growth_level: string;
  components?: GrowthComponents | null;
}

export interface RecommendationSupportingMetrics {
  accuracy: number | null;
  attempts: number;
  trend: string | null;
  repeated_mistakes: number;
}

/** One deterministic, database-driven recommendation. */
export interface Recommendation {
  /** 1 = most urgent; a rank, not a raw score. */
  priority: number;
  /** "weak_topic" | "declining_subject" | "repeated_mistake" | "careless_guessing" | "slow_response" | "incomplete_quiz" | "difficulty_ready_for_promotion" | "maintain_strong_subject" */
  type: string;
  /** null for overall-scope recommendations (e.g. incomplete_quiz). */
  subject: string | null;
  topic: string | null;
  reason: string;
  recommended_action: string;
  recommended_difficulty: string | null;
  supporting_metrics: RecommendationSupportingMetrics;
}

export interface SubjectAnalytics {
  subject: string;
  accuracy: number;
  avg_response_time: number;
  weak_topic: string | null;
  // The difficulty level the student is currently on for this subject —
  // "easy" | "medium" | "hard", auto-adjusted based on performance.
  current_difficulty: string;

  // ── Added incrementally as the backend grew — always optional ──────────
  topics?: TopicAnalytics[];
  median_response_time?: number;
  fastest_response_time?: number;
  slowest_response_time?: number;
  correct_answer_avg_response_time?: number;
  incorrect_answer_avg_response_time?: number;
  response_time_standard_deviation?: number;
  answering_behavior?: string;
  performance_trend?: PerformanceTrend;
  repeated_question_analytics?: RepeatedQuestionAnalytics;
  difficulty_performance?: SubjectDifficultyPerformance[];
  consecutive_strong_quizzes?: number;
  consecutive_weak_quizzes?: number;
  promotion_threshold?: number;
  demotion_threshold?: number;
  quizzes_required_for_promotion?: number;
  promotion_progress_percentage?: number;
  next_difficulty?: string;
  difficulty_status_message?: string;
  mastery_score?: number | null;
  mastery_level?: string;
  mastery_components?: MasteryComponents | null;
}

export interface UserAnalyticsResponse {
  overall_accuracy: number;
  overall_avg_response_time: number;
  total_sessions: number;
  subjects: SubjectAnalytics[];
  strong_subjects: string[];
  weak_subjects: string[];

  // ── Added incrementally as the backend grew — always optional ──────────
  total_questions_attempted?: number;
  total_correct_answers?: number;
  total_incorrect_answers?: number;
  total_unanswered_questions?: number;
  completed_sessions?: number;
  incomplete_sessions?: number;
  timed_out_sessions?: number;
  abandoned_sessions?: number;
  completion_rate?: number;
  timeout_rate?: number;
  average_session_duration_seconds?: number;
  average_questions_per_session?: number;
  median_response_time?: number;
  fastest_response_time?: number;
  slowest_response_time?: number;
  correct_answer_avg_response_time?: number;
  incorrect_answer_avg_response_time?: number;
  response_time_standard_deviation?: number;
  answering_behavior?: string;
  performance_trend?: PerformanceTrend;
  repeated_question_analytics?: RepeatedQuestionAnalytics;
  growth?: GrowthAnalytics;
  recommendations?: Recommendation[];
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
