import { Text, View } from "react-native";
import { Brain, Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LabReportType } from "@/types/lab";
import { SectionHeading } from "./primitives";

// "What We Noticed" — the model-inferred misconception insight (treatment-arm sessions only).
// Preserved from the original report; only the framing is lighter. Probabilities are backend
// values, shown as a bar + percent.
export default function MisconceptionInsightCard({
  insight,
}: {
  insight: NonNullable<LabReportType["misconceptionInsight"]>;
}) {
  if (!insight || insight.items.length === 0) return null;

  return (
    <View>
      <SectionHeading title="What We Noticed" icon={Brain} iconColor={ICON_COLORS.violet600} />
      <View className="rounded-2xl bg-white border border-slate-100 p-4">
        <Text className="text-[11px] text-slate-400 leading-4 mb-2">
          From how you used the equipment, these ideas may need another look.
        </Text>
        {insight.items.map((m, i) => {
          const pct = Math.round(m.probability * 100);
          return (
            <View key={m.code} className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}>
              <View className="flex-row items-center gap-2">
                <Text className="text-[13px] font-bold text-slate-800 flex-1">{m.title || m.code}</Text>
                <Text className="text-[11px] font-bold text-violet-600">{pct}%</Text>
              </View>
              <View className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                <View className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
              </View>
              {!!m.description && (
                <Text className="text-[12px] text-slate-600 leading-5 mt-1.5">{m.description}</Text>
              )}
              <Text className="text-[11px] text-slate-400 mt-1">
                Noticed {m.signalCount} time{m.signalCount === 1 ? "" : "s"}
                {m.firstSeenStep != null ? ` · first at step ${m.firstSeenStep}` : ""}
              </Text>
              {!!m.correctionStrategy && (
                <View className="flex-row items-start gap-1.5 mt-2 bg-violet-50 rounded-lg p-2">
                  <Lightbulb size={12} color={ICON_COLORS.violet600} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-[11px] text-violet-800 leading-4">{m.correctionStrategy}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
