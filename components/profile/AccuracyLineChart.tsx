import { useState } from "react";
import { View, Text, type LayoutChangeEvent, type GestureResponderEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import type { AccuracyHistoryPoint, PerformanceTrend } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";

interface AccuracyLineChartProps {
  history: AccuracyHistoryPoint[];
  // When usable, the newest current_period_sessions points are shaded as "Current" and the
  // previous_period_sessions before them as "Previous" -- the same quizzes the trend numbers above average.
  trend?: PerformanceTrend;
}

// primary-500 is only 2.77:1 on white (below the 3:1 floor for chart marks), so the line uses primary-600.
const LINE_COLOR = ICON_COLORS.primary600;
const CURRENT_REF_COLOR = ICON_COLORS.primary700;
const PREVIOUS_REF_COLOR = ICON_COLORS.slate500;
const GRID_COLOR = "#e2e8f0"; // slate-200
const AXIS_TEXT_COLOR = ICON_COLORS.slate400;
const CURRENT_BAND_COLOR = ICON_COLORS.primary50;
const PREVIOUS_BAND_COLOR = "#f1f5f9"; // slate-100

const MIN_VISIBLE_POINTS = 12;
const CHART_HEIGHT = 168;
const PAD = { top: 22, right: 40, bottom: 20, left: 30 };
const Y_TICKS = [0, 50, 100];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AccuracyLineChart({ history, trend }: AccuracyLineChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const hasPeriods = !!trend && trend.trend !== "insufficient_data";
  const currentCount = hasPeriods ? trend!.current_period_sessions : 0;
  const previousCount = hasPeriods ? trend!.previous_period_sessions : 0;

  // Always keep both trend periods fully in view, plus some lead-in history when there is any.
  const visibleCount = Math.min(history.length, Math.max(MIN_VISIBLE_POINTS, currentCount + previousCount));
  const points = history.slice(-visibleCount);
  const n = points.length;
  if (n < 2) return null;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (accuracy: number) => PAD.top + (1 - Math.min(Math.max(accuracy, 0), 100) / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.accuracy)}`).join(" ");

  // Period bands span from halfway before their first point to halfway after their last, clamped to the plot.
  const step = plotW / (n - 1);
  const band = (firstIdx: number, lastIdx: number) => ({
    x0: Math.max(PAD.left, x(firstIdx) - step / 2),
    x1: Math.min(PAD.left + plotW, x(lastIdx) + step / 2),
  });
  const periods = hasPeriods && currentCount > 0 && previousCount > 0 && currentCount + previousCount <= n
    ? [
        {
          key: "previous", label: "Previous", fill: PREVIOUS_BAND_COLOR, ref: PREVIOUS_REF_COLOR,
          ...band(n - currentCount - previousCount, n - currentCount - 1),
          avg: trend!.previous_period_accuracy,
        },
        {
          key: "current", label: "Current", fill: CURRENT_BAND_COLOR, ref: CURRENT_REF_COLOR,
          ...band(n - currentCount, n - 1),
          avg: trend!.current_period_accuracy,
        },
      ]
    : [];

  const activeIdx = selected ?? n - 1;
  const active = points[activeIdx];
  const last = points[n - 1];

  const pickNearest = (e: GestureResponderEvent) => {
    if (plotW <= 0) return;
    const idx = Math.round(((e.nativeEvent.locationX - PAD.left) / plotW) * (n - 1));
    setSelected(Math.min(n - 1, Math.max(0, idx)));
  };

  const summary =
    `Accuracy over your last ${n} quizzes, from ${Math.round(points[0].accuracy)}% on ${formatDate(points[0].completed_at)} ` +
    `to ${Math.round(last.accuracy)}% on ${formatDate(last.completed_at)}.` +
    (periods.length
      ? ` Previous ${previousCount} quizzes averaged ${Math.round(periods[0].avg)}%, current ${currentCount} averaged ${Math.round(periods[1].avg)}%.`
      : "");

  return (
    <View>
      {/* Readout: defaults to the latest quiz; touching the chart scrubs to the nearest quiz. */}
      <View className="flex-row items-baseline justify-between mb-1 px-0.5">
        <Text className="text-[11px] text-slate-500 flex-1 mr-2" numberOfLines={1}>
          {formatDate(active.completed_at)} · {active.subject}
        </Text>
        <Text className="text-slate-800">
          <Text className="text-[15px] font-black">{Math.round(active.accuracy)}%</Text>
          <Text className="text-[11px] text-slate-400 font-semibold"> ({active.correct}/{active.total})</Text>
        </Text>
      </View>

      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pickNearest}
        onResponderMove={pickNearest}
        onResponderTerminationRequest={() => true}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={{ height: CHART_HEIGHT }}
      >
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {periods.map((p) => (
              <G key={p.key}>
                <Rect x={p.x0} y={PAD.top} width={p.x1 - p.x0} height={plotH} fill={p.fill} />
                <SvgText
                  x={(p.x0 + p.x1) / 2} y={PAD.top - 8} fontSize={9} fontWeight="700"
                  fill={ICON_COLORS.slate500} textAnchor="middle"
                >
                  {`${p.label.toUpperCase()} · ${Math.round(p.avg)}%`}
                </SvgText>
              </G>
            ))}

            {Y_TICKS.map((tick) => (
              <G key={tick}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} stroke={GRID_COLOR} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(tick) + 3} fontSize={9} fill={AXIS_TEXT_COLOR} textAnchor="end">
                  {`${tick}%`}
                </SvgText>
              </G>
            ))}

            {/* Period averages: the exact values behind the Current / Previous numbers above the chart. */}
            {periods.map((p) => (
              <Line
                key={`${p.key}-avg`} x1={p.x0 + 2} x2={p.x1 - 2} y1={y(p.avg)} y2={y(p.avg)}
                stroke={p.ref} strokeWidth={1.5} strokeLinecap="round" opacity={0.7}
              />
            ))}

            {selected !== null && (
              <Line
                x1={x(activeIdx)} x2={x(activeIdx)} y1={PAD.top} y2={PAD.top + plotH}
                stroke={ICON_COLORS.slate400} strokeWidth={1}
              />
            )}

            <Path d={linePath} stroke={LINE_COLOR} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) => (
              <Circle
                key={p.session_id} cx={x(i)} cy={y(p.accuracy)} r={i === activeIdx ? 5.5 : 4}
                fill={LINE_COLOR} stroke={ICON_COLORS.white} strokeWidth={2}
              />
            ))}

            <SvgText
              x={x(n - 1) + 9} y={y(last.accuracy) + 3.5} fontSize={10} fontWeight="800" fill={ICON_COLORS.slate800}
            >
              {`${Math.round(last.accuracy)}%`}
            </SvgText>

            <SvgText x={PAD.left} y={CHART_HEIGHT - 4} fontSize={9} fill={AXIS_TEXT_COLOR} textAnchor="start">
              {formatDate(points[0].completed_at)}
            </SvgText>
            <SvgText x={PAD.left + plotW} y={CHART_HEIGHT - 4} fontSize={9} fill={AXIS_TEXT_COLOR} textAnchor="end">
              {formatDate(last.completed_at)}
            </SvgText>
          </Svg>
        )}
      </View>
    </View>
  );
}
