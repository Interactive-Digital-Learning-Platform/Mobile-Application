import type { AttachmentStatusType } from "@/schemas/chatSchemas";
import type { ChatAttachmentStatus } from "@/types/chatModuleTypes";

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME)[number];


export const ATTACHMENT_POLL_INTERVAL_MS = 2000;


export const ATTACHMENT_POLL_TIMEOUT_MS = 120_000;

export function isAllowedAttachmentMime(
  mime: string,
): mime is AllowedAttachmentMime {
  return (ALLOWED_ATTACHMENT_MIME as readonly string[]).includes(mime);
}


export function isTerminalAttachmentStatus(status: AttachmentStatusType): boolean {
  return (
    status === "ready_inline" || status === "indexed" || status === "failed"
  );
}


export function mapServerAttachmentStatus(
  status: AttachmentStatusType,
): ChatAttachmentStatus {
  if (status === "failed") return "failed";
  if (status === "ready_inline" || status === "indexed") return "ready";
  return "processing";
}


export function attachmentKindFromMime(mime: string): "image" | "pdf" {
  return mime.startsWith("image/") ? "image" : "pdf";
}
