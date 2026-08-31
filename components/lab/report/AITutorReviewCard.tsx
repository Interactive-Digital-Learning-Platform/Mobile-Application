import { useState } from "react";
import { Text, View } from "react-native";
import { GraduationCap, Lightbulb, Sparkles, ThumbsUp, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { AITutorHighlights } from "@/types/lab";
import { Disclosure, SectionHeading } from "./primitives";

const firstSentence = (s: string) => (s.match(/[^.!?]+[.!?]?/)?.[0] ?? s).trim();

function HighlightRow({
  icon: Icon,
  iconColor,
  label,
  text,
}: {
  icon: typeof ThumbsUp;
  iconColor: string;
  label: string;
  text: string;
}) {
  return (
    <View className="flex-row items-start gap-2.5 mt-2.5">
      <View className="w-6 h-6 rounded-full bg-slate-50 items-center justify-center mt-0.5">
        <Icon size={13} color={iconColor} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold text-slate-400">{label}</Text>
        <Text className="text-[12.5px] text-slate-700 leading-5 mt-0.5" numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

// AI review as a tutor card, not a wall of text (spec §7). Default = the 3 one-line highlights;
// the full paragraph is one tap away. All prose is backend-generated (aiFeedback).
export default function AITutorReviewCard({
  highlights,
  summarySentences,
  fullReview,
}: {
  highlights: AITutorHighlights;
  summarySentences: string[];
  fullReview: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasHighlights = !!(highlights.wentWell || highlights.struggled || highlights.nextStep);
  const shortSummary = summarySentences.slice(0, 2).join(" ") || fullReview;
  const hasMore = fullReview.trim().length > shortSummary.trim().length;

  return (
    <View>
      <SectionHeading title="Coach's Take" icon={Sparkles} iconColor={ICON_COLORS.primary500} />
      <View className="rounded-2xl bg-white border border-slate-100 p-4">
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
            <GraduationCap size={18} color={ICON_COLORS.primary500} strokeWidth={2.2} />
          </View>
          <View>
            <Text className="text-[13px] font-black text-slate-800">Your AI Lab Coach</Text>
            <Text className="text-[11px] text-slate-400">Based on your actions this practical</Text>
          </View>
        </View>

        {hasHighlights ? (
          <View className="mt-1">
            {highlights.wentWell && (
              <HighlightRow
                icon={ThumbsUp}
                iconColor={ICON_COLORS.emerald600}
                label="What went well"
                text={firstSentence(highlights.wentWell)}
              />
            )}
            {highlights.struggled && (
              <HighlightRow
                icon={TriangleAlert}
                iconColor={ICON_COLORS.rose600}
                label="Where you struggled"
                text={firstSentence(highlights.struggled)}
              />
            )}
            {highlights.nextStep && (
              <HighlightRow
                icon={Lightbulb}
                iconColor={ICON_COLORS.amber600}
                label="What to do next"
                text={firstSentence(highlights.nextStep)}
              />
            )}
          </View>
        ) : (
          <Text className="text-[13px] text-slate-700 leading-5 mt-3">{shortSummary}</Text>
        )}

        {hasMore && (
          <View className="mt-2 pt-2.5 border-t border-slate-100">
            <Disclosure
              open={expanded}
              onToggle={() => setExpanded((v) => !v)}
              label="Read full review"
              openLabel="Hide full review"
            >
              <Text className="text-[13px] text-slate-700 leading-5 mt-1">{fullReview}</Text>
            </Disclosure>
          </View>
        )}
      </View>
    </View>
  );
}
