import { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from "react-native";
import { scaleForAuthor, Text } from "@/components/ui/AppText";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { CalendarDays } from "lucide-react-native";
import { useDailyAnalyticsQuery } from "@/hooks/use-quiz";
import type { DailyActivityPoint } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

// primary-500 is under 3:1 on white, so bars use primary-600 (same as AccuracyLineChart).
const BAR_COLOR = ICON_COLORS.primary600;
const SELECTED_COLOR = ICON_COLORS.primary800;
const GRID_COLOR = "#e2e8f0"; // slate-200
const REST_DAY_COLOR = "#cbd5e1"; // slate-300
const AXIS_TEXT_COLOR = ICON_COLORS.slate400;

const WINDOW_DAYS = 7;
const PAD = { top: 18, right: 8, bottom: 20, left: 30 };
const CHART_HEIGHT = 170;
const MAX_BAR_WIDTH = 24;
const Y_TICKS = [0, 50, 100];

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return parseDay(iso).toLocaleDateString("en-US", opts);
}

// Column with a 4px rounded data-end and a square base, as a single path.
function barPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${base} Z`;
}

function ScorePart({ value, label, detail }: { value: number; label: string; detail: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-slate-800 font-black text-[15px]">{Math.round(value)}</Text>
      <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">{label}</Text>
      <Text className="text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>{detail}</Text>
    </View>
  );
}

function DayBreakdown({ day }: { day: DailyActivityPoint }) {
  if (day.progress_score === null) {
    return (
      <View className="items-center py-3">
        <Text className="text-slate-400 text-xs">
          {formatDay(day.date, { weekday: "long", month: "short", day: "numeric" })} · Rest day
        </Text>
      </View>
    );
  }
  const usual = day.baseline_accuracy === null ? "first day" : `usual ${Math.round(day.baseline_accuracy)}%`;
  return (
    <View className="mt-1">
      <View className="flex-row items-baseline justify-between mb-2.5 px-0.5">
        <Text className="text-[11px] text-slate-500">
          {formatDay(day.date, { weekday: "short", month: "short", day: "numeric" })}
        </Text>
        <Text className="text-[11px] text-slate-400">
          Score <Text className="text-slate-800 font-black text-[13px]">{Math.round(day.progress_score)}</Text>
        </Text>
      </View>
      <View className="flex-row bg-slate-50 rounded-xl py-2.5">
        <ScorePart value={day.score_accuracy ?? 0} label="Accuracy" detail={`${day.correct_answers}/${day.questions_answered} correct`} />
        <ScorePart value={day.score_improvement ?? 0} label="Improvement" detail={usual} />
        <ScorePart value={day.score_effort ?? 0} label="Effort" detail={`${day.questions_answered} questions`} />
      </View>
    </View>
  );
}

function ProgressBars({ daily }: { daily: DailyActivityPoint[] }) {
  const [width, setWidth] = useState(0);
  const lastScored = daily.reduce((last, d, i) => (d.progress_score !== null ? i : last), daily.length - 1);
  const [selected, setSelected] = useState(lastScored);
  const n = daily.length;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / n;
  const barW = Math.min(MAX_BAR_WIDTH, slot * 0.6);
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (score: number) => PAD.top + (1 - Math.min(Math.max(score, 0), 100) / 100) * plotH;
  const base = PAD.top + plotH;

  const pick = (e: GestureResponderEvent) => {
    if (plotW <= 0) return;
    const idx = Math.floor((e.nativeEvent.locationX - PAD.left) / slot);
    setSelected(Math.min(n - 1, Math.max(0, idx)));
  };

  const scored = daily.filter((d) => d.progress_score !== null);
  const summary = `Daily progress scores for the last ${n} days: ` +
    scored.map((d) => `${formatDay(d.date, { weekday: "long" })} ${Math.round(d.progress_score!)}`).join(", ") + ".";

  return (
    <View>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderTerminationRequest={() => true}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={{ height: CHART_HEIGHT }}
      >
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {Y_TICKS.map((tick) => (
              <G key={tick}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} stroke={GRID_COLOR} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(tick) + 3} fontSize={scaleForAuthor(9)} fontFamily="Author-Regular" fill={AXIS_TEXT_COLOR} textAnchor="end">{`${tick}`}</SvgText>
              </G>
            ))}

            {daily.map((d, i) => {
              const isSelected = i === selected;
              if (d.progress_score === null) {
                // Rest day: a small marker on the baseline instead of a bar (no score is not a score of 0).
                return <Circle key={d.date} cx={cx(i)} cy={base - 3} r={2.5} fill={REST_DAY_COLOR} />;
              }
              return (
                <G key={d.date}>
                  <Path
                    d={barPath(cx(i) - barW / 2, barW, y(d.progress_score), base)}
                    fill={isSelected ? SELECTED_COLOR : BAR_COLOR}
                  />
                  {isSelected && (
                    <SvgText
                      x={cx(i)} y={y(d.progress_score) - 5} fontSize={scaleForAuthor(10)} fontFamily="Author-Bold"
                      fill={ICON_COLORS.slate800} textAnchor="middle"
                    >
                      {`${Math.round(d.progress_score)}`}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {daily.map((d, i) => (
              <SvgText
                key={`x-${d.date}`} x={cx(i)} y={CHART_HEIGHT - 4} fontSize={scaleForAuthor(9)}
                fill={i === selected ? ICON_COLORS.slate800 : AXIS_TEXT_COLOR}
                fontFamily={i === selected ? "Author-Bold" : "Author-Regular"} textAnchor="middle"
              >
                {formatDay(d.date, { weekday: "narrow" })}
              </SvgText>
            ))}

            {/* Transparent full-size rect so touches anywhere over the plot reach the responder. */}
            <Rect x={0} y={0} width={width} height={CHART_HEIGHT} fill="transparent" />
          </Svg>
        )}
      </View>

      <DayBreakdown day={daily[selected]} />
    </View>
  );
}

export default function DailyActivitySection() {
  const { data, isLoading, refetch } = useDailyAnalyticsQuery(WINDOW_DAYS);

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader
        icon={CalendarDays}
        label="Daily Progress"
        right={<Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Last 7 days</Text>}
      />

      {isLoading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
        </View>
      ) : !data ? (
        <View className="items-center py-8">
          <Text className="text-slate-400 text-xs text-center mb-3">Couldn&apos;t load your daily progress.</Text>
          <TouchableOpacity onPress={() => refetch()} className="px-4 py-2 rounded-full bg-primary-100">
            <Text className="text-primary-700 text-xs font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data.weekly_progress_score === null ? (
        <EmptyState icon={CalendarDays} message="No quizzes in the last 7 days — your daily progress will show up here." />
      ) : (
        <View>
          <View className="items-center mb-3">
            <Text className="text-slate-800 font-black text-[32px] leading-[36px]">
              {Math.round(data.weekly_progress_score)}%
            </Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
              Weekly progress score
            </Text>
            <Text className="text-slate-400 text-[10px] mt-0.5">
              Average of {data.active_days} active {data.active_days === 1 ? "day" : "days"} · accuracy, improvement & effort
            </Text>
          </View>

          <ProgressBars daily={data.daily} />
        </View>
      )}
    </View>
  );
}
