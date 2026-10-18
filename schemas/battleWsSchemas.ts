import { z } from "zod";

// Validates inbound (server -> client) WS frames for the battle match socket.
// Mirrors schemas/chatSchemas.ts's sseEventSchema pattern. See
// types/battleWsTypes.ts for the reasoning behind each shape (verified
// against the backend's actual send_json()/publish() call sites, not just
// its declared-but-partly-unused Pydantic schema classes).

const battleQuestionPublicSchema = z.object({
  question_id: z.number(),
  question: z.string(),
  options: z.array(z.string()).nullable().optional(),
});

const battleAnswerProgressSchema = z.object({
  question_order: z.number(),
  is_correct: z.boolean().nullable(),
  answered: z.boolean(),
});

const battleQuestionReviewSchema = z.object({
  question_order: z.number(),
  question: z.string(),
  options: z.array(z.string()).nullable(),
  correct_answer: z.string().nullable(),
  selected_option: z.string().nullable(),
  status: z.enum(["correct", "incorrect", "skipped", "unanswered"]),
  response_time_ms: z.number().nullable(),
  base_score: z.number(),
  speed_bonus: z.number(),
  streak_bonus: z.number().default(0),
  total_question_score: z.number(),
});

const battleParticipantProgressSchema = z.object({
  user_id: z.number(),
  answered_count: z.number(),
});

const battleParticipantResultSchema = z.object({
  user_id: z.number(),
  username: z.string().nullable(),
  correct_count: z.number().nullable(),
  wrong_count: z.number().nullable(),
  final_score: z.number().nullable(),
  best_streak: z.number().nullable(),
  total_response_time_ms: z.number().nullable(),
  rating_before: z.number(),
  rating_after: z.number().nullable(),
  rating_delta: z.number().nullable(),
  league: z.enum(["Bronze", "Silver", "Gold", "Platinum", "Diamond"]).nullable(),
  result: z.enum(["win", "loss", "draw", "forfeit"]).nullable(),
});

const battleEndReasonSchema = z.enum(["forfeit", "all_finished", "time_up"]);

const battleMatchResultSchema = z.object({
  winner_user_id: z.number().nullable(),
  end_reason: battleEndReasonSchema.nullable().optional(),
  me: battleParticipantResultSchema,
  opponent: battleParticipantResultSchema.nullable(),
});

// Polymorphic — mirrors BattleMatchStateResponse's optional-everything-but-
// status/match_id shape, since populated fields vary by status.
const battleMatchStateSchema = z.object({
  status: z.enum(["waiting", "countdown", "active", "completed", "cancelled"]),
  match_id: z.number(),
  subject: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  question_count: z.number().nullable().optional(),
  time_remaining_seconds: z.number().nullable().optional(),
  countdown_seconds_remaining: z.number().nullable().optional(),
  question_index: z.number().nullable().optional(),
  question: battleQuestionPublicSchema.nullable().optional(),
  finished: z.boolean().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  server_time: z.string().nullable().optional(),
  my_answers: z.array(battleAnswerProgressSchema).nullable().optional(),
  opponent_answers: z.array(battleAnswerProgressSchema).nullable().optional(),
  my_progress: battleParticipantProgressSchema.nullable().optional(),
  opponent_progress: battleParticipantProgressSchema.nullable().optional(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  result: battleMatchResultSchema.nullable().optional(),
  review: z.array(battleQuestionReviewSchema).nullable().optional(),
});

const connectedEventSchema = z.object({
  type: z.literal("connected"),
  match_id: z.number(),
});

const stateSyncEventSchema = z.object({
  type: z.literal("state_sync"),
  state: battleMatchStateSchema,
});

const playerReadyEventSchema = z.object({
  type: z.literal("player_ready"),
  user_id: z.number(),
});

const countdownStartedEventSchema = z.object({
  type: z.literal("countdown_started"),
  started_at: z.string(),
  duration_seconds: z.number(),
});

const matchStartedEventSchema = z.object({
  type: z.literal("match_started"),
  started_at: z.string(),
  subject: z.string(),
  difficulty: z.string(),
  question_count: z.number(),
  ends_at: z.string(),
  server_time: z.string(),
});

const nextQuestionEventSchema = z.object({
  type: z.literal("next_question"),
  question_index: z.number(),
  question: battleQuestionPublicSchema.nullable(),
  finished: z.boolean(),
  ends_at: z.string(),
  server_time: z.string(),
});

const playerProgressEventSchema = z.object({
  type: z.literal("player_progress"),
  user_id: z.number(),
  question_order: z.number(),
  answered: z.boolean(),
  answered_count: z.number(),
});

const pingEventSchema = z.object({
  type: z.literal("ping"),
  nonce: z.number(),
});

const playerDisconnectedEventSchema = z.object({
  type: z.literal("player_disconnected"),
  user_id: z.number(),
  deadline: z.string(),
  grace_period_seconds: z.number(),
});

const playerReconnectedEventSchema = z.object({
  type: z.literal("player_reconnected"),
  user_id: z.number(),
});

// Flat `participants` array — the actual wire shape, not the {me,opponent}
// split the backend's (unused) MatchFinishedEvent Pydantic class declares.
const matchFinishedEventSchema = z.object({
  type: z.literal("match_finished"),
  winner_user_id: z.number().nullable(),
  end_reason: battleEndReasonSchema.nullable().optional(),
  participants: z.array(battleParticipantResultSchema),
});

const matchCancelledEventSchema = z.object({
  type: z.literal("match_cancelled"),
  reason: z.string().nullable(),
});

const errorEventSchema = z.object({
  type: z.literal("error"),
  detail: z.string(),
});

export const battleWsInboundEventSchema = z.discriminatedUnion("type", [
  connectedEventSchema,
  stateSyncEventSchema,
  playerReadyEventSchema,
  countdownStartedEventSchema,
  matchStartedEventSchema,
  nextQuestionEventSchema,
  playerProgressEventSchema,
  pingEventSchema,
  playerDisconnectedEventSchema,
  playerReconnectedEventSchema,
  matchFinishedEventSchema,
  matchCancelledEventSchema,
  errorEventSchema,
]);

export type BattleWsInboundEventParsed = z.infer<typeof battleWsInboundEventSchema>;
