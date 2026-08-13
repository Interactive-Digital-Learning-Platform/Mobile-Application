import {
  Calculator, FlaskConical, Landmark, BookOpen,
  Globe, Code2, HelpCircle,
  type LucideIcon,
} from "lucide-react-native";
import { capitalize } from "@/constants/quizHelpers";

// "Mixed" = a challenge-zone session spanning more than one tier, not an unknown fallback.
export type Difficulty = "Easy" | "Medium" | "Hard" | "Mixed";

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
  Mixed: {
    bg:     "bg-violet-100",
    text:   "text-violet-700",
    dot:    "bg-violet-500",
    bar:    "bg-violet-500",
    active: "bg-violet-500 border-violet-500",
  },
};

export const DIFF_DOT: Record<string, string> = {
  All:    "bg-slate-400",
  Easy:   DIFFICULTY_STYLES.Easy.dot,
  Medium: DIFFICULTY_STYLES.Medium.dot,
  Hard:   DIFFICULTY_STYLES.Hard.dot,
};

// Raw hex for icon `color`/`stroke`/`fill` props, which NativeWind can't style.
// Keep in sync with the primary-* scale in tailwind.config.js.
export const ICON_COLORS = {
  primary50:  "#FFF3EC",
  primary100: "#FFE4CF",
  primary200: "#FFCCA8",
  primary300: "#FFA87A",
  primary400: "#FF8C50",
  primary500: "#FC6E20",
  primary600: "#E55B10",
  primary700: "#CC4D08",
  primary800: "#A33C06",
  white:      "#ffffff",
  slate400:   "#94a3b8",
  slate500:   "#64748b",
  slate600:   "#475569",
  slate800:   "#1e293b",
  emerald500: "#10b981",
  emerald600: "#059669",
  rose500:    "#f43f5e",
  rose600:    "#e11d48",
  amber500:   "#f59e0b",
  amber600:   "#d97706",
  blue500:    "#3b82f6",
  blue600:    "#2563eb",
  violet100:  "#ede9fe",
  violet600:  "#7c3aed",
} as const;

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  Mathematics: Calculator,
  Science:     FlaskConical,
  History:     Landmark,
  English:     BookOpen,
  Geography:   Globe,
  Programming: Code2,
};

export { HelpCircle as SubjectIconFallback };

export const SUBJECTS = Object.keys(SUBJECT_ICONS);

export function getDifficultyStyle(raw: string | undefined | null) {
  const key = (raw ? capitalize(raw) : "") as Difficulty;
  return DIFFICULTY_STYLES[key] ?? DIFFICULTY_STYLES.Easy;
}
