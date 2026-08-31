import { Text, View } from "react-native";
import { MISSION_META } from "@/constants/lab/report.constants";
import { LearningMission } from "@/types/lab";

// One actionable mission (spec §9). No "Review/Learn" button — the app has no lesson destination
// to route to; the Improve tab's Generate Note action is the concrete next step.
export default function LearningMissionCard({ mission }: { mission: LearningMission }) {
  const meta = MISSION_META[mission.category];
  const Icon = meta.icon;

  return (
    <View className={`rounded-2xl border border-slate-100 p-3.5 ${meta.tint}`}>
      <View className="flex-row items-center gap-2">
        <Icon size={15} color={meta.iconColor} strokeWidth={2.4} />
        <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{meta.label}</Text>
      </View>
      <Text className="text-[13px] font-bold text-slate-800 mt-1.5">{mission.title}</Text>
      <Text className="text-[12px] text-slate-600 leading-5 mt-1">{mission.body}</Text>
      {mission.relatedStepId != null && (
        <Text className="text-[11px] font-semibold text-slate-400 mt-2">Related step: {mission.relatedStepId}</Text>
      )}
    </View>
  );
}
