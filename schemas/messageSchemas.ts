import z from "zod";

export const citationSchema = z.object({
  title: z.string(),
  from: z.string(),
  content: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  createdAt: z
    .union([z.number(), z.string(), z.date()]),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  isLoading: z.boolean().optional().default(false),
  isError: z.boolean().optional().default(false),
  type: z.enum(["text", "code"]).default("text"),
  citations: z.array(citationSchema).optional(),
  tokens: z.number().optional(),
});

