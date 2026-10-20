import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { notesAssetsClient } from "@/api/notesClients";

export function useNotesTranscript(audioUrl: string, inlineText?: string) {
  const { userId } = useAuth();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    owner: string;
    url: string;
    text?: string;
    error?: boolean;
  } | null>(null);
  const retry = useCallback(() => setVersion((value) => value + 1), []);
  const scriptOnly = /\.txt$/i.test(audioUrl);
  useEffect(() => {
    setState(null);
    if (!userId || inlineText?.trim() || !scriptOnly) return;
    const controller = new AbortController();
    const path = `/${audioUrl.replace(/^\/+/, "")}`;
    if (
      !/^\/generated_audio\/[a-zA-Z0-9][a-zA-Z0-9_.-]*\.txt$/i.test(path) ||
      path.includes("..")
    ) {
      setState({ owner: userId, url: audioUrl, error: true });
      return;
    }
    void notesAssetsClient
      .get(path, { signal: controller.signal, responseType: "text" })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (
          typeof response.data !== "string" ||
          !response.data.trim() ||
          response.data.length > 30000
        )
          throw new Error("Transcript unavailable");
        setState({ owner: userId, url: audioUrl, text: response.data.trim() });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ owner: userId, url: audioUrl, error: true });
      });
    return () => controller.abort();
  }, [userId, audioUrl, inlineText, scriptOnly, version]);
  const current =
    state && state.owner === userId && state.url === audioUrl ? state : null;
  return {
    transcript: userId ? inlineText?.trim() || current?.text : undefined,
    loading: !!userId && !inlineText?.trim() && scriptOnly && !current,
    error: !!current?.error,
    retry,
  };
}
