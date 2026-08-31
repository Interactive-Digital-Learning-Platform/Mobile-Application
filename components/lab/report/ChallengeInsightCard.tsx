import { useState } from "react";
import { Text, View } from "react-native";
import { ArrowRight, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChallengeInsight } from "@/types/lab";
import { Disclosure, EvidenceChip, SectionHeading } from "./primitives";

// The single consolidated "this is where it was hard" card (spec §6). Default view is just the
// step + evidence chips + one next action — the "why" prose is one tap away and is NOT restated
// in the AI review or the Improve tab.
export default function ChallengeInsightCard({ insight }: { insight: ChallengeInsight }) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <SectionHeading title="Challenge to Beat" icon={TriangleAlert} iconColor={ICON_COLORS.rose600} />
      <View
        className="rounded-2xl bg-white border border-slate-100 p-4"
        style={{ borderLeftWidth: 3, borderLeftColor: ICON_COLORS.rose500 }}
      >
        <Text className="text-[13px] font-bold text-slate-800">
          Step {insight.stepId} · {insight.stepTitle}
        </Text>

        <View className="flex-row flex-wrap gap-1.5 mt-2.5">
          {insight.evidence.map((e) => (
            <EvidenceChip key={e} label={e} tone="warning" />
          ))}
        </View>

        {!!insight.why && (
          <Disclosure open={open} onToggle={() => setOpen((v) => !v)} label="What made it hard">
            <Text className="text-[12px] text-slate-600 leading-5 mt-1">{insight.why}</Text>
          </Disclosure>
        )}

        <View className="flex-row items-start gap-2 mt-2.5 pt-3 border-t border-slate-100">
          <ArrowRight size={14} color={ICON_COLORS.emerald600} strokeWidth={2.6} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12px] font-semibold text-slate-700 leading-5">{insight.nextAction}</Text>
        </View>
      </View>
    </View>
  );
}
