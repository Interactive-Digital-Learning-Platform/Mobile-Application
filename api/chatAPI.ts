import { assistantClient, SERVICE_URLS } from "@/api/apiClients";
import {
  AttachmentResponseType,
  attachmentResponseSchema,
  conversationResponseSchema,
  messageHistoryResponseSchema,
  SSEEvent,
  sseEventSchema,
} from "@/schemas/chatSchemas";
import {
  ChatConversation,
  PickedFile,
  StreamMessagePropType,
  UserChatsRequest,
} from "@/types/chatModuleTypes";
import { Platform } from "react-native";
import EventSource from "react-native-sse";

export async function createConversation(userID: string): Promise<string> {
  const response = await assistantClient.post("/conversations/", {
    user_id: userID,
  });

  const conversation = conversationResponseSchema.parse(response.data);
  return conversation.conversation_id;
}

export async function fetchUserChats({
  userID,
  limit = 20,
  offset = 0,
}: UserChatsRequest): Promise<ChatConversation[]> {
  const response = await assistantClient.get<ChatConversation[]>(
    "/conversations",
    {
      params: {
        user_id: userID,
        limit,
        offset,
      },
    },
  );

  return response.data;
}

export const fetchMessageHistory = async (conversationID: string) => {
  const response = await assistantClient.get(
    `/conversations/${conversationID}/messages`,
  );

  return messageHistoryResponseSchema.parse(response.data);
};

type UploadAttachmentArgs = {
  conversationID: string;
  userID: string;
  file: PickedFile;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
};

function attachmentUploadError(error: any): Error {
  const status = error?.response?.status;
  if (status === 413) return new Error("That file is too large (max 20 MB).");
  if (status === 415) return new Error("That file type isn't supported.");
  if (status === 403) return new Error("You can't add files to this conversation.");
  if (error?.message === "Network Error" && Platform.OS !== "web") {
    return new Error(
      "Network error — check that EXPO_PUBLIC_API_GATEWAY_URL points at your computer's LAN IP, not localhost.",
    );
  }
  const detail = error?.response?.data?.detail;
  return new Error(
    typeof detail === "string" ? detail : "Couldn't upload the attachment.",
  );
}

export async function uploadAttachment({
  conversationID,
  userID,
  file,
  signal,
  onProgress,
}: UploadAttachmentArgs): Promise<AttachmentResponseType> {
  const form = new FormData();
  form.append("user_id", userID);

  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    form.append("file", blob, file.name);
  } else {
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as any);
  }

  try {
    const response = await assistantClient.post(
      `/conversations/${conversationID}/attachments/`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (data) => data,
        signal,
        onUploadProgress: (event) => {
          if (!onProgress) return;
          if (event.total) {
            onProgress(Math.min(1, event.loaded / event.total));
          }
        },
      },
    );

    return attachmentResponseSchema.parse(response.data);
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || signal?.aborted) throw error;
    throw attachmentUploadError(error);
  }
}

export async function getAttachmentStatus({
  conversationID,
  attachmentID,
  userID,
}: {
  conversationID: string;
  attachmentID: string;
  userID: string;
}): Promise<AttachmentResponseType> {
  const response = await assistantClient.get(
    `/conversations/${conversationID}/attachments/${attachmentID}`,
    { params: { user_id: userID } },
  );

  return attachmentResponseSchema.parse(response.data);
}

export const streamMessage = async ({
  conversationID,
  userID,
  message,
  attachmentIds,
  callbacks,
  signal,
}: StreamMessagePropType): Promise<void> => {

  let completed = false;

  const complete = (fn: () => void) => {
    if (completed) return;
    completed = true;
    fn();
  };

  return new Promise((resolve, reject) => {
    const es = new EventSource(
      `${SERVICE_URLS.assistant}/conversations/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message,
          user_id: userID,
          conversation_id: conversationID,
          attachment_ids: attachmentIds ?? [],
        }),
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

        if (parsed.type === "conversation_created") {
          callbacks.onConversationCreated?.(parsed.conversation_id)
        }
        else if (parsed.type === "token") {
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

        let rawType: unknown;
        try {
          rawType = JSON.parse(event.data)?.type;
        } catch {
          rawType = undefined;
        }

        if (rawType === "done" || rawType === "error") {
          if (rawType === "error") {
            callbacks.onError("The assistant ran into an error.");
          } else {
            callbacks.onDone("");
          }
          es.close();
          complete(() => resolve());
        }
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
