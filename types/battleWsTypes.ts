// Mirrors the ACTUAL wire shapes sent by Personalized-Quiz-Service's
// app/api/routes/battle_ws.py / battle_ws_events.py / battle_gameplay_service.py
// — verified against the real send_json()/publish() call sites, not just the
// declared (partly unused, partly inaccurate) Pydantic classes in
// app/schemas/battle_ws.py. Notably `match_finished` differs from that
// file's `MatchFinishedEvent` class: the real payload is a flat
// `participants` array, not a `{me, opponent}` split.

import {
  BattleEndReason,
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
  // When the match clock runs out, and the server's clock at send time.
  ends_at: string;
  server_time: string;
}

// Sent only to the player it's for: question 0 to everyone when the match
// starts, then each player's next question right after their answer/skip is
// saved (the same again for a repeated Next/Skip). finished=true with
// question=null once they've moved past the last one. Never says whether
// the answer was right.
export interface BattleWsNextQuestionEvent {
  type: "next_question";
  question_index: number;
  question: BattleQuestionPublic | null;
  finished: boolean;
  ends_at: string;
  server_time: string;
}

// Broadcast after each saved answer/skip so the opponent's progress bar
// moves -- how far a player is, never whether they were right. A player
// also receives their own.
export interface BattleWsPlayerProgressEvent {
  type: "player_progress";
  user_id: number;
  question_order: number;
  answered: boolean; // false = skipped
  answered_count: number;
}

// Answered by api/battleSocket.ts itself with a pong (the round trip feeds
// the server's network allowance for the speed bonus) -- never reaches the
// hook.
export interface BattleWsPingEvent {
  type: "ping";
  nonce: number;
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
  end_reason?: BattleEndReason | null;
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
  | BattleWsNextQuestionEvent
  | BattleWsPlayerProgressEvent
  | BattleWsPingEvent
  | BattleWsPlayerDisconnectedEvent
  | BattleWsPlayerReconnectedEvent
  | BattleWsMatchFinishedEvent
  | BattleWsMatchCancelledEvent
  | BattleWsErrorEvent;

// Outbound (client -> server) — constructed locally, not parsed, so plain types suffice.
export type BattleWsOutboundMessage =
  | { type: "ready" }
  | { type: "answer"; question_id: number; selected_option: string }
  | { type: "skip"; question_id: number }
  | { type: "pong"; nonce: number }
  | { type: "forfeit" };
