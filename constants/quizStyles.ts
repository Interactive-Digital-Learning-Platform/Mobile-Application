import {
  Calculator, FlaskConical, Landmark, BookOpen,
  Globe, Code2, HelpCircle,
  type LucideIcon,
} from "lucide-react-native";
import { capitalize } from "@/constants/quizHelpers";

export type Difficulty = "Easy" | "Medium" | "Hard";

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

export const DIFF_DOT: Record<string, string> = {
  All:    "bg-slate-400",
  Easy:   DIFFICULTY_STYLES.Easy.dot,
  Medium: DIFFICULTY_STYLES.Medium.dot,
  Hard:   DIFFICULTY_STYLES.Hard.dot,
};

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
