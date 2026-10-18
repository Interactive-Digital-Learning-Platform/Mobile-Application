import { Text, View } from "react-native";
import { Check } from "lucide-react-native";

type ProgressStepsProps = {
  totalSteps: number;
  // 1-indexed. Steps before this are complete, this one is current, steps after are pending.
  // Pass totalSteps + 1 to render every step as complete (e.g. a finished-session report).
  currentStep: number;
};

export default function ProgressSteps({ totalSteps, currentStep }: ProgressStepsProps) {
  return (
    <View className="flex-row items-center">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        const isLast = step === totalSteps;

        return (
          <View key={step} className="flex-row items-center" style={{ flex: isLast ? 0 : 1 }}>
            <View
              className={`w-6 h-6 rounded-full items-center justify-center ${
                isComplete ? "bg-emerald-500" : isCurrent ? "bg-primary" : "bg-white border border-border"
              }`}
            >
              {isComplete ? <Check size={13} color="white" /> : isCurrent ? <View className="w-2 h-2 rounded-full bg-white" /> : null}
            </View>
            {!isLast && <View className={`flex-1 h-[2px] mx-1 ${isComplete ? "bg-emerald-500" : "bg-border"}`} />}
          </View>
        );
      })}
    </View>
  );
}

export function ProgressStepsCaption({ totalSteps, currentStep }: ProgressStepsProps) {
  const label = currentStep > totalSteps ? `${totalSteps} of ${totalSteps} steps completed` : `Step ${currentStep} of ${totalSteps}`;
  return <Text className="font-aregular text-xs text-muted mt-1.5">{label}</Text>;
}
