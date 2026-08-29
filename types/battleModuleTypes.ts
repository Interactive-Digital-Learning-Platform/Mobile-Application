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
export interface BattleMatchResult {
  winner_user_id: number | null;
  me: BattleParticipantResult;
  opponent: BattleParticipantResult | null;
}

export interface BattleAnswerProgress {
  // One question slot's outcome for a participant's progress bar. Every
  // GRADED slot gets an entry now (deferred-grading design), including ones
  // this participant never actually submitted anything for -- `answered`
  // distinguishes "answered wrong" from "never answered at all" (both grade
  // is_correct=false) for the progress bar's yellow-vs-red coloring.
  // Absence of an entry entirely just means this slot isn't graded yet.
  question_order: number;
  is_correct: boolean;
  answered: boolean;
}

// One participant's graded outcome for one question, revealed to BOTH
// players simultaneously at the reveal boundary (see the `question_result`
// WS event). Deliberately no `selected_option` — never leaked to the
// opponent, only correctness is shared.
export interface ParticipantQuestionResult {
  user_id: number;
  answered: boolean;
  is_correct: boolean;
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
  // Seconds remaining in the CURRENT question's fixed window (lockstep play).
  time_remaining_seconds?: number | null;
  countdown_seconds_remaining?: number | null;
  // The single live question both players are currently on.
  question_index?: number | null;
  question?: BattleQuestionPublic | null;
  has_answered_current_question?: boolean | null;
  // Every question slot answered so far by each side, for progress-bar
  // hydration on initial load/reconnect.
  my_answers?: BattleAnswerProgress[] | null;
  opponent_answers?: BattleAnswerProgress[] | null;
  // Populated only once the CURRENT question has locked/been graded — null
  // means it's still answerable. Lets a reconnecting client immediately
  // show the locked/revealed state instead of a live answering UI.
  current_question_results?: ParticipantQuestionResult[] | null;
  current_question_correct_answer?: string | null;
  my_progress?: BattleParticipantProgress | null;
  opponent_progress?: BattleParticipantProgress | null;
  started_at?: string | null;
  finished_at?: string | null;
  reason?: string | null;
  result?: BattleMatchResult | null;
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

export interface SubmitBattleAnswerResponse {
  // Deliberately minimal — grading is deferred to the reveal boundary (see
  // ParticipantQuestionResult / the `question_result` WS event), so
  // submitting no longer reveals correctness. Just an ack that the
  // (re)submission was accepted.
  question_id: number;
  selected_option: string;
}
