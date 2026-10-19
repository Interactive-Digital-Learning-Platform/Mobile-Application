import { SharedMessageType } from "@/schemas/chatSchemas";
import { MessageType } from "@/types/chatModuleTypes";
import { attachmentKindFromMime } from "@/constants/attachments";
import * as Linking from "expo-linking";

/**
 * Whether a message would make it into a shared snapshot: finished, not an
 * error, and with something to show. Used to decide if Share is available.
 */
export function isShareableMessage(message: MessageType): boolean {
  const text =
    message.isTranslated && message.translatedContent
      ? message.translatedContent
      : message.content;

  return !message.isLoading && !message.isError && Boolean(text.trim());
}

/**
 * Deep link that opens the read-only shared chat screen
 * (`app/(main)/shared/[token].tsx`). `createURL` picks the right form for the
 * runtime: `mobileapplication://shared/<token>` in a build, or the
 * `exp://<host>/--/shared/<token>` form while running in Expo Go.
 */
export function sharedChatUrl(token: string): string {
  return Linking.createURL(`shared/${encodeURIComponent(token)}`);
}

const SHARED_ID_PREFIX = "shared-";

/**
 * Maps a shared snapshot onto the chat's message shape so it renders with the
 * same `Message` component. The snapshot has no server ids by design, so ids
 * are its positions ("shared-<index>"); `sharedMessageIndex` reverses that.
 */
export function sharedMessagesToChat(
  messages: SharedMessageType[],
): MessageType[] {
  return messages.flatMap((message, index): MessageType[] => {
    if (message.role === "system") return [];
    const id = `${SHARED_ID_PREFIX}${index}`;

    return [
      {
        id,
        localID: id,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.created_at),
        type: "text",
        sources: message.sources,
        isTranslated: message.is_translated,
        translatedContent: message.translated_content ?? undefined,
        attachments: message.attachments.length
          ? message.attachments.map((attachment, attachmentIndex) => ({
              localID: `${id}-attachment-${attachmentIndex}`,
              kind: attachmentKindFromMime(attachment.content_type),
              filename: attachment.filename,
              mimeType: attachment.content_type,
              status: "ready" as const,
            }))
          : undefined,
      },
    ];
  });
}

export function sharedMessageIndex(id: string): number | null {
  if (!id.startsWith(SHARED_ID_PREFIX)) return null;
  const index = Number(id.slice(SHARED_ID_PREFIX.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
}
