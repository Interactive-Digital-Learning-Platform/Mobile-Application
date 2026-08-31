import { Text, View } from "react-native";
import { ArrowRight, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChallengeInsight } from "@/types/lab";
import { EvidenceChip, SectionHeading } from "./primitives";

// The single consolidated "this is where it was hard" card (spec §6). The same facts are NOT
// repeated in the AI review or the Improve tab — those reference it, they don't restate it.
export default function ChallengeInsightCard({ insight }: { insight: ChallengeInsight }) {
  return (
    <View>
      <SectionHeading title="Challenge Insight" icon={TriangleAlert} iconColor={ICON_COLORS.rose600} />
      <View
        className="rounded-2xl bg-white border border-slate-100 p-4"
        style={{ borderLeftWidth: 3, borderLeftColor: ICON_COLORS.rose500 }}
      >
        <Text className="text-[13px] font-bold text-slate-800">
          Step {insight.stepId} · {insight.stepTitle}
        </Text>
        <Text className="text-[12px] text-slate-600 leading-5 mt-1.5">{insight.why}</Text>

        <View className="flex-row flex-wrap gap-1.5 mt-3">
          {insight.evidence.map((e) => (
            <EvidenceChip key={e} label={e} tone="warning" />
          ))}
        </View>

        <View className="flex-row items-start gap-2 mt-3 pt-3 border-t border-slate-100">
          <ArrowRight size={14} color={ICON_COLORS.emerald600} strokeWidth={2.6} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12px] font-semibold text-slate-700 leading-5">{insight.nextAction}</Text>
        </View>
      </View>
    </View>
  );
}
