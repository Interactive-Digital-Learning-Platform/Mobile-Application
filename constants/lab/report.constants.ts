import {
  Brain,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  RotateCcw,
  Target,
  Timer,
  TriangleAlert,
  Trophy,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import {
  JourneyStatusKey,
  LearningMission,
  QuickInsightKey,
  ReportErrorItem,
  ReportTabKey,
  UnderstandingLevelKey,
} from "@/types/lab";

// ── Tabs ─────────────────────────────────────────────────────────────────────────────────────
export const REPORT_TABS: { key: ReportTabKey; label: string }[] = [
  { key: "overview", label: "Highlights" },
  { key: "journey", label: "My Journey" },
  { key: "improve", label: "Level Up" },
];

// ── Lab Journey step visual states ───────────────────────────────────────────────────────────
// Every state carries an icon + word, never colour alone (spec §4 / §14).
export type JourneyStatusStyle = {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  chipBg: string; // tinted pill
  chipText: string;
  dot: string; // timeline node
  line: string; // connector below the node
};

export const JOURNEY_STATUS: Record<JourneyStatusKey, JourneyStatusStyle> = {
  strong: {
    label: "Strong",
    icon: CheckCircle2,
    iconColor: ICON_COLORS.emerald600,
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    dot: "bg-emerald-500",
    line: "bg-emerald-200",
  },
  guided: {
    label: "Guided",
    icon: Lightbulb,
    iconColor: ICON_COLORS.amber600,
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    dot: "bg-amber-500",
    line: "bg-amber-200",
  },
  recovered: {
    label: "Recovered",
    icon: RotateCcw,
    iconColor: ICON_COLORS.primary600,
    chipBg: "bg-primary/10",
    chipText: "text-primary",
    dot: "bg-primary",
    line: "bg-primary/25",
  },
  challenging: {
    label: "Challenging",
    icon: TriangleAlert,
    iconColor: ICON_COLORS.rose600,
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    dot: "bg-rose-500",
    line: "bg-rose-200",
  },
  "review-time": {
    label: "Review Time",
    icon: Clock,
    iconColor: ICON_COLORS.blue600,
    chipBg: "bg-blue-50",
    chipText: "text-blue-700",
    dot: "bg-blue-500",
    line: "bg-blue-200",
  },
};

// ── Understanding meter ─────────────────────────────────────────────────────────────────────
export type UnderstandingStyle = {
  label: string;
  meterFilled: number; // 1–4 segments
  barColor: string;
  chipBg: string;
  chipText: string;
  iconColor: string;
};

export const UNDERSTANDING_LEVELS: Record<UnderstandingLevelKey, UnderstandingStyle> = {
  "needs-support": {
    label: "Needs Support",
    meterFilled: 1,
    barColor: "bg-rose-500",
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    iconColor: ICON_COLORS.rose600,
  },
  developing: {
    label: "Developing",
    meterFilled: 2,
    barColor: "bg-amber-500",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    iconColor: ICON_COLORS.amber600,
  },
  proficient: {
    label: "Proficient",
    meterFilled: 3,
    barColor: "bg-blue-500",
    chipBg: "bg-blue-50",
    chipText: "text-blue-700",
    iconColor: ICON_COLORS.blue600,
  },
  strong: {
    label: "Strong Understanding",
    meterFilled: 4,
    barColor: "bg-emerald-500",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    iconColor: ICON_COLORS.emerald600,
  },
};

// Leading phrase of aiFeedback.finalUnderstandingAssessment (backend aiService.js
// buildFinalUnderstandingAssessment) → our display level. Order matters: first match wins.
export const UNDERSTANDING_PHRASE_MAP: { match: RegExp; level: UnderstandingLevelKey }[] = [
  { match: /^advanced/i, level: "strong" },
  { match: /^(strong|proficient)/i, level: "proficient" },
  { match: /^developing/i, level: "developing" },
  { match: /^(foundational|needs)/i, level: "needs-support" },
];

// ── Score band → hero treatment ─────────────────────────────────────────────────────────────
export const SCORE_BAND_STYLE: Record<
  "high" | "mid" | "low",
  { ring: string; ringTrack: string; scoreText: string; badgeBg: string; badgeText: string; celebrate: boolean }
> = {
  high: {
    ring: ICON_COLORS.emerald500,
    ringTrack: "#D1FAE5",
    scoreText: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    celebrate: true,
  },
  mid: {
    ring: ICON_COLORS.amber500,
    ringTrack: "#FEF3C7",
    scoreText: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    celebrate: false,
  },
  low: {
    ring: ICON_COLORS.rose500,
    ringTrack: "#FFE4E6",
    scoreText: "text-rose-600",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    celebrate: false,
  },
};

// Short performance message keyed off the real final score. Kept generic-per-band on purpose —
// the specific, behaviour-aware line is aiFeedback.summary, shown by the AI Tutor card.
export const PERFORMANCE_MESSAGE: Record<"high" | "mid" | "low", string> = {
  high: "Excellent performance",
  mid: "Solid attempt with room to grow",
  low: "Keep practising — you're building the method",
};

// ── Quick insight cards ─────────────────────────────────────────────────────────────────────
export const QUICK_INSIGHT_META: Record<
  QuickInsightKey,
  { icon: LucideIcon; iconColor: string; tint: string }
> = {
  "strongest-step": { icon: Trophy, iconColor: ICON_COLORS.emerald600, tint: "bg-emerald-50" },
  "challenging-step": { icon: TriangleAlert, iconColor: ICON_COLORS.rose600, tint: "bg-rose-50" },
  "total-hints": { icon: Lightbulb, iconColor: ICON_COLORS.amber600, tint: "bg-amber-50" },
  "independent-steps": { icon: TrendingUp, iconColor: ICON_COLORS.blue600, tint: "bg-blue-50" },
  "total-retries": { icon: RotateCcw, iconColor: ICON_COLORS.primary600, tint: "bg-primary/10" },
  "guidance-cost": { icon: Gauge, iconColor: ICON_COLORS.violet600, tint: "bg-violet-50" },
};

// ── Learning missions ───────────────────────────────────────────────────────────────────────
export const MISSION_META: Record<
  LearningMission["category"],
  { label: string; icon: LucideIcon; iconColor: string; tint: string }
> = {
  concept: { label: "Concept to Review", icon: Brain, iconColor: ICON_COLORS.violet600, tint: "bg-violet-50" },
  skill: { label: "Practical Skill to Practise", icon: Target, iconColor: ICON_COLORS.blue600, tint: "bg-blue-50" },
  procedure: {
    label: "Procedure to Improve",
    icon: Wrench,
    iconColor: ICON_COLORS.primary600,
    tint: "bg-primary/10",
  },
  time: { label: "Time-Management Goal", icon: Timer, iconColor: ICON_COLORS.amber600, tint: "bg-amber-50" },
};

// ── Errors Detected ─────────────────────────────────────────────────────────────────────────
export const ERROR_GROUP_META: Record<
  ReportErrorItem["group"],
  { label: string; icon: LucideIcon; iconColor: string; accent: string; tint: string }
> = {
  // `accent` is a raw hex for the left accent border (style prop). The card body stays a light
  // neutral (bg-slate-50) so it never reads as an all-red "punishment" block (spec §10).
  procedural: { label: "Procedural", icon: Wrench, iconColor: ICON_COLORS.primary600, accent: ICON_COLORS.primary500, tint: "bg-slate-50" },
  conceptual: { label: "Conceptual", icon: Brain, iconColor: ICON_COLORS.violet600, accent: ICON_COLORS.violet600, tint: "bg-slate-50" },
  behaviour: { label: "Pace & Habits", icon: Clock, iconColor: ICON_COLORS.amber600, accent: ICON_COLORS.amber500, tint: "bg-slate-50" },
};

// Static, supportive "why it matters" line + a short accordion-header label per procedural
// friendly-message (spec §10: never judgemental). Keyed by a substring of the backend's
// friendlyProceduralMessage output. `label` keeps the collapsed error card to one line.
export const PROCEDURAL_WHY: { match: RegExp; label: string; why: string; action: string }[] = [
  {
    match: /before it was on the bench|before the material it needs/i,
    label: "Acted before the setup was ready",
    why: "Each step builds on the setup from the one before it.",
    action: "Check the bench has everything the step names before you act.",
  },
  {
    match: /transfer tool/i,
    label: "Skipped the transfer tool",
    why: "The transfer tool controls how much is added and keeps the measurement fair.",
    action: "Use the dropper, pipette or burette the step asks for next time.",
  },
  {
    match: /don't produce the change|wrong action|out of order/i,
    label: "Combined the wrong materials",
    why: "The expected observation only appears when the right things are combined.",
    action: "Re-read the step and match each material to what it asks for.",
  },
  {
    match: /very quickly|read in full/i,
    label: "Moved through steps too fast",
    why: "Rushing a step is the most common cause of a missed observation.",
    action: "Pause and read each instruction fully before your next attempt.",
  },
];

export const PROCEDURAL_WHY_FALLBACK = {
  label: "Step done differently than asked",
  why: "Small procedure slips add up across an experiment.",
  action: "Review this step and try it again more slowly.",
};

// ── Time breakdown pace thresholds ──────────────────────────────────────────────────────────
// Mirrors reportAnalyticsService's "gentle" time gate (ratio <= 1.5 is not slow).
export const PACE_THRESHOLDS = { fast: 0.6, slow: 1.5 } as const;

export const PACE_META: Record<"fast" | "balanced" | "slow", { label: string; chipBg: string; chipText: string }> = {
  fast: { label: "Fast", chipBg: "bg-blue-50", chipText: "text-blue-700" },
  balanced: { label: "Balanced", chipBg: "bg-emerald-50", chipText: "text-emerald-700" },
  slow: { label: "Slow", chipBg: "bg-amber-50", chipText: "text-amber-700" },
};

// ── Info tooltip copy (spec §1 / §5 — explanation goes behind an (i), never permanent body) ──
export const INFO_COPY = {
  finalScore:
    "Final score combines procedural performance (90%) and time efficiency (10%). When a practical has no expected duration set, it is performance only.",
  guidance:
    "Hints and revealing the answer each remove a few marks. The more help a task needed, the larger the deduction — this is the total across the practical.",
  understanding:
    "A qualitative read of how well the underlying concepts were applied — separate from the score, which only measures step correctness.",
} as const;
