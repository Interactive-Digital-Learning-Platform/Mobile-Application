import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

// Lightweight number count-up for the report score ring (spec §1). Honours the OS "reduce
// motion" setting — when it's on, the final value is shown immediately with no animation.
export function useCountUp(target: number, { durationMs = 900, delayMs = 250 } = {}): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = () => {
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - t0) / durationMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * target));
        if (p < 1) frame.current = requestAnimationFrame(tick);
      };
      tick();
    };
    timeout.current = setTimeout(start, delayMs);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [target, durationMs, delayMs, reduceMotion]);

  return value;
}
