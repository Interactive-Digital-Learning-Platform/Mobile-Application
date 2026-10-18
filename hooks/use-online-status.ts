import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

// Device connectivity as React Query sees it (fed by NetInfo in QueryClientProviderCom), so UI that says "offline"
// always agrees with whether queries are actually paused.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

export function showOfflineToast(message: string) {
  Toast.show({ type: "info", text1: "You're offline", text2: message });
}

export const OFFLINE_COPY = {
  createQuiz: "Connect to the internet to create a quiz.",
  startQuiz: "Connect to the internet to start this quiz.",
  deleteQuiz: "Connect to the internet to delete this quiz.",
  battle: "Battles need an internet connection.",
};
