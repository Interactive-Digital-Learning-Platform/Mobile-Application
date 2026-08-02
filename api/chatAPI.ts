import { assistantClient, SERVICE_URLS } from "@/api/apiClients";
import {
  conversationResponseSchema,
  messageHistoryResponseSchema,
  SSEEvent,
  sseEventSchema,
} from "@/schemas/chatSchemas";
import { StreamCallbacks } from "@/types/chatModuleTypes";
import EventSource from "react-native-sse";

export async function createConversation(userID: string): Promise<string> {
  const response = await assistantClient.post("/conversations/", {
    user_id: userID,
  });

  const conversation = conversationResponseSchema.parse(response.data);
  return conversation.conversation_id;
}

export const fetchMessageHistory = async (conversationID: string) => {
  const response = await assistantClient.get(
    `/conversations/${conversationID}/messages`,
  );

  return messageHistoryResponseSchema.parse(response.data);
};

export const streamMessage = async (params: {
  conversationID: string;
  userID: string;
  message: string;
  callbacks: StreamCallbacks;
  signal?: AbortSignal;
}): Promise<void> => {
  const { conversationID, userID, message, callbacks, signal } = params;

  let completed = false;

  const complete = (fn: () => void) => {
    if (completed) return;
    completed = true;
    fn();
  };

  return new Promise((resolve, reject) => {
    const es = new EventSource(
      `${SERVICE_URLS.assistant}/conversations/${conversationID}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message, user_id: userID }),
        pollingInterval: 0,
      },
    );

    signal?.addEventListener("abort", () => {
      es.close();
      complete(() => resolve());
    });

    es.addEventListener("message", (event) => {
      if (!event.data) return;

      try {
        const parsed: SSEEvent = sseEventSchema.parse(JSON.parse(event.data));

        if (parsed.type === "token") {
          callbacks.onToken(parsed.token);
        } else if (parsed.type === "done") {
          callbacks.onDone(parsed.message_id);
          es.close();
          complete(() => resolve());
        } else if (parsed.type === "error") {
          callbacks.onError(parsed.error);
          es.close();
          complete(() => resolve());
        }
      } catch (error) {
        console.warn("[SSE] Parse error", error, "raw:", event.data);
      }
    });

    es.addEventListener("error", (event) => {
      console.error("[SSE] Stream error", event);
      es.close();

      complete(() => reject(new Error("SSE connection error!")));
    });

    es.addEventListener("open", () => {
      console.debug("[SSE] Connection opened");
    });
  });
};
