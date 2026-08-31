import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ChevronDown } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { JOURNEY_STATUS } from "@/constants/lab/report.constants";
import { JourneyStep } from "@/types/lab";
import { fmtDuration } from "@/utils/lab/report";
import { EvidenceChip } from "./primitives";

// One task = its label + a compact chip row. No per-task prose — the one improvement line lives
// once at the step level.
function TaskRow({ task }: { task: JourneyStep["tasks"][number] }) {
  return (
    <View className="flex-row items-start gap-2 mt-2.5">
      <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
      <View className="flex-1">
        <Text className="text-[12px] text-slate-700 leading-4" numberOfLines={2}>
          {task.label}
        </Text>
        <View className="flex-row flex-wrap gap-1.5 mt-1.5">
          <EvidenceChip label={`Score ${task.score}`} />
          <EvidenceChip label={fmtDuration(task.timeSpentSeconds)} />
          {task.hintsRequested > 0 && (
            <EvidenceChip label={`${task.hintsRequested} hint${task.hintsRequested > 1 ? "s" : ""}`} tone="warning" />
          )}
          {task.helpUsed && <EvidenceChip label="Answer shown" tone="danger" />}
          {task.mistakes > 0 && (
            <EvidenceChip label={`${task.mistakes} mistake${task.mistakes > 1 ? "s" : ""}`} tone="warning" />
          )}
          {task.scoreImpact > 0 && <EvidenceChip label={`−${task.scoreImpact} marks`} tone="danger" />}
        </View>
      </View>
    </View>
  );
}

export default function LabJourneyStep({
  step,
  index,
  isLast,
  open,
  onToggle,
}: {
  step: JourneyStep;
  index: number;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const s = JOURNEY_STATUS[step.status];
  const StatusIcon = s.icon;

  const meta: string[] = [`Score ${step.score}`, fmtDuration(step.timeSpentSeconds)];
  if (step.hintsRequested > 0) meta.push(`${step.hintsRequested} hint${step.hintsRequested > 1 ? "s" : ""}`);
  if (step.helpUsed) meta.push("Help");
  if (step.retries > 0) meta.push(`${step.retries} retr${step.retries > 1 ? "ies" : "y"}`);

  return (
    <View className="flex-row gap-3">
      {/* timeline rail */}
      <View className="items-center w-7">
        <View className={`w-7 h-7 rounded-full items-center justify-center ${s.dot}`}>
          <StatusIcon size={14} color={ICON_COLORS.white} strokeWidth={2.6} />
        </View>
        {!isLast && <View className={`w-0.5 flex-1 mt-1 ${s.line}`} />}
      </View>

      {/* card */}
      <View className={`flex-1 ${isLast ? "" : "pb-3"}`}>
        <Pressable
          onPress={onToggle}
          className="rounded-2xl bg-white border border-slate-100 p-3.5 min-h-[52px]"
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Step ${step.stepId}, ${step.title}, ${s.label}, score ${step.score}`}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] font-black text-slate-300">{String(index + 1).padStart(2, "0")}</Text>
            <Text className="text-[13px] font-bold text-slate-800 flex-1" numberOfLines={1}>
              {step.title}
            </Text>
            <ChevronDown
              size={15}
              color={ICON_COLORS.slate400}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
            />
          </View>

          <View className="flex-row items-center flex-wrap gap-1.5 mt-2">
            <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${s.chipBg}`}>
              <StatusIcon size={11} color={s.iconColor} strokeWidth={2.6} />
              <Text className={`text-[10px] font-bold ${s.chipText}`}>{s.label}</Text>
            </View>
            {step.isMostChallenging && (
              <View className="rounded-full px-2 py-0.5 bg-rose-100">
                <Text className="text-[10px] font-bold text-rose-700">Most Challenging</Text>
              </View>
            )}
          </View>

          {!open && (
            <Text className="text-[11px] text-slate-400 mt-1.5" numberOfLines={1}>
              {meta.join(" · ")}
            </Text>
          )}

          {open && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              className="mt-3 pt-3 border-t border-slate-100"
            >
              <View className="flex-row flex-wrap gap-1.5">
                <EvidenceChip label={`Score ${step.score}`} />
                <EvidenceChip label={fmtDuration(step.timeSpentSeconds)} />
                {step.retries > 0 && (
                  <EvidenceChip label={`${step.retries} attempt${step.retries > 1 ? "s" : ""}`} tone="warning" />
                )}
                {step.hintsRequested > 0 && (
                  <EvidenceChip label={`${step.hintsRequested} hint${step.hintsRequested > 1 ? "s" : ""}`} tone="warning" />
                )}
                {step.helpRevealedAnswer && <EvidenceChip label="Answer revealed" tone="danger" />}
                {step.mistakes > 0 && (
                  <EvidenceChip label={`${step.mistakes} mistake${step.mistakes > 1 ? "s" : ""}`} tone="warning" />
                )}
                {step.scoreImpact > 0 && <EvidenceChip label={`−${step.scoreImpact} marks`} tone="danger" />}
              </View>

              {step.tasks.length > 0 ? (
                <View className="mt-3">
                  <Text className="text-[11px] font-bold text-slate-500">Task breakdown</Text>
                  {step.tasks.map((t) => (
                    <TaskRow key={t.microStepId} task={t} />
                  ))}
                </View>
              ) : null}

              {step.advice && (
                <Text className="text-[12px] text-slate-600 leading-5 mt-3">{step.advice}</Text>
              )}
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
