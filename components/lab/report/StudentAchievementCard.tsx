import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Award, CheckCircle2 } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { StudentAchievement } from "@/types/lab";
import { SectionHeading } from "./primitives";

function AchievementChip({ item }: { item: StudentAchievement }) {
  const [open, setOpen] = useState(false);
  const canExpand = !!(item.detail || item.evidence);
  return (
    <Pressable
      onPress={() => canExpand && setOpen((v) => !v)}
      className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 min-h-[44px] flex-1 min-w-[150px]"
      accessibilityRole={canExpand ? "button" : "text"}
      accessibilityState={canExpand ? { expanded: open } : undefined}
    >
      <View className="flex-row items-start gap-2">
        <CheckCircle2 size={14} color={ICON_COLORS.emerald600} strokeWidth={2.6} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] font-bold text-emerald-800 leading-4">{item.title}</Text>
      </View>
      {open && (item.detail || item.evidence) && (
        <Text className="text-[11px] text-emerald-700 leading-4 mt-1.5">{item.detail || item.evidence}</Text>
      )}
      {!open && canExpand && <Text className="text-[10px] font-semibold text-emerald-500 mt-1">Tap for evidence</Text>}
    </Pressable>
  );
}

// "What You Did Well" as achievement chips (spec §8). Only chips the report data supports are
// passed in (see deriveAchievements).
export default function StudentAchievementCard({ achievements }: { achievements: StudentAchievement[] }) {
  if (achievements.length === 0) return null;
  return (
    <View>
      <SectionHeading title="Wins Unlocked" icon={Award} iconColor={ICON_COLORS.emerald600} />
      <View className="flex-row flex-wrap gap-2">
        {achievements.map((a) => (
          <AchievementChip key={a.key} item={a} />
        ))}
      </View>
    </View>
  );
}
