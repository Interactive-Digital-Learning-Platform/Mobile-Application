import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { NotebookPen } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Final learning action of the Improve tab (spec §12). The Lab only hands the sessionId to the
// Notes feature — it does not generate the note here. `navigating` guards against double taps
// while the push is in flight.
export default function PersonalizedNoteCard({
  sessionId,
  experimentId,
  experimentName,
}: {
  sessionId: string;
  experimentId: string;
  experimentName: string;
}) {
  const [navigating, setNavigating] = useState(false);

  const go = () => {
    if (navigating) return;
    setNavigating(true);
    router.push({
      pathname: "/(main)/notes/from-practical" as never,
      params: { sessionId, experimentId, experimentName } as never,
    });
    // Re-enable shortly after so a back-navigation leaves the button usable again.
    setTimeout(() => setNavigating(false), 1200);
  };

  return (
    <View className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
          <NotebookPen size={18} color={ICON_COLORS.primary500} strokeWidth={2.2} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-black text-slate-800">Personalized Study Note</Text>
          <Text className="text-[12px] text-slate-500 leading-5 mt-0.5">
            Turn this attempt into a revision note built around what you found easy and hard.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={go}
        disabled={navigating}
        className={`mt-3 flex-row items-center justify-center gap-2 py-3 rounded-xl min-h-[44px] ${navigating ? "bg-primary/60" : "bg-primary"}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: navigating }}
      >
        {navigating ? (
          <>
            <ActivityIndicator size="small" color={ICON_COLORS.white} />
            <Text className="text-white text-[14px] font-bold">Opening…</Text>
          </>
        ) : (
          <>
            <NotebookPen size={16} color={ICON_COLORS.white} strokeWidth={2.5} />
            <Text className="text-white text-[14px] font-bold">Generate Personalized Note</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
