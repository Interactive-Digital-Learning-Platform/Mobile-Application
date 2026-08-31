import { useState } from "react";
import { Text, View } from "react-native";
import { Route } from "lucide-react-native";
import { JourneyStep } from "@/types/lab";
import { SectionHeading } from "./primitives";
import LabJourneyStep from "./LabJourneyStep";
import { ICON_COLORS } from "@/constants/quizStyles";

const MAX_OPEN = 2;

// Interactive vertical timeline of the experiment (spec §4). At most two steps open at once so
// the screen never turns back into a long document.
export default function LabJourneyTimeline({ journey }: { journey: JourneyStep[] }) {
  // Keep the first view scannable. Students can open only the steps they want to inspect.
  const [openIds, setOpenIds] = useState<number[]>([]);

  const toggle = (stepId: number) => {
    setOpenIds((prev) => {
      if (prev.includes(stepId)) return prev.filter((id) => id !== stepId);
      const next = [...prev, stepId];
      return next.length > MAX_OPEN ? next.slice(next.length - MAX_OPEN) : next;
    });
  };

  if (journey.length === 0) {
    return (
      <View>
        <SectionHeading title="Step Journey" icon={Route} iconColor={ICON_COLORS.slate500} />
        <View className="rounded-2xl bg-white border border-slate-100 p-4">
          <Text className="text-[12px] text-slate-400 leading-5">
            This practical doesn&apos;t have a per-step breakdown yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <SectionHeading title="Your Lab Journey" icon={Route} iconColor={ICON_COLORS.slate500} />
      <View>
        {journey.map((step, i) => (
          <LabJourneyStep
            key={step.stepId}
            step={step}
            index={i}
            isLast={i === journey.length - 1}
            open={openIds.includes(step.stepId)}
            onToggle={() => toggle(step.stepId)}
          />
        ))}
      </View>
      <Text className="text-[10px] font-medium text-slate-400 mt-1 ml-10">
        Tap a step to reveal its evidence.
      </Text>
    </View>
  );
}
