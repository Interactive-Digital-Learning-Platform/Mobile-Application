// Mirrors Personalized-Quiz-Service's app/schemas/battle.py field-for-field.

export type League = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type BattleMatchStatus = "waiting" | "countdown" | "active" | "completed" | "cancelled";

export type BattleParticipantResultLabel = "win" | "loss" | "draw" | "forfeit";

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string | null;
  subject: string;
  rating: number;
  league: League;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
  average_response_time: number;
}

export interface LeaderboardResponse {
  subject: string;
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  entries: LeaderboardEntry[];
  my_rank: number | null;
  my_rating: number | null;
}

export interface CompetitiveSubjectProfile {
  subject: string;
  rating: number;
  highest_rating: number;
  league: League;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
  current_win_streak: number;
  highest_win_streak: number;
  correct_answers: number;
  total_answers: number;
  accuracy: number;
  average_response_time: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveProfileResponse {
  user_id: number;
  subjects: CompetitiveSubjectProfile[];
}

export interface JoinQueueRequest {
  subject: string;
}

export interface OpponentPublicInfo {
  user_id: number;
  username: string | null;
  rating: number;
  league: League;
}

export type QueueStatus = "idle" | "searching" | "matched";

export interface QueueStatusResponse {
  status: QueueStatus;
  subject?: string | null;
  waited_seconds?: number | null;
  current_rating_window?: number | null;
  match_id?: number | null;
  difficulty?: string | null;
  opponent?: OpponentPublicInfo | null;
  // "matched" only: this player has finished every question and is waiting
  // for the opponent (or the match clock).
  awaiting_opponent?: boolean;
}

export interface BattleQuestionPublic {
  question_id: number;
  question: string;
  options: string[] | null;
  // Deliberately no `correct_answer` field — the backend never sends it.
}

export interface BattleParticipantProgress {
  user_id: number;
  answered_count: number;
}

export interface BattleParticipantResult {
  user_id: number;
  // Left null for "me" everywhere -- only ever populated for the other
  // participant, so the client can show a real name instead of a generic
  // "Opponent" label.
  username: string | null;
  correct_count: number | null;
  wrong_count: number | null;
  final_score: number | null;
  best_streak: number | null;
  total_response_time_ms: number | null;
  rating_before: number;
  rating_after: number | null;
  rating_delta: number | null;
  league: League | null;
  result: BattleParticipantResultLabel | null;
}

// REST-only shape — GET /battle/match/{id}/state's "completed" status uses
// this {me, opponent} split. The WS `match_finished` event does NOT use
// this shape (see BattleWsMatchFinishedEvent in battleWsTypes below).
// Why a completed match ended -- decided by the server, which knows for sure.
export type BattleEndReason = "forfeit" | "all_finished" | "time_up";

export interface BattleMatchResult {
  winner_user_id: number | null;
  end_reason?: BattleEndReason | null;
  me: BattleParticipantResult;
  opponent: BattleParticipantResult | null;
}

export interface BattleAnswerProgress {
  // One question a participant has moved past, for the progress bars --
  // `answered` is false for a skip. Correctness is never sent while the
  // match is live (no right/wrong feedback until the end), so is_correct is
  // always null here.
  question_order: number;
  is_correct: boolean | null;
  answered: boolean;
}

export type BattleQuestionReviewStatus = "correct" | "incorrect" | "skipped" | "unanswered";

// One row of the end-of-match review -- the viewer's OWN answers only
// ("unanswered" = never reached before the match clock ran out).
export interface BattleQuestionReview {
  question_order: number;
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  selected_option: string | null;
  status: BattleQuestionReviewStatus;
  response_time_ms: number | null;
  base_score: number;
  speed_bonus: number;
  streak_bonus: number;
  total_question_score: number;
}

// Polymorphic — populated fields vary by `status`, see battle_gameplay_service's
// per-status builders. Everything besides status/match_id is optional.
export interface BattleMatchStateResponse {
  status: BattleMatchStatus;
  match_id: number;
  subject?: string | null;
  difficulty?: string | null;
  question_count?: number | null;
  // Seconds left on the whole-match clock.
  time_remaining_seconds?: number | null;
  countdown_seconds_remaining?: number | null;
  // This player's OWN current question (self-paced play -- the opponent may
  // be on a different one). question_index === question_count with
  // question=null and finished=true once they've moved past every question.
  question_index?: number | null;
  question?: BattleQuestionPublic | null;
  finished?: boolean | null;
  // When the match clock runs out, and the server's clock when this was
  // built -- count down to ends_at using the offset from server_time.
  ends_at?: string | null;
  server_time?: string | null;
  // Every question each side has moved past so far, for progress-bar
  // hydration on initial load/reconnect.
  my_answers?: BattleAnswerProgress[] | null;
  opponent_answers?: BattleAnswerProgress[] | null;
  my_progress?: BattleParticipantProgress | null;
  opponent_progress?: BattleParticipantProgress | null;
  started_at?: string | null;
  finished_at?: string | null;
  reason?: string | null;
  result?: BattleMatchResult | null;
  // "completed" only: this player's own per-question review.
  review?: BattleQuestionReview[] | null;
}

export interface BattleHistoryEntry {
  match_id: number;
  subject: string;
  difficulty: string;
  started_at: string | null;
  finished_at: string | null;
  winner_user_id: number | null;
  opponent_user_id: number | null;
  opponent_username: string | null;
  me: BattleParticipantResult;
  opponent: BattleParticipantResult | null;
}

export interface BattleHistoryResponse {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  entries: BattleHistoryEntry[];
}

export interface SubmitBattleAnswerRequest {
  question_id: number;
  selected_option: string;
}

// The player's next question, returned only once their answer/skip is
// saved (the same again for a repeated Next/Skip). finished=true with
// question=null once they've moved past the last one. Never says whether
// the answer was right.
export interface BattleNextQuestionResponse {
  question_index: number;
  question: BattleQuestionPublic | null;
  finished: boolean;
  ends_at: string;
  server_time: string;
}

// ── GET /battle/analytics ────────────────────────────────────────────────────

export interface BattleRatingPoint {
  match_id: number;
  finished_at: string | null;
  rating: number;
  rating_change: number | null;
  result: BattleParticipantResultLabel | null;
}

export interface BattleRatingHistory {
  subject: string;
  points: BattleRatingPoint[]; // oldest -> newest
}

export type BattleSpeedTierKey = "fast" | "quick" | "steady" | "slow";

export interface BattleSpeedTier {
  tier: BattleSpeedTierKey;
  max_seconds: number | null; // inclusive upper bound; null for the last, open-ended tier
  answered: number;
  correct: number;
}

export interface BattleTopicStat {
  subject: string;
  lesson: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface BattleAnalyticsResponse {
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  forfeits: number;
  win_rate: number;
  average_score: number;
  answered: number;
  correct: number;
  accuracy: number;
  recent_form: BattleParticipantResultLabel[]; // oldest -> newest
  rating_history: BattleRatingHistory[]; // most-played subject first
  speed_profile: BattleSpeedTier[]; // fastest tier first, always all four
  points: { base: number; speed_bonus: number; streak_bonus: number };
  topics: BattleTopicStat[]; // strongest first, lessons with enough answers only
  vs_stronger: { played: number; wins: number };
  // Every question dealt in completed matches, by what happened to it.
  question_usage?: { questions: number; answered: number; skipped: number; not_reached: number };
  // How matches ended (matches from before self-paced play aren't counted).
  match_endings?: {
    all_finished: number;
    time_up: number;
    forfeit: number;
    finished_all_questions: number;
    average_finish_seconds: number | null;
  };
}
