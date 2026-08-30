import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, CheckCircle2, ChevronLeft, Lightbulb, Sparkles, Target, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useLabNoteContext } from "@/hooks/lab/use-lab-session";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// NOTES feature — "revision note from a completed practical".
//
// The Lab feature hands over only the sessionId (see the CTA in the lab report). This screen,
// owned by Notes, fetches the normalized LabNoteContext from the backend and presents it as a
// personalized revision note. The personalized prose (summary, strengths, struggle analysis,
// recommendations) was already generated at practical completion — this screen re-frames it for
// revision; it does NOT call any generation model.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const fmtDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  return m === 0 ? `${s}s` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{title}</Text>
      <View className="rounded-2xl bg-white border border-slate-100 p-3.5">{children}</View>
    </View>
  );
}

function Bullets({ items, icon }: { items: string[]; icon?: "check" | "target" | "bulb" }) {
  return (
    <>
      {items.map((t, i) => (
        <View key={i} className={`flex-row items-start gap-2 ${i > 0 ? "mt-1.5" : ""}`}>
          {icon === "check" && <CheckCircle2 size={14} color={ICON_COLORS.emerald600} style={{ marginTop: 2 }} />}
          {icon === "target" && <Target size={13} color={ICON_COLORS.violet600} style={{ marginTop: 2.5 }} />}
          {icon === "bulb" && <Lightbulb size={14} color={ICON_COLORS.amber600} style={{ marginTop: 2 }} />}
          {!icon && <Text className="text-slate-400 mt-0.5">•</Text>}
          <Text className="flex-1 text-[13px] text-slate-700 leading-5">{t}</Text>
        </View>
      ))}
    </>
  );
}

export default function NoteFromPractical() {
  const { sessionId, experimentName } = useLocalSearchParams<{
    sessionId: string;
    experimentName?: string;
    experimentId?: string;
  }>();
  const { data: ctx, isLoading, isError, refetch } = useLabNoteContext(sessionId);

  const title = experimentName || ctx?.experimentName || "Practical";

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8" edges={["top", "bottom"]}>
        <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t build your note</Text>
        <TouchableOpacity className="mt-4 bg-primary px-6 py-3 rounded-xl" activeOpacity={0.85} onPress={() => refetch()}>
          <Text className="text-white text-sm font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (isLoading || !ctx) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  const focusArea = ctx.conceptsToImprove[0] || (ctx.misconceptions[0]?.description ?? null);
  const strongestArea = ctx.strengths[0] ?? null;
  const reviewList = [
    ...ctx.recommendations,
    ...ctx.misconceptions.map((m) => m.correctionStrategy).filter(Boolean),
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">Revision Note</Text>
          <Text className="text-base font-black text-slate-800" numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
          <View className="flex-row items-center gap-2">
            <Sparkles size={15} color={ICON_COLORS.primary500} />
            <Text className="text-[13px] font-bold text-slate-800">Personalized to your attempt</Text>
          </View>
          <Text className="text-[12px] text-slate-500 mt-1">
            Final score {ctx.finalScore} · {ctx.subject ? `${ctx.subject} · ` : ""}active time {fmtDuration(ctx.totalActiveTimeSeconds)}
          </Text>
          {!!ctx.summary && <Text className="text-[13px] text-slate-700 leading-5 mt-2.5">{ctx.summary}</Text>}
        </View>

        {!!strongestArea && (
          <Block title="Your Strongest Area">
            <Bullets items={ctx.strengths.slice(0, 3)} icon="check" />
          </Block>
        )}

        {!!focusArea && (
          <Block title="Focus Area">
            <Text className="text-[13px] text-slate-700 leading-5">{focusArea}</Text>
          </Block>
        )}

        {ctx.mostStruggledSteps.length > 0 && (
          <Block title="You Struggled Most With">
            {ctx.mostStruggledSteps.map((s, i) => (
              <View key={s.stepId} className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}>
                <View className="flex-row items-center gap-2">
                  <TriangleAlert size={14} color={ICON_COLORS.rose500} strokeWidth={2.5} />
                  <Text className="text-[13px] font-bold text-slate-800 flex-1">
                    Step {s.stepId} — {s.title}
                  </Text>
                </View>
                {!!ctx.struggleAnalysis[i] && (
                  <Text className="text-[12px] text-slate-700 leading-5 mt-1 ml-6">{ctx.struggleAnalysis[i]}</Text>
                )}
                {s.reasons.map((r, j) => (
                  <Text key={j} className="text-[11px] text-slate-400 leading-4 mt-0.5 ml-6">
                    • {r}
                  </Text>
                ))}
              </View>
            ))}
          </Block>
        )}

        {reviewList.length > 0 && (
          <Block title="Review Before Your Next Attempt">
            <Bullets items={reviewList} icon="bulb" />
          </Block>
        )}

        {ctx.conceptsToImprove.length > 0 && (
          <Block title="Concepts to Revise">
            <Bullets items={ctx.conceptsToImprove} icon="target" />
          </Block>
        )}

        {ctx.curriculumReference && (
          <Block title="From Your Textbook">
            <View className="flex-row items-start gap-2">
              <BookOpen size={15} color={ICON_COLORS.primary500} style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-slate-800">
                  {ctx.curriculumReference.lessonTitle}
                  {ctx.curriculumReference.sectionTitle ? ` — ${ctx.curriculumReference.sectionTitle}` : ""}
                </Text>
                <Text className="text-[12px] text-slate-500 mt-0.5">{ctx.curriculumReference.displayText}</Text>
              </View>
            </View>
          </Block>
        )}

        <Text className="text-[11px] text-slate-400 text-center mt-5 leading-4">
          This note is generated from your practical and stays available from your practical history.
        </Text>
      </ScrollView>

      <View className="px-4 pt-3 pb-2 bg-slate-50">
        <TouchableOpacity
          className="py-3.5 rounded-xl items-center bg-primary"
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Text className="text-white text-[15px] font-bold">Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
