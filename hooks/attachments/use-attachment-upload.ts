import { getAttachmentStatus, uploadAttachment } from "@/api/chatAPI";
import {
  ATTACHMENT_POLL_INTERVAL_MS,
  ATTACHMENT_POLL_TIMEOUT_MS,
  attachmentKindFromMime,
  isTerminalAttachmentStatus,
  mapServerAttachmentStatus,
} from "@/constants/attachments";
import { ChatAttachment, PickedFile } from "@/types/chatModuleTypes";
import { useCallback, useEffect, useRef, useState } from "react";

type StateUpdater = ChatAttachment | null | ((prev: ChatAttachment | null) => ChatAttachment | null);


export function useAttachmentUpload(userID: string | undefined) {
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);

  const attachmentRef = useRef<ChatAttachment | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = useRef<number>(0);
  const lastAttemptRef = useRef<{ file: PickedFile; conversationID: string } | null>(null);

  const update = useCallback((next: StateUpdater) => {
    setAttachment((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      attachmentRef.current = value;
      return value;
    });
  }, []);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearPoll();
  }, [clearPoll]);

  useEffect(() => teardown, [teardown]);

  const markTimedOut = useCallback(
    (attachmentID: string) => {
      update((prev) =>
        prev && prev.serverID === attachmentID
          ? {
              ...prev,
              status: "failed",
              error: "Attachment analysis timed out",
            }
          : prev,
      );
    },
    [update],
  );

  const poll = useCallback(
    (conversationID: string, attachmentID: string) => {
      clearPoll();
      pollTimerRef.current = setTimeout(async () => {
        try {
          const res = await getAttachmentStatus({
            conversationID,
            attachmentID,
            userID: userID ?? "",
          });

          update((prev) =>
            prev && prev.serverID === attachmentID
              ? {
                  ...prev,
                  status: mapServerAttachmentStatus(res.status),
                  previewUrl: res.preview_url ?? prev.previewUrl,
                  error:
                    res.status === "failed"
                      ? res.error_message ?? "Processing failed"
                      : prev.error,
                }
              : prev,
          );

          if (isTerminalAttachmentStatus(res.status)) return;
          if (Date.now() > pollDeadlineRef.current) {
            markTimedOut(attachmentID);
            return;
          }
          poll(conversationID, attachmentID);
        } catch {
          if (Date.now() > pollDeadlineRef.current) {
            markTimedOut(attachmentID);
            return;
          }
          poll(conversationID, attachmentID);
        }
      }, ATTACHMENT_POLL_INTERVAL_MS);
    },
    [clearPoll, markTimedOut, update, userID],
  );

  const start = useCallback(
    async (file: PickedFile, conversationID: string) => {
      if (!userID) return;

      teardown();
      lastAttemptRef.current = { file, conversationID };

      const controller = new AbortController();
      abortRef.current = controller;

      const localID = `att-${Date.now()}`;
      update({
        localID,
        kind: attachmentKindFromMime(file.mimeType),
        filename: file.name,
        mimeType: file.mimeType,
        size: file.size,
        localUri: file.uri,
        status: "uploading",
        uploadProgress: 0,
      });

      try {
        const res = await uploadAttachment({
          conversationID,
          userID,
          file,
          signal: controller.signal,
          onProgress: (fraction) =>
            update((prev) =>
              prev && prev.localID === localID
                ? { ...prev, uploadProgress: fraction }
                : prev,
            ),
        });

        update((prev) =>
          prev && prev.localID === localID
            ? {
                ...prev,
                serverID: res.id,
                status: mapServerAttachmentStatus(res.status),
                previewUrl: res.preview_url ?? prev.previewUrl,
                uploadProgress: 1,
              }
            : prev,
        );

        if (!isTerminalAttachmentStatus(res.status)) {
          pollDeadlineRef.current = Date.now() + ATTACHMENT_POLL_TIMEOUT_MS;
          poll(conversationID, res.id);
        }
      } catch (error: any) {
        if (controller.signal.aborted || error?.code === "ERR_CANCELED") return;
        update((prev) =>
          prev && prev.localID === localID
            ? {
                ...prev,
                status: "failed",
                error: error?.message ?? "Upload failed",
              }
            : prev,
        );
      }
    },
    [poll, teardown, update, userID],
  );

  const retry = useCallback(() => {
    const attempt = lastAttemptRef.current;
    if (attempt) start(attempt.file, attempt.conversationID);
  }, [start]);

  const reset = useCallback(() => {
    teardown();
    lastAttemptRef.current = null;
    update(null);
  }, [teardown, update]);

  const getSendable = useCallback((): {
    attachmentIds: string[];
    snapshot: ChatAttachment;
  } | null => {
    const current = attachmentRef.current;
    if (!current || !current.serverID || current.status === "failed") return null;
    return { attachmentIds: [current.serverID], snapshot: current };
  }, []);

  return { attachment, start, retry, remove: reset, reset, getSendable };
}
