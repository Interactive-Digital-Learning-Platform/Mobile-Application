import { useState } from "react";
import { Text, View } from "react-native";
import { Clock } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { PACE_META } from "@/constants/lab/report.constants";
import { LabReportType, TimeBreakdownRow } from "@/types/lab";
import { fmtDuration } from "@/utils/lab/report";
import { AccordionRow } from "./primitives";

// Collapsed by default (spec §11). Bars are relative to the slowest step; a Fast/Balanced/Slow
// label only appears when the backend actually has an expected duration for that step.
export default function TimeBreakdownChart({
  rows,
  report,
}: {
  rows: TimeBreakdownRow[];
  report: LabReportType;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <AccordionRow
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <View className="flex-row items-center gap-2">
          <Clock size={15} color={ICON_COLORS.slate500} strokeWidth={2.4} />
          <Text className="text-[13px] font-bold text-slate-800">Time Breakdown</Text>
          <Text className="text-[11px] text-slate-400">· {fmtDuration(report.totalActiveTime ?? 0)} active</Text>
        </View>
      }
    >
      <View className="gap-2.5 mt-1">
        {rows.map((row) => {
          const pace = row.pace ? PACE_META[row.pace] : null;
          return (
            <View key={row.stepId}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[12px] text-slate-600 flex-1 pr-2" numberOfLines={1}>
                  {row.stepId}. {row.title}
                </Text>
                <Text className="text-[12px] font-semibold text-slate-700">{fmtDuration(row.timeSpentSeconds)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <View
                    className="h-full rounded-full bg-slate-400"
                    style={{ width: `${Math.max(4, row.ratio * 100)}%` }}
                  />
                </View>
                {pace && (
                  <View className={`rounded-full px-1.5 py-0.5 ${pace.chipBg}`}>
                    <Text className={`text-[9px] font-bold ${pace.chipText}`}>{pace.label}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-3 pt-2.5 border-t border-slate-100 gap-1">
        <View className="flex-row justify-between">
          <Text className="text-[12px] font-bold text-slate-700">Total active time</Text>
          <Text className="text-[12px] font-bold text-slate-800">{fmtDuration(report.totalActiveTime ?? 0)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[11px] text-slate-400">Session time (incl. pauses)</Text>
          <Text className="text-[11px] text-slate-400">{fmtDuration(report.totalTime)}</Text>
        </View>
      </View>

      {rows.every((r) => r.pace === null) && (
        <Text className="text-[10px] text-slate-400 mt-2">
          Pace labels appear when a practical has expected step durations configured.
        </Text>
      )}
    </AccordionRow>
  );
}
