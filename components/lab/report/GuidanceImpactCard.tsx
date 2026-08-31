import { Text, View } from "react-native";
import { Eye, Gauge, Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { INFO_COPY } from "@/constants/lab/report.constants";
import { ReportInsights } from "@/types/lab";
import { SectionHeading, InfoHint } from "./primitives";

// Visual guidance breakdown + a single score-impact banner (spec §5). Four simple values — no
// chart. Per-line deduction isn't shown because the backend only splits it hint-vs-help.
export default function GuidanceImpactCard({ guidance }: { guidance: NonNullable<ReportInsights["guidance"]> }) {
  const maxCount = Math.max(1, ...guidance.lines.map((l) => l.count));

  return (
    <View>
      <SectionHeading
        title="Guidance Used"
        icon={Gauge}
        iconColor={ICON_COLORS.violet600}
        right={<InfoHint title="How guidance affects your score" body={INFO_COPY.guidance} />}
      />

      <View className="rounded-2xl bg-white border border-slate-100 p-4">
        {guidance.lines.map((line) => {
          const Icon = line.answerReveal ? Eye : Lightbulb;
          const color = line.answerReveal ? ICON_COLORS.rose600 : ICON_COLORS.amber600;
          const dim = line.count === 0;
          return (
            <View key={line.key} className={`flex-row items-center gap-3 py-2 ${dim ? "opacity-40" : ""}`}>
              <Icon size={15} color={color} strokeWidth={2.4} />
              <Text className="text-[12px] font-semibold text-slate-700 w-24">{line.label}</Text>
              <View className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <View
                  className={`h-full rounded-full ${line.answerReveal ? "bg-rose-400" : "bg-amber-400"}`}
                  style={{ width: `${(line.count / maxCount) * 100}%` }}
                />
              </View>
              <Text className="text-[12px] font-bold text-slate-600 w-14 text-right">
                {line.count}×
              </Text>
            </View>
          );
        })}

        <View className="mt-2 pt-2.5 border-t border-slate-100 gap-1">
          {guidance.hintDeduction > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-slate-500">Hints</Text>
              <Text className="text-[11px] font-semibold text-slate-600">−{guidance.hintDeduction} marks</Text>
            </View>
          )}
          {guidance.helpDeduction > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-slate-500">Answer revealed</Text>
              <Text className="text-[11px] font-semibold text-slate-600">−{guidance.helpDeduction} marks</Text>
            </View>
          )}
        </View>
      </View>

      {guidance.totalDeduction > 0 && (
        <View className="mt-2 flex-row items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3">
          <Gauge size={16} color={ICON_COLORS.violet600} strokeWidth={2.4} />
          <Text className="text-[13px] font-bold text-violet-800">
            Guidance impact: −{guidance.totalDeduction} marks
          </Text>
        </View>
      )}
    </View>
  );
}
