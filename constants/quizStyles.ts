/**
 * quizStyles.ts
 * ─────────────────────────────────────────────────────────
 * Single source of truth for all quiz-wide style tokens.
 * Import from here instead of re-declaring style maps in
 * individual components — keeps the colour palette consistent
 * across quiz-session, results, modals, cards, and sheets.
 */

import {
  Calculator, FlaskConical, Landmark, BookOpen,
  Globe, Code2, HelpCircle,
  type LucideIcon,
} from "lucide-react-native";
import { capitalize } from "@/constants/quizHelpers";

// ─── Types ────────────────────────────────────────────────

export type Difficulty = "Easy" | "Medium" | "Hard";

// ─── Difficulty style tokens ──────────────────────────────

/**
 * Full token set per difficulty level.
 *
 * bg      – pill / badge background   (NativeWind class)
 * text    – pill / badge text colour  (NativeWind class)
 * dot     – small indicator dot       (NativeWind class)
 * bar     – progress-bar fill         (NativeWind class)
 * active  – selected-state button bg + border (NativeWind class)
 */
export const DIFFICULTY_STYLES: Record<
  Difficulty,
  { bg: string; text: string; dot: string; bar: string; active: string }
> = {
  Easy: {
    bg:     "bg-emerald-100",
    text:   "text-emerald-700",
    dot:    "bg-emerald-500",
    bar:    "bg-emerald-500",
    active: "bg-emerald-500 border-emerald-500",
  },
  Medium: {
    bg:     "bg-amber-100",
    text:   "text-amber-700",
    dot:    "bg-amber-500",
    bar:    "bg-amber-500",
    active: "bg-amber-500 border-amber-500",
  },
  Hard: {
    bg:     "bg-rose-100",
    text:   "text-rose-700",
    dot:    "bg-rose-500",
    bar:    "bg-rose-500",
    active: "bg-rose-500 border-rose-500",
  },
};

// ─── Dropdown filter dot (includes "All") ─────────────────

export const DIFF_DOT: Record<string, string> = {
  All:    "bg-slate-400",
  Easy:   DIFFICULTY_STYLES.Easy.dot,
  Medium: DIFFICULTY_STYLES.Medium.dot,
  Hard:   DIFFICULTY_STYLES.Hard.dot,
};

// ─── Subject icon map ─────────────────────────────────────

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  Mathematics: Calculator,
  Science:     FlaskConical,
  History:     Landmark,
  English:     BookOpen,
  Geography:   Globe,
  Programming: Code2,
  // fallback:  HelpCircle (use ?? HelpCircle at call site)
};

export { HelpCircle as SubjectIconFallback };

// Single source of truth for the list of selectable subjects — derived from
// SUBJECT_ICONS so adding/removing a subject only requires editing one place.
export const SUBJECTS = Object.keys(SUBJECT_ICONS);

// ─── Type-safe lookup helper ──────────────────────────────

/**
 * Safely look up DIFFICULTY_STYLES from a raw string value
 * (e.g. from URL params or navigation state).
 * Falls back to "Easy" if the value is not a valid Difficulty key.
 *
 * @example
 *   const diff = getDifficultyStyle(difficulty); // no cast needed
 */
export function getDifficultyStyle(raw: string | undefined | null) {
  const key = (raw ? capitalize(raw) : "") as Difficulty;
  return DIFFICULTY_STYLES[key] ?? DIFFICULTY_STYLES.Easy;
}
