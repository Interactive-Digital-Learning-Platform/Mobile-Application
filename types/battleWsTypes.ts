// Mirrors the ACTUAL wire shapes sent by Personalized-Quiz-Service's
// app/api/routes/battle_ws.py / battle_ws_events.py / battle_gameplay_service.py
// — verified against the real send_json()/publish() call sites, not just the
// declared (partly unused, partly inaccurate) Pydantic classes in
// app/schemas/battle_ws.py. Notably `match_finished` differs from that
// file's `MatchFinishedEvent` class: the real payload is a flat
// `participants` array, not a `{me, opponent}` split.

import {
  BattleMatchStateResponse,
  BattleParticipantResult,
  BattleQuestionPublic,
} from "@/types/battleModuleTypes";

export interface BattleWsConnectedEvent {
  type: "connected";
  match_id: number;
}

export interface BattleWsStateSyncEvent {
  type: "state_sync";
  state: BattleMatchStateResponse;
}

export interface BattleWsPlayerReadyEvent {
  type: "player_ready";
  user_id: number;
}

export interface BattleWsCountdownStartedEvent {
  type: "countdown_started";
  started_at: string;
  duration_seconds: number;
}

export interface BattleWsMatchStartedEvent {
  type: "match_started";
  started_at: string;
}

// Pushed once per question boundary (including the very first, right after
// match_started) — lockstep play, both players receive the SAME
// question_index/question at the SAME instant.
export interface BattleWsQuestionStartedEvent {
  type: "question_started";
  question_index: number;
  question: BattleQuestionPublic;
  time_remaining_seconds: number;
}

export interface BattleWsAnswerAcknowledgedEvent {
  type: "answer_acknowledged";
  question_id: number;
  is_correct: boolean;
  base_score: number;
  speed_bonus: number;
  streak_bonus: number;
  total_question_score: number;
  response_time_ms: number;
}

export interface BattleWsOpponentAnsweredEvent {
  type: "opponent_answered";
  user_id: number;
  answered_count: number;
  // Which question slot this was for and whether it was correct — drives
  // the opponent's live progress-bar segment. Never includes the selected
  // option itself.
  question_order: number;
  is_correct: boolean;
}

export interface BattleWsPlayerDisconnectedEvent {
  type: "player_disconnected";
  user_id: number;
  deadline: string;
  grace_period_seconds: number;
}

export interface BattleWsPlayerReconnectedEvent {
  type: "player_reconnected";
  user_id: number;
}

// Real shape: a flat `participants` array, NOT {winner_user_id, result:{me,opponent}}.
export interface BattleWsMatchFinishedEvent {
  type: "match_finished";
  winner_user_id: number | null;
  participants: BattleParticipantResult[];
}

export interface BattleWsMatchCancelledEvent {
  type: "match_cancelled";
  reason: string | null;
}

export interface BattleWsErrorEvent {
  type: "error";
  detail: string;
}

export type BattleWsInboundEvent =
  | BattleWsConnectedEvent
  | BattleWsStateSyncEvent
  | BattleWsPlayerReadyEvent
  | BattleWsCountdownStartedEvent
  | BattleWsMatchStartedEvent
  | BattleWsQuestionStartedEvent
  | BattleWsAnswerAcknowledgedEvent
  | BattleWsOpponentAnsweredEvent
  | BattleWsPlayerDisconnectedEvent
  | BattleWsPlayerReconnectedEvent
  | BattleWsMatchFinishedEvent
  | BattleWsMatchCancelledEvent
  | BattleWsErrorEvent;

// Outbound (client -> server) — constructed locally, not parsed, so plain types suffice.
export type BattleWsOutboundMessage =
  | { type: "ready" }
  | { type: "answer"; question_id: number; selected_option: string }
  | { type: "forfeit" };
