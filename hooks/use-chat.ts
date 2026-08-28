import {
  createConversation,
  fetchMessageHistory,
  getAttachmentStatus,
  streamMessage,
} from "@/api/chatAPI";
import {
  ATTACHMENT_POLL_INTERVAL_MS,
  ATTACHMENT_POLL_TIMEOUT_MS,
  attachmentKindFromMime,
  isTerminalAttachmentStatus,
  mapServerAttachmentStatus,
} from "@/constants/attachments";
import { ChatInputValues } from "@/schemas/chatSchemas";
import {
  ChatAttachment,
  ChatLanguage,
  MessageType,
  UseChatReturn,
} from "@/types/chatModuleTypes";
import { useUser } from "@clerk/expo";
import { FlashListRef } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export function useChat(): UseChatReturn {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const chatRef = useRef<FlashListRef<MessageType> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasPendingMessagesRef = useRef(false);
  const embeddedPollTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );

  const tokenBufferRef = useRef<string>("");
  const activeAssistantIDRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<MessageType[]>([]);

  const conversationIDRef = useRef<string | null>(null);
  const [conversationID, setConversationID] = useState<string | null>(null);
  const [language, setLanguage] = useState<ChatLanguage>("English");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [beforeCursor, setBeforeCursor] = useState<string | undefined>(
    undefined,
  );

  const clearEmbeddedPolls = useCallback(() => {
    embeddedPollTimersRef.current.forEach((timer) => clearTimeout(timer));
    embeddedPollTimersRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      clearEmbeddedPolls();

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [clearEmbeddedPolls]);

  const setConversationIDSync = useCallback((id: string) => {
    conversationIDRef.current = id;
    setConversationID(id);
  }, []);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationIDRef.current) return conversationIDRef.current;
    if (!user?.id) throw new Error("User session unavailable");

    const id = await createConversation(user.id);
    setConversationIDSync(id);
    queryClient.invalidateQueries({
      queryKey: ["ai-conversations", user.id],
    });
    return id;
  }, [user?.id, setConversationIDSync, queryClient]);

  const { data: messageHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["ai-messages", conversationID],
    queryFn: () => fetchMessageHistory(conversationID!),
    enabled: Boolean(conversationID),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!messageHistory) return;
    if (hasPendingMessagesRef.current) return;

    const mapped: MessageType[] = messageHistory.messages.map((message) => ({
      id: message.id,
      localID: message.id,
      content: message.content,
      role: message.role,
      createdAt: new Date(message.created_at),
      type: "text" as const,
      sources: message.sources,
      isTranslated: message.is_translated,
      translatedContent: message.translated_content ?? undefined,
      attachments: message.attachments?.length
        ? message.attachments.map(
            (a): ChatAttachment => ({
              localID: a.id,
              serverID: a.id,
              kind: attachmentKindFromMime(a.content_type),
              filename: a.filename,
              mimeType: a.content_type,
              previewUrl: a.preview_url ?? undefined,
              status: mapServerAttachmentStatus(a.status),
            }),
          )
        : undefined,
    }));

    setMessages(mapped);
  }, [messageHistory]);

  const scrollToLatestMessage = useCallback(() => {
    if (scrollTimeoutRef.current) return;

    scrollTimeoutRef.current = setTimeout(() => {
      chatRef.current?.scrollToEnd({ animated: false });
      scrollTimeoutRef.current = null;
    }, 100)
  }, [])

  const updateMessage = useCallback(
    (localID: string, updater: (message: MessageType) => MessageType) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.localID === localID ? updater(msg) : msg)),
      );
    },
    [],
  );

  const patchEmbeddedAttachment = useCallback(
    (
      attachmentID: string,
      patch: (a: NonNullable<MessageType["attachments"]>[number]) => NonNullable<
        MessageType["attachments"]
      >[number],
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.attachments?.some((a) => a.serverID === attachmentID)) {
            return msg;
          }
          return {
            ...msg,
            attachments: msg.attachments.map((a) =>
              a.serverID === attachmentID ? patch(a) : a,
            ),
          };
        }),
      );
    },
    [],
  );

  const pollEmbeddedAttachment = useCallback(
    (conversationID: string, attachmentID: string, deadline: number) => {
      const timer = setTimeout(async () => {
        embeddedPollTimersRef.current.delete(timer);
        try {
          const res = await getAttachmentStatus({
            conversationID,
            attachmentID,
            userID: user?.id ?? "",
          });

          patchEmbeddedAttachment(attachmentID, (a) => ({
            ...a,
            status: mapServerAttachmentStatus(res.status),
            previewUrl: res.preview_url ?? a.previewUrl,
            error:
              res.status === "failed"
                ? res.error_message ?? "Processing failed"
                : a.error,
          }));

          if (isTerminalAttachmentStatus(res.status)) return;
          if (Date.now() > deadline) {
            patchEmbeddedAttachment(attachmentID, (a) => ({
              ...a,
              status: "failed",
              error: "Attachment analysis timed out",
            }));
            return;
          }
          pollEmbeddedAttachment(conversationID, attachmentID, deadline);
        } catch {
          if (Date.now() > deadline) {
            patchEmbeddedAttachment(attachmentID, (a) => ({
              ...a,
              status: "failed",
              error: "Attachment analysis timed out",
            }));
            return;
          }
          pollEmbeddedAttachment(conversationID, attachmentID, deadline);
        }
      }, ATTACHMENT_POLL_INTERVAL_MS);

      embeddedPollTimersRef.current.add(timer);
    },
    [user?.id, patchEmbeddedAttachment],
  );

  const sendMessage = useCallback(
    async (values: ChatInputValues, attachment?: ChatAttachment) => {
      const trimmed = values.message.trim();

      if (!user?.id) throw new Error("User session unavailable");
      if (!trimmed || !user?.id) return;
      if (isSendingRef.current) return;

      isSendingRef.current = true;
      hasPendingMessagesRef.current = true;

      const userLocalId = `local-user-${Date.now()}`;
      const assistantLocalID = `local-assistant-${Date.now()}`;

      activeAssistantIDRef.current = assistantLocalID;
      tokenBufferRef.current = "";

      const sendableAttachment =
        attachment && attachment.serverID && attachment.status !== "failed"
          ? attachment
          : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: userLocalId,
          localID: userLocalId,
          content: trimmed,
          type: "text" as const,
          role: "user" as const,
          createdAt: new Date(),
          attachments: sendableAttachment ? [sendableAttachment] : undefined,
        },
        {
          id: assistantLocalID,
          localID: assistantLocalID,
          serverID: undefined,
          content: "",
          type: "text" as const,
          role: "assistant" as const,
          createdAt: new Date(),
          isLoading: true,
        },
      ]);
      
      setTimeout(scrollToLatestMessage, 0)
      setIsStreaming(true);

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        let activeConversationID = conversationIDRef.current;

        if (
          sendableAttachment &&
          activeConversationID &&
          sendableAttachment.serverID &&
          sendableAttachment.status !== "ready"
        ) {
          pollEmbeddedAttachment(
            activeConversationID,
            sendableAttachment.serverID,
            Date.now() + ATTACHMENT_POLL_TIMEOUT_MS,
          );
        }

        await streamMessage({
          conversationID: activeConversationID ?? undefined,
          userID: user?.id,
          message: trimmed,
          language,
          attachmentIds: sendableAttachment?.serverID
            ? [sendableAttachment.serverID]
            : undefined,
          signal: abortControllerRef.current?.signal,
          callbacks: {
            onConversationCreated: (conversationID) => {
              setConversationIDSync(conversationID);
              queryClient.invalidateQueries({
                queryKey: ["ai-conversations", user?.id]
              })
            },
            onToken: (token) => {
              tokenBufferRef.current += token;
              const buffered = tokenBufferRef.current;

              setMessages(
                (prevMessages) => prevMessages.map((msg) =>
                  msg.localID === assistantLocalID ?
                    {
                      ...msg,
                      content: buffered
                    } : msg,
                )
              );

              scrollToLatestMessage();
            },
            onDone: (serverMessageID, meta) => {
              updateMessage(assistantLocalID, (msg) => ({
                ...msg,
                serverID: serverMessageID || msg.serverID,
                isLoading: false,
                translationFailed: meta?.translationFailed ?? false,
              }));

              hasPendingMessagesRef.current = false;
            },
            onError: (error) => {
              updateMessage(assistantLocalID, (msg) => ({
                ...msg,
                content: error,
                isError: true,
                isLoading: false,
              }));

              hasPendingMessagesRef.current = false;
            },
          },
        });
      } catch (error) {
        updateMessage(assistantLocalID, (msg) => ({
          ...msg,
          content: "Something went wrong. Please try again! " + error,
          isError: true,
          isLoading: false,
        }));

        hasPendingMessagesRef.current = false;
      } finally {
        setIsStreaming(false);
        isSendingRef.current = false;
        tokenBufferRef.current = "";
      }
    },
    [
      user?.id,
      language,
      updateMessage,
      setConversationIDSync,
      scrollToLatestMessage,
      queryClient,
      pollEmbeddedAttachment,
    ],
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();

    const activeID = activeAssistantIDRef.current;
    if (activeID) {
      updateMessage(activeID, (msg) => ({ ...msg, isLoading: false }));
    }

    hasPendingMessagesRef.current = false;
    setIsStreaming(false);
  }, [updateMessage]);

  const loadMoreHistory = useCallback(() => {
    if (!messageHistory?.has_more || !messageHistory?.next_cursor) return;
    setBeforeCursor(messageHistory?.next_cursor);
  }, [messageHistory]);

  const startNewConversation = useCallback(() => {
    abortControllerRef.current?.abort();
    clearEmbeddedPolls();
    hasPendingMessagesRef.current = false;
    isSendingRef.current = false;
    conversationIDRef.current = null;
    setConversationID(null);
    setMessages([]);
    setBeforeCursor(undefined);
  }, [clearEmbeddedPolls]);

  const openConversation = useCallback(
    (nextConversationID: string) => {
      if (nextConversationID === conversationIDRef.current) return;

      abortControllerRef.current?.abort();
      clearEmbeddedPolls();
      hasPendingMessagesRef.current = false;
      isSendingRef.current = false;
      setMessages([]);
      setBeforeCursor(undefined);
      setConversationIDSync(nextConversationID);
    },
    [setConversationIDSync, clearEmbeddedPolls],
  );

  return {
    messages,
    conversationID,
    isStreaming,
    isSending: isStreaming,
    hasMoreHistory: messageHistory?.has_more ?? false,
    isLoadingHistory,
    chatRef,
    language,
    setLanguage,
    sendMessage,
    loadMoreHistory,
    startNewConversation,
    openConversation,
    ensureConversation,
    stopStreaming,
  };
}
