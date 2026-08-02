import {
  createConversation,
  fetchMessageHistory,
  streamMessage,
} from "@/api/chatAPI";
import { ChatInputValues } from "@/schemas/chatSchemas";
import { MessageType, UseChatReturn } from "@/types/chatModuleTypes";
import { useUser } from "@clerk/expo";
import { FlashListRef } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export function useChat(): UseChatReturn {
  const { user } = useUser();
  const chatRef = useRef<FlashListRef<MessageType> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasPendingMessagesRef = useRef(false);

  const tokenBufferRef = useRef<string>("");
  const activeAssistantIDRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);

  const [messages, setMessages] = useState<MessageType[]>([]);

  const conversationIDRef = useRef<string | null>(null);
  const [conversationID, setConversationID] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [beforeCursor, setBeforeCursor] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const setConversationIDSync = useCallback((id: string) => {
    conversationIDRef.current = id;
    setConversationID(id);
  }, []);

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
    }));

    setMessages(mapped);
  }, [messageHistory]);

  useEffect(() => {
    if (messages.length === 0) return;

    const timeout = setTimeout(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(timeout);
  }, [messages.length]);

  const updateMessage = useCallback(
    (localID: string, updater: (message: MessageType) => MessageType) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.localID === localID ? updater(msg) : msg)),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (values: ChatInputValues) => {
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

      setMessages((prev) => [
        ...prev,
        {
          id: userLocalId,
          localID: userLocalId,
          content: trimmed,
          type: "text" as const,
          role: "user" as const,
          createdAt: new Date(),
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

      setIsStreaming(true);

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        let activeConversationID = conversationIDRef.current;

        if (!activeConversationID) {
          activeConversationID = await createConversation(user?.id);
          setConversationID(activeConversationID);
        }

        await streamMessage({
          conversationID: activeConversationID,
          userID: user?.id,
          message: trimmed,
          signal: abortControllerRef.current?.signal,
          callbacks: {
            onToken: (token) => {
              console.log("Token ", token);
              tokenBufferRef.current += token;
              const buffered = tokenBufferRef.current;

              setMessages((prev) => {
                return prev.map((msg) =>
                  msg.localID === assistantLocalID
                    ? { ...msg, content: buffered }
                    : msg,
                );
              });

              setMessages((prev) => {
                const next = prev.map((msg) =>
                  msg.localID === assistantLocalID
                    ? { ...msg, content: buffered }
                    : msg,
                );

                console.log(
                  "Updated assistant:",
                  next.find((m) => m.localID === assistantLocalID)?.content,
                );

                return next;
              });
            },
            onDone: (serverMessageID) => {
              updateMessage(assistantLocalID, (msg) => ({
                ...msg,
                serverID: serverMessageID,
                isLoading: false,
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
        // activeAssistantIDRef.current = null;
        tokenBufferRef.current = "";
      }
    },
    [user?.id, updateMessage, setConversationIDSync],
  );

  const loadMoreHistory = useCallback(() => {
    if (!messageHistory?.has_more || !messageHistory?.next_cursor) return;
    setBeforeCursor(messageHistory?.next_cursor);
  }, [messageHistory]);

  return {
    messages,
    conversationID,
    isStreaming,
    isSending: isStreaming,
    hasMoreHistory: messageHistory?.has_more ?? false,
    isLoadingHistory,
    chatRef,
    sendMessage,
    loadMoreHistory,
  };
}
