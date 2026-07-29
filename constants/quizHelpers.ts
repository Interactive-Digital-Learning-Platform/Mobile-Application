/**
 * quizHelpers.ts
 * ─────────────────────────────────────────────────────────────────────
 * Shared pure-utility functions and constants used across quiz screens
 * and components.  Import from here instead of re-declaring locally.
 */

/** A, B, C, D option labels for multiple-choice questions */
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/**
 * Capitalizes the first letter, lowercases the rest.
 * @example capitalize("EASY") → "Easy"
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Formats a seconds value as MM:SS.
 * @example formatTime(125) → "02:05"
 */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Returns a human-readable progress label.
 * @example progressLabel(7, 10, 70) → "7/10 completed"
 */
export function progressLabel(
  progress: number,
  questions: number
): string {
  if (progress === 0)   return "Not started";
  if (progress === 100) return "Completed";
  const done = Math.round((progress / 100) * questions);
  return `${done}/${questions} completed`;
}
