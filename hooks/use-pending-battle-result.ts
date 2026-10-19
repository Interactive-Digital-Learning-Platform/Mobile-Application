import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// A battle this player finished first and left to wait for from the home
// screen -- remembered until they open its results once. While it's set the
// Online tab shows "Show Results" instead of the matchmaking button, and
// BattleResultWatcher toasts when the opponent finishes. Persisted so an app
// restart mid-wait doesn't lose it.
export interface PendingBattleResult {
  matchId: number;
  subject: string;
  // When it was remembered.
  setAt: number;
  // Set only once the server's own match state says "completed" -- the
  // opponent really finished (or the clock ran out). Drives the toast and
  // the "results are ready" hint; never guessed from matchmaking status.
  completed?: boolean;
}

const STORAGE_KEY = "battle:pendingResult";

let current: PendingBattleResult | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      // Something set in the meantime is newer than what's on disk.
      if (!raw || current) return;
      const parsed = JSON.parse(raw) as PendingBattleResult;
      if (typeof parsed?.matchId === "number") {
        current = {
          matchId: parsed.matchId,
          subject: parsed.subject ?? "",
          setAt: parsed.setAt ?? 0,
          completed: parsed.completed === true,
        };
        emit();
      }
    })
    .catch(() => {});
}

function save(next: PendingBattleResult) {
  current = next;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
}

export function setPendingBattleResult(result: { matchId: number; subject: string }) {
  if (current?.matchId === result.matchId) return;
  save({ ...result, setAt: Date.now(), completed: false });
}

export function markPendingBattleResultCompleted(matchId: number) {
  if (current?.matchId !== matchId || current.completed) return;
  save({ ...current, completed: true });
}

// Only clears it if it's still this match -- a later battle's pending result
// must not be wiped by an older one's results being opened.
export function clearPendingBattleResult(matchId: number) {
  if (current?.matchId !== matchId) return;
  current = null;
  emit();
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePendingBattleResult(): PendingBattleResult | null {
  return useSyncExternalStore(subscribe, () => current);
}
