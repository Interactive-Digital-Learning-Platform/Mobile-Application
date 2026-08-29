import {z} from "zod";

export const chatInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export type ChatInputValues = z.infer<typeof chatInputSchema>;

const conversationCreatedEventSchema = z.object({
  type: z.literal("conversation_created"),
  conversation_id: z.uuid()
})

const tokenEventSchema = z.object({
  type: z.literal("token"),
  token: z.string(),
});

const doneEventSchema = z.object({
  type: z.literal("done"),
  message_id: z.string(),
  translation_failed: z.boolean().optional().default(false),
  sources: z
    .array(
      z.object({
        filename: z.string().optional(),
        page: z.number().nullish(),
        score: z.number().nullish(),
      }),
    )
    .catch([])
    .default([]),
});

const errorEventSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
});

export const sseEventSchema = z.discriminatedUnion("type", [
  conversationCreatedEventSchema,
  tokenEventSchema,
  doneEventSchema,
  errorEventSchema,
]);

export type SSEEvent = z.infer<typeof sseEventSchema>;

export const sourceCitationSchema = z.object({
  filename: z.string(),
  page: z.number(),
  score: z.number(),
});

export const attachmentStatusSchema = z.enum([
  "uploaded",
  "processing",
  "ready_inline",
  "indexed",
  "failed",
]);

export type AttachmentStatusType = z.infer<typeof attachmentStatusSchema>;

export const attachmentResponseSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  byte_size: z.number(),
  status: attachmentStatusSchema,
  stage: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string(),
  preview_url: z.string().nullable().optional(),
});

export type AttachmentResponseType = z.infer<typeof attachmentResponseSchema>;

export const messageAttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  status: attachmentStatusSchema,
  preview_url: z.string().nullable().optional(),
});

export type MessageAttachmentType = z.infer<typeof messageAttachmentSchema>;

export const conversationResponseSchema = z.object({
  conversation_id: z.uuid(),
  user_id: z.string(),
  title: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  message_count: z.number(),
});

export type ConversationResponse = z.infer<typeof conversationResponseSchema>;

export const messageResponseSchema = z.object({
  id: z.string(),
  message_id: z.string().optional(),
  conversation_id: z.uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  created_at: z.string(),
  is_translated: z.boolean().optional().default(false),
  translated_content: z.string().nullable().optional(),
  sources: z.array(sourceCitationSchema).optional().default([]),
  attachments: z.array(messageAttachmentSchema).optional().default([]),
});

export const messageHistoryResponseSchema = z.object({
  messages: z.array(messageResponseSchema),
  total: z.number(),
  has_more: z.boolean(),
  next_cursor: z.string().nullable().optional(),
});

export type MessageResponseType = z.infer<typeof messageResponseSchema>;
export type MessageHistoryResponseType = z.infer<
  typeof messageHistoryResponseSchema
>;

