import { TextInput, Text, View } from "react-native";
import ProgressSteps from "@/components/ui/ProgressSteps";

type Props = {
  stepTitle: string;
  stepInstruction: string;
  totalSteps: number;
  currentStep: number;
  taskPrompt: string | null;
  taskIndex: number | null;
  taskTotal: number | null;
  measurement: { value: string; onChange: (v: string) => void } | null;
};

// Main Step vs Current Task.
//
// When the step has micro-steps, the Current Task's `studentPrompt` is the ONLY guidance shown —
// it's deliberately vague about the specific reagents/equipment so the student has to reason. The
// Main Step's own `instruction` is teacher-facing and names the reagents outright ("add universal
// indicator to the hydrochloric acid sample"), so it must NOT be surfaced here — not even behind a
// toggle. Only unmigrated steps (no micro-steps) show `instruction`, where it IS the task.
export default function GuidedStepPanel({
  stepTitle,
  stepInstruction,
  totalSteps,
  currentStep,
  taskPrompt,
  taskIndex,
  taskTotal,
  measurement,
}: Props) {
  return (
    <View>
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Step {Math.min(currentStep, totalSteps)} of {totalSteps}
      </Text>
      <Text className="text-base font-black text-slate-800 mt-0.5">{stepTitle}</Text>
      <View className="mt-2">
        <ProgressSteps totalSteps={totalSteps} currentStep={currentStep} />
      </View>

      {taskPrompt ? (
        <View className="mt-3 p-3 rounded-2xl bg-primary/5 border border-primary/15">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-primary">
            Current task{taskIndex && taskTotal ? ` • ${taskIndex} of ${taskTotal}` : ""}
          </Text>
          <Text className="text-[13.5px] font-semibold text-slate-800 leading-5 mt-1">{taskPrompt}</Text>
        </View>
      ) : (
        !!stepInstruction && <Text className="text-[13px] text-slate-500 leading-5 mt-3">{stepInstruction}</Text>
      )}

      {measurement && (
        <View className="mt-3 p-3 rounded-2xl bg-slate-50">
          <Text className="text-[12px] font-bold text-slate-700 mb-2">Enter your calculated answer</Text>
          <TextInput
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800"
            keyboardType="decimal-pad"
            value={measurement.value}
            onChangeText={measurement.onChange}
            placeholder="e.g. 9.8"
            placeholderTextColor="#94a3b8"
          />
        </View>
      )}
    </View>
  );
}
