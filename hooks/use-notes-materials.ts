import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { materialsApi } from "@/api/notesAPI";
import { createMaterialPoller, MaterialsOverview } from "@/utils/noteMaterials";
import { notesErrorMessage } from "@/utils/noteErrors";

export function useNotesMaterials(noteId: string, enabled: boolean) {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [overview, setOverview] = useState<MaterialsOverview | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "error" | "paused">("loading");
  const [requestingType, setRequestingType] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const poller = useRef<ReturnType<typeof createMaterialPoller> | null>(null);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => {
    const listener = AppState.addEventListener("change", value => setActive(value === "active"));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    setOverview(null);
    setRequestError(null);
    setRequestingType(null);
    return () => { mutation.current?.abort(); mutation.current = null; };
  }, [noteId, enabled]);
  useEffect(() => {
    if (!enabled || !focused || !active) return;
    setState("loading");
    const instance = createMaterialPoller({
      request: async signal => {
        const response = await materialsApi.getMaterials(noteId, signal);
        if (!response.success) throw new Error("Materials unavailable");
        return response.data;
      },
      onUpdate: data => { setOverview(data); setState("idle"); },
      onStop: reason => setState(reason),
    });
    poller.current = instance;
    instance.refresh();
    return () => { instance.stop(); if (poller.current === instance) poller.current = null; };
  }, [noteId, enabled, focused, active]);
  const refresh = useCallback(() => { setState("loading"); poller.current?.refresh(); }, []);
  const generate = useCallback(async (type: string) => {
    if (mutation.current || !enabled) return;
    const controller = new AbortController();
    mutation.current = controller;
    setRequestingType(type);
    setRequestError(null);
    try {
      const response = await materialsApi.generateMaterials(noteId, [type], controller.signal);
      if (!response.success) throw new Error("Request failed");
      if (!controller.signal.aborted) refresh();
    } catch (error) {
      if (!controller.signal.aborted) setRequestError(notesErrorMessage(error, "We couldn't request your material. Please try again in a moment."));
    } finally {
      if (mutation.current === controller) { mutation.current = null; setRequestingType(null); }
    }
  }, [noteId, enabled, refresh]);
  return { overview, state, requestingType, requestError, refresh, generate };
}
