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
  ParticipantQuestionResult,
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

// Carries subject/difficulty/question_count directly -- these used to only
// arrive via a separate REST fetch that raced this exact transition (it
// could resolve while the match was still "countdown" server-side, which
// never had question_count to return), leaving question_count permanently
// unset for the rest of the match on fast connections.
export interface BattleWsMatchStartedEvent {
  type: "match_started";
  started_at: string;
  subject: string;
  difficulty: string;
  question_count: number;
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

// Grading is deferred to the reveal boundary now (see
// BattleWsQuestionResultEvent below) — this is just a lightweight
// "your (re)submission was accepted" ack, never reveals correctness.
export interface BattleWsAnswerAcknowledgedEvent {
  type: "answer_acknowledged";
  question_id: number;
  selected_option: string;
}

// Pushed once per question, at the reveal boundary (last
// BATTLE_ANSWER_REVEAL_SECONDS of its window) — both players receive the
// SAME event (results for both participants), simultaneously, regardless of
// who (if anyone) answered. Replaces the old instant-per-submission
// answer_acknowledged(grading)/opponent_answered pair entirely.
export interface BattleWsQuestionResultEvent {
  type: "question_result";
  question_order: number;
  results: ParticipantQuestionResult[];
  correct_answer: string | null;
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
  | BattleWsQuestionResultEvent
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
