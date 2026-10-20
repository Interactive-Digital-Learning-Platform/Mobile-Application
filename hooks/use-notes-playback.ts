import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const seconds = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
export function podcastTime(value: number): string {
  const total = Math.floor(seconds(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** This screen owns only its player, not the app's shared audio session settings. */
export function useNotesPlayback(uri: string, focused: boolean) {
  const player = useAudioPlayer({ uri }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const active = useRef(false);
  const pending = useRef(false);
  const lifecycle = useRef(0);
  const duration = seconds(status.duration);
  const position = Math.min(seconds(status.currentTime), duration || Infinity);
  const ended =
    status.didJustFinish ||
    (duration > 0 && position >= duration - 0.15 && !status.playing);
  const ready = status.isLoaded && duration > 0;
  const waiting = !ready || status.isBuffering;

  useEffect(() => {
    if (status.playing) setHasPlayed(true);
  }, [status.playing]);

  useEffect(() => {
    let instance = ++lifecycle.current;
    pending.current = false;
    setBusy(false);
    active.current = focused && AppState.currentState === "active";
    const pause = () => {
      try {
        player.pause();
      } catch {
        /* Releasing an old player is harmless. */
      }
    };
    if (!active.current) pause();
    const subscription = AppState.addEventListener("change", (state) => {
      active.current = focused && state === "active";
      if (!active.current) {
        lifecycle.current = ++instance;
        pending.current = false;
        setBusy(false);
        pause();
      }
    });
    return () => {
      lifecycle.current = instance + 1;
      active.current = false;
      subscription.remove();
      pause();
    };
  }, [player, focused]);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      try {
        player.pause();
      } catch {
        /* Show the same safe retry state. */
      }
      setError(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [player, waiting]);

  const run = useCallback(async (operation: () => Promise<void> | void) => {
    if (!active.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    const instance = lifecycle.current;
    try {
      await operation();
    } catch {
      if (lifecycle.current === instance) setError(true);
    } finally {
      if (lifecycle.current === instance) {
        pending.current = false;
        setBusy(false);
      }
    }
  }, []);

  const seek = (target: number) =>
    run(async () => {
      if (!ready || !Number.isFinite(target)) return;
      await player.seekTo(Math.max(0, Math.min(target, duration)));
    });
  const toggle = () => {
    const instance = lifecycle.current;
    return run(async () => {
      if (status.playing) {
        player.pause();
        return;
      }
      if (!ready || status.isBuffering) return;
      if (ended) await player.seekTo(0);
      // A seek can resolve after navigation/backgrounding. Never start then.
      if (active.current && lifecycle.current === instance) player.play();
    });
  };
  const changeRate = (rate: number) =>
    run(() => {
      if (![0.75, 1, 1.25, 1.5].includes(rate) || !ready) return;
      player.setPlaybackRate(rate);
    });

  return {
    error,
    busy,
    waiting,
    ready,
    ended,
    hasPlayed,
    duration,
    position,
    playing: status.playing,
    rate: status.playbackRate || 1,
    progress: duration > 0 ? Math.min(1, position / duration) : 0,
    toggle,
    seek,
    changeRate,
  };
}
