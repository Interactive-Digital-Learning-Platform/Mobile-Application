import { useState } from "react";
import { Text, View } from "react-native";
import { Brain, Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LabReportType } from "@/types/lab";
import { ConfidenceMeter, Disclosure, EvidenceChip, SectionHeading } from "./primitives";

// "What We Noticed" — the model-inferred misconception insight (treatment-arm sessions only).
// Default view is a scan line (title + confidence bar + two stat chips); the explanation and the
// fix are one tap away, one item open at a time.
export default function MisconceptionInsightCard({
  insight,
}: {
  insight: NonNullable<LabReportType["misconceptionInsight"]>;
}) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  if (!insight || insight.items.length === 0) return null;

  return (
    <View>
      <SectionHeading title="What We Noticed" icon={Brain} iconColor={ICON_COLORS.violet600} />
      <View className="rounded-2xl bg-white border border-slate-100 p-4">
        {insight.items.map((m, i) => {
          const pct = Math.round(m.probability * 100);
          const open = openCode === m.code;
          return (
            <View key={m.code} className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}>
              <Text className="text-[13px] font-bold text-slate-800">{m.title || m.code}</Text>

              <View className="mt-2">
                <ConfidenceMeter pct={pct} />
              </View>

              <View className="flex-row flex-wrap gap-1.5 mt-2">
                <EvidenceChip label={`Seen ${m.signalCount}×`} />
                {m.firstSeenStep != null && <EvidenceChip label={`from step ${m.firstSeenStep}`} />}
              </View>

              {(!!m.description || !!m.correctionStrategy) && (
                <Disclosure
                  open={open}
                  onToggle={() => setOpenCode(open ? null : m.code)}
                  label="Why this matters"
                >
                  {!!m.description && (
                    <Text className="text-[12px] text-slate-600 leading-5 mt-1">{m.description}</Text>
                  )}
                  {!!m.correctionStrategy && (
                    <View className="flex-row items-start gap-1.5 mt-2 bg-violet-50 rounded-lg p-2">
                      <Lightbulb size={12} color={ICON_COLORS.violet600} style={{ marginTop: 1 }} />
                      <Text className="flex-1 text-[11px] text-violet-800 leading-4">{m.correctionStrategy}</Text>
                    </View>
                  )}
                </Disclosure>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
