import { Text, View } from "react-native";
import { MISSION_META } from "@/constants/lab/report.constants";
import { LearningMission } from "@/types/lab";
import { Disclosure, EvidenceChip } from "./primitives";

// One actionable mission (spec §9). Default view is icon + category tag + a short title + the
// related-step chip; the full sentence is one tap away so the list stays scannable.
export default function LearningMissionCard({
  mission,
  open,
  onToggle,
}: {
  mission: LearningMission;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = MISSION_META[mission.category];
  const Icon = meta.icon;
  const bodyDiffersFromTitle = mission.body.trim().replace(/…$/, "") !== mission.title.trim().replace(/…$/, "");

  return (
    <View className={`rounded-2xl border border-slate-100 p-3.5 ${meta.tint}`}>
      <View className="flex-row items-center gap-2">
        <Icon size={15} color={meta.iconColor} strokeWidth={2.4} />
        <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex-1">{meta.label}</Text>
        {mission.relatedStepId != null && <EvidenceChip label={`Step ${mission.relatedStepId}`} />}
      </View>

      <Text className="text-[13px] font-bold text-slate-800 mt-1.5">{mission.title}</Text>

      {bodyDiffersFromTitle ? (
        <Disclosure open={open} onToggle={onToggle} label="See how">
          <Text className="text-[12px] text-slate-600 leading-5 mt-1">{mission.body}</Text>
        </Disclosure>
      ) : null}
    </View>
  );
}
