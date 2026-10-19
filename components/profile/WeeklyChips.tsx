import { View, Text, ScrollView } from "react-native";
import { ClipboardList, ListChecks, Timer, ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react-native";
import { useDailyAnalyticsQuery } from "@/hooks/use-quiz";
import Skeleton from "@/components/Skeleton";
import type { DailyActivityPoint } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";

// "This week vs last week" chips: the 14-day daily series split into the last 7 days and the 7 before them.
const CHIP_WIDTH = 150;

interface WeekTotals {
  quizzes: number;
  questions: number;
  avgTime: number | null;
}

function totals(days: DailyActivityPoint[]): WeekTotals {
  const questions = days.reduce((sum, d) => sum + d.questions_answered, 0);
  // Weighted by questions answered, so a 2-question day doesn't count as much as a 10-question one.
  const timed = days.filter((d) => d.avg_response_time !== null && d.questions_answered > 0);
  const timedQuestions = timed.reduce((sum, d) => sum + d.questions_answered, 0);
  return {
    quizzes: days.reduce((sum, d) => sum + d.quizzes_completed, 0),
    questions,
    avgTime: timedQuestions > 0
      ? timed.reduce((sum, d) => sum + d.avg_response_time! * d.questions_answered, 0) / timedQuestions
      : null,
  };
}

type Direction = "up" | "down" | "same";

interface ChipProps {
  icon: LucideIcon;
  label: string;
  value: string;
  // Change vs last week; null when there's nothing to compare against.
  delta: { direction: Direction; text: string; good: boolean | null } | null;
}

function Chip({ icon: Icon, label, value, delta }: ChipProps) {
  const DeltaIcon = delta?.direction === "up" ? ArrowUp : delta?.direction === "down" ? ArrowDown : Minus;
  const tone = delta?.good === true ? "text-emerald-600" : delta?.good === false ? "text-rose-600" : "text-slate-400";
  const toneColor = delta?.good === true ? ICON_COLORS.emerald600 : delta?.good === false ? ICON_COLORS.rose600 : ICON_COLORS.slate400;

  return (
    <View className="bg-white rounded-[22px] p-4 shadow-sm shadow-black/5" style={{ width: CHIP_WIDTH }}>
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <Icon size={14} color={ICON_COLORS.slate500} strokeWidth={2} />
        <Text className="text-slate-500 text-xs font-semibold">{label}</Text>
      </View>
      <Text className="text-slate-800 font-black text-[26px] leading-[30px]">{value}</Text>
      <View className="flex-row items-center gap-1 mt-1">
        {delta ? (
          <>
            <DeltaIcon size={12} color={toneColor} strokeWidth={2.75} />
            <Text className={`text-[11px] font-bold ${tone}`}>{delta.text}</Text>
            <Text className="text-[11px] text-slate-400">vs last week</Text>
          </>
        ) : (
          <Text className="text-[11px] text-slate-400">No data last week</Text>
        )}
      </View>
    </View>
  );
}

function countDelta(current: number, previous: number): ChipProps["delta"] {
  const diff = current - previous;
  if (diff === 0) return { direction: "same", text: "0", good: null };
  return { direction: diff > 0 ? "up" : "down", text: `${Math.abs(diff)}`, good: diff > 0 };
}

export default function WeeklyChips() {
  const { data, isLoading } = useDailyAnalyticsQuery(14);

  if (isLoading || !data) {
    return (
      <View className="flex-row gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} width={CHIP_WIDTH} height={112} borderRadius={22} color={ICON_COLORS.primary50} />
        ))}
      </View>
    );
  }

  const lastWeek = totals(data.daily.slice(0, 7));
  const thisWeek = totals(data.daily.slice(7));
  const hadLastWeek = lastWeek.quizzes > 0;

  let timeDelta: ChipProps["delta"] = null;
  if (thisWeek.avgTime !== null && lastWeek.avgTime !== null) {
    const diff = thisWeek.avgTime - lastWeek.avgTime;
    timeDelta = Math.abs(diff) < 0.05
      ? { direction: "same", text: "0s", good: null }
      // Lower is better here: answering faster is the improvement.
      : { direction: diff > 0 ? "up" : "down", text: `${Math.abs(diff).toFixed(1)}s`, good: diff < 0 };
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      style={{ marginHorizontal: -16 }}
    >
      <Chip
        icon={ClipboardList} label="Quizzes" value={`${thisWeek.quizzes}`}
        delta={hadLastWeek ? countDelta(thisWeek.quizzes, lastWeek.quizzes) : null}
      />
      <Chip
        icon={ListChecks} label="Questions" value={`${thisWeek.questions}`}
        delta={hadLastWeek ? countDelta(thisWeek.questions, lastWeek.questions) : null}
      />
      <Chip
        icon={Timer} label="Avg time" value={thisWeek.avgTime === null ? "—" : `${thisWeek.avgTime.toFixed(1)}s`}
        delta={timeDelta}
      />
    </ScrollView>
  );
}
