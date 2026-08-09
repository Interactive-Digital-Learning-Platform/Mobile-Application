export interface GenerateQuizRequest {
  grade?: number;
  subject: string;
  lesson?: string;
  difficulty?: "easy" | "medium" | "hard";
  question_count: number;
  excluded_question_ids?: number[];
  force_cache?: boolean;
}

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
  difficulty: string;
  lesson: string;
}

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

export interface AnswerItem {
  question_id: number;
  selected_answer: string;
  response_time: number;
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
  accuracy: number;
  total_time: number;
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

// Every analytics field below is optional even where the backend always
// returns it today — the backend ships new analytics sections
// incrementally, so older/newer app builds need to keep working against
// whichever API shape is live. Don't assume a field is present; render a
// sensible fallback (see components/profile/) instead of crashing on it.

export interface PerformanceTrend {
  current_period_accuracy: number;
  previous_period_accuracy: number;
  accuracy_change: number;
  current_period_sessions: number;
  previous_period_sessions: number;
  trend: string;
  method: string;
}

export interface RepeatedQuestionAnalytics {
  repeated_question_count: number;
  repeated_correct_count: number;
  repeated_incorrect_count: number;
  corrected_previous_mistakes: number;
  repeated_same_mistakes: number;
  mistake_correction_rate: number;
}

export interface MasteryComponents {
  accuracy_score: number;
  recent_performance_score: number;
  difficulty_score: number;
  retention_score: number;
  consistency_score: number;
}

export interface SubjectDifficultyPerformance {
  difficulty: string;
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  avg_response_time: number;
  completed_sessions: number;
}

export interface TopicAnalytics {
  topic: string;
  total_attempted: number;
  total_correct: number;
  total_incorrect: number;
  accuracy: number;
  avg_response_time?: number;
  last_attempted_at?: string;
  status?: string;
  median_response_time?: number;
  fastest_response_time?: number;
  slowest_response_time?: number;
  correct_answer_avg_response_time?: number;
  incorrect_answer_avg_response_time?: number;
  response_time_standard_deviation?: number;
  answering_behavior?: string;
  performance_trend?: PerformanceTrend;
  repeated_question_analytics?: RepeatedQuestionAnalytics;
  mastery_score?: number | null;
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

export interface GrowthAnalytics {
  effort_score: number | null;
  consistency_score: number | null;
  improvement_score: number | null;
  mastery_score: number | null;
  growth_score: number | null;
  growth_level: string;
  components?: GrowthComponents | null;
}

export interface RecommendationSupportingMetrics {
  accuracy: number | null;
  attempts: number;
  trend: string | null;
  repeated_mistakes: number;
}

export interface Recommendation {
  priority: number;
  type: string;
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
  current_difficulty: string;

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
  generated_at: string;
}

export interface UserOut {
  id: number;
  clerk_id: string;
  username: string | null;
  created_at: string;
}
