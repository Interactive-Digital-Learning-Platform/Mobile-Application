import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Activity, CheckCircle2, Gauge, Timer } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { INFO_COPY, SCORE_BAND_STYLE, UNDERSTANDING_LEVELS } from "@/constants/lab/report.constants";
import { LabReportType, ReportInsights } from "@/types/lab";
import { fmtDuration } from "@/utils/lab/report";
import ConfettiView from "@/components/quiz-componets/ConfettiView";
import ReportScoreRing from "./ReportScoreRing";
import { InfoHint } from "./primitives";

function MetricTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Gauge;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-slate-50 py-3 px-1">
      <Icon size={16} color={ICON_COLORS.slate500} strokeWidth={2.2} />
      <Text className="text-[15px] font-black text-slate-800 mt-1">{value}</Text>
      <Text className="text-[10px] font-semibold text-slate-400 mt-0.5 text-center">{label}</Text>
    </View>
  );
}

export default function ReportPerformanceHero({
  report,
  insights,
}: {
  report: LabReportType;
  insights: ReportInsights;
}) {
  const band = SCORE_BAND_STYLE[insights.scoreBand];
  const perf = report.performanceScore ?? report.score;
  const timeScore = report.timeScore ?? null;
  const understanding = insights.understanding;

  return (
    <View className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {band.celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiView count={60} />
        </View>
      )}

      <View className="p-5 items-center">
        <View className="flex-row items-center gap-1.5 self-center rounded-full bg-emerald-50 px-3 py-1">
          <CheckCircle2 size={13} color={ICON_COLORS.emerald600} strokeWidth={2.6} />
          <Text className="text-[11px] font-bold text-emerald-700">Practical Completed</Text>
        </View>

        <Text className="text-lg font-black text-slate-900 mt-2.5 text-center">{report.experimentName}</Text>
        <Text className="text-[12px] font-medium text-slate-400 mt-0.5">{report.subject} Practical</Text>

        <Animated.View entering={FadeInDown.duration(260)} className="mt-4">
          <ReportScoreRing
            score={report.score}
            ringColor={band.ring}
            trackColor={band.ringTrack}
            scoreTextClass={band.scoreText}
          />
        </Animated.View>

        <View className="flex-row items-center gap-1.5 mt-3">
          <Text className={`text-[15px] font-black ${band.scoreText}`}>{insights.performanceMessage}</Text>
          <InfoHint title="How the final score works" body={INFO_COPY.finalScore} />
        </View>

        {understanding && (
          <View className={`mt-2 flex-row items-center gap-1.5 rounded-full px-3 py-1 ${UNDERSTANDING_LEVELS[understanding.level].chipBg}`}>
            <Activity
              size={12}
              color={UNDERSTANDING_LEVELS[understanding.level].iconColor}
              strokeWidth={2.6}
            />
            <Text className={`text-[11px] font-bold ${UNDERSTANDING_LEVELS[understanding.level].chipText}`}>
              {understanding.label}
            </Text>
          </View>
        )}

        <View className="flex-row gap-2 mt-4 self-stretch">
          <MetricTile icon={Gauge} value={`${perf}`} label="Performance" />
          <MetricTile icon={Activity} value={timeScore == null ? "—" : `${timeScore}`} label="Time efficiency" />
          <MetricTile icon={Timer} value={fmtDuration(report.totalActiveTime ?? 0)} label="Active time" />
        </View>

        {timeScore == null && (
          <Text className="text-[10px] text-slate-400 mt-2 text-center">
            Time efficiency isn&apos;t measured for this practical — the score is performance only.
          </Text>
        )}
      </View>
    </View>
  );
}
