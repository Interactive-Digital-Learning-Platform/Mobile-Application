import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { Check } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import { capitalize } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";

// Level-up progress shown as its two real requirements -- Skill (adaptive mastery score vs the threshold) and
// Practice (questions answered vs the minimum) -- instead of one blended percentage. The blended number is just the
// lower of the two, so on its own it hid which one the student actually needs to work on.

function Meter({ label, value, required, unit }: { label: string; value: number; required: number; unit?: string }) {
  const met = value >= required;
  const pct = Math.min(100, Math.max(0, (value / required) * 100));
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-slate-500 text-[11px] font-semibold">{label}</Text>
        <View className="flex-row items-center gap-0.5">
          {met && <Check size={11} color={ICON_COLORS.emerald600} strokeWidth={3} />}
          <Text className={`text-[11px] font-bold ${met ? "text-emerald-600" : "text-slate-700"}`}>
            {Math.floor(Math.min(value, required))}/{required}{unit ? ` ${unit}` : ""}
          </Text>
        </View>
      </View>
      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: met ? ICON_COLORS.emerald500 : ICON_COLORS.primary500 }}
        />
      </View>
    </View>
  );
}

// One encouraging sentence that names the next concrete step.
function nextStep(skillGap: number, questionsLeft: number, next: string): string {
  if (skillGap <= 0 && questionsLeft <= 0) return `Ready for ${next} — your next quiz can level you up!`;
  if (skillGap <= 0) {
    return `Skill is ready! Just ${questionsLeft} more ${questionsLeft === 1 ? "question" : "questions"} to unlock ${next}.`;
  }
  if (questionsLeft <= 0) {
    return skillGap <= 5
      ? `Almost there — a few more right answers will unlock ${next}.`
      : `Keep getting answers right to raise your skill and unlock ${next}.`;
  }
  return `Answer ${questionsLeft} more ${questionsLeft === 1 ? "question" : "questions"} and keep your answers accurate to unlock ${next}.`;
}

export default function LevelUpProgress({ subject }: { subject: SubjectAnalytics }) {
  const skillRequired = subject.promotion_mastery_required;
  const questionsRequired = subject.promotion_questions_required;
  // At the top tier the backend reports next_difficulty === current_difficulty.
  const atTop = !subject.next_difficulty
    || subject.next_difficulty.toLowerCase() === subject.current_difficulty.toLowerCase();

  if (atTop) {
    return <Text className="text-emerald-600 text-[11px] font-semibold mt-1.5">Highest level reached — great work!</Text>;
  }
  const next = capitalize(subject.next_difficulty!);

  // Older backend / cached response without the split requirements: fall back to the single blended percentage.
  if (skillRequired == null || questionsRequired == null) {
    const pct = Math.round(Math.min(100, Math.max(0, subject.promotion_progress_percentage ?? 0)));
    return <Text className="text-slate-400 text-[11px] mt-1">{pct}% of the way to {next}</Text>;
  }

  const skill = subject.promotion_mastery_score ?? 0;
  const answered = subject.promotion_questions_answered ?? 0;
  const skillGap = skillRequired - skill;
  const questionsLeft = Math.max(0, questionsRequired - answered);

  return (
    <View className="mt-2">
      <View className="flex-row gap-4">
        <Meter label="Skill" value={skill} required={skillRequired} />
        <Meter label="Practice" value={answered} required={questionsRequired} unit="Qs" />
      </View>
      <Text className="text-slate-500 text-[11px] mt-1.5">{nextStep(skillGap, questionsLeft, next)}</Text>
    </View>
  );
}
