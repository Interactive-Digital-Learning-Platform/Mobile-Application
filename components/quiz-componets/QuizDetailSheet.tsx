import { Modal, View, Text, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import {
  Clock, BarChart2, ListChecks, Play, RotateCcw, X, HelpCircle,
  type LucideIcon,
} from "lucide-react-native";
import { DIFFICULTY_STYLES, ICON_COLORS, SUBJECT_ICONS } from "@/constants/quizStyles";
import { Difficulty, PracticeItem } from "@/components/quiz-componets/QuizPracticeCard";

const SHEET_OFFSCREEN_Y = 700;
const ANIM_MS = 250;

interface QuizDetailSheetProps {
  item: PracticeItem;
  visible: boolean;
  onClose: () => void;
  onAction: () => void;
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-1 bg-slate-50 rounded-2xl p-3 items-center gap-1">
      <Icon size={18} color={ICON_COLORS.slate500} strokeWidth={1.8} />
      <Text className="text-base font-black text-slate-800">{value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium">{label}</Text>
    </View>
  );
}

export default function QuizDetailSheet({ item, visible, onClose, onAction }: QuizDetailSheetProps) {
  const router = useRouter();

  // Keep the modal mounted until the exit animation finishes, since RN's
  // <Modal> would otherwise unmount it instantly and cut the animation short.
  const [isMounted, setIsMounted] = useState(visible);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_OFFSCREEN_Y);

  // Backdrop and sheet are animated separately since RN's `animationType`
  // can only apply one transition to the whole subtree.
  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: ANIM_MS, easing: Easing.out(Easing.ease) });
      sheetTranslateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: ANIM_MS, easing: Easing.in(Easing.ease) });
      sheetTranslateY.value = withTiming(
        SHEET_OFFSCREEN_Y,
        { duration: ANIM_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setIsMounted)(false);
        }
      );
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const Icon = SUBJECT_ICONS[item.subject] ?? HelpCircle;
  const diff = DIFFICULTY_STYLES[item.difficulty];
  const hasStarted = item.progress > 0;
  const isComplete = item.progress === 100;
  const correctCount = item.correct_count ?? 0;
  const remaining = item.questions - item.answered_count;

  // Same logic as QuizPracticeCard: completed shows how many were answered
  // CORRECTLY; in progress shows how many have been answered so far.
  const displayCount = isComplete ? correctCount : item.answered_count;
  const displayPct = item.questions > 0
    ? Math.round((displayCount / item.questions) * 100)
    : 0;
  const barColor = !hasStarted
    ? "bg-slate-200"
    : !isComplete
    ? "bg-primary"
    : displayPct >= 70 ? "bg-emerald-500"
    : displayPct >= 50 ? "bg-amber-500"
    : "bg-rose-500";
  const textColor = !hasStarted
    ? "text-slate-500"
    : !isComplete
    ? "text-primary"
    : displayPct >= 70 ? "text-emerald-500"
    : displayPct >= 50 ? "text-amber-500"
    : "text-rose-500";

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1, justifyContent: "flex-end" }, backdropStyle]} className="bg-black/40">
        <Animated.View style={sheetStyle} className="bg-white rounded-t-[32px] px-6 pt-6 pb-10">
          <TouchableOpacity
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 justify-center items-center"
            activeOpacity={0.7}
            onPress={onClose}
          >
            <X size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
          </TouchableOpacity>

          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-16 h-16 rounded-2xl bg-slate-50 justify-center items-center">
              <Icon size={28} color={ICON_COLORS.slate500} strokeWidth={1.6} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-slate-800">{item.subject}</Text>
              <View className={`self-start flex-row items-center gap-1 px-2.5 py-0.5 rounded-full mt-1.5 ${diff.bg}`}>
                <View className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                <Text className={`text-xs font-semibold ${diff.text}`}>{item.difficulty}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3 mb-5">
            <StatTile icon={ListChecks} label="Questions" value={String(item.questions)} />
            <StatTile icon={Clock}      label="Duration"  value={item.timer} />
            <StatTile
              icon={BarChart2}
              label={isComplete ? "Correct" : "Progress"}
              value={isComplete ? `${correctCount}/${item.questions}` : `${item.progress}%`}
            />
          </View>

          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-bold text-slate-600">
                {isComplete
                  ? `${displayCount} of ${item.questions} correct`
                  : hasStarted
                  ? `${displayCount} of ${item.questions} answered`
                  : "Not started yet"}
              </Text>
              {hasStarted && !isComplete && (
                <Text className="text-xs text-slate-400">{remaining} remaining</Text>
              )}
              {isComplete && (
                <Text className={`text-xs font-bold ${textColor}`}>{displayPct}%</Text>
              )}
            </View>
            <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${displayPct}%` }}
              />
            </View>
          </View>

          <TouchableOpacity
            className={`flex-row justify-center items-center gap-2 py-4 rounded-2xl shadow-lg ${
              isComplete
                ? "bg-emerald-500 shadow-emerald-500/30"
                : hasStarted
                ? "bg-slate-800 shadow-slate-800/20"
                : "bg-primary shadow-primary/30"
            }`}
            activeOpacity={0.85}
            onPress={() => {
              onClose();
              onAction();
              router.push({
                pathname: "/(tabs)/quiz/quiz-session",
                params: {
                  subject:          item.subject,
                  difficulty:       item.difficulty.toLowerCase(),
                  questionCount:    String(item.questions),
                  timer:            item.timer.replace(" min", ""),
                  grade:            "10",
                  resumeSessionId: String(item.session_id),
                  // Retake: load same questions from DB but reset all answers
                  ...(isComplete ? { restartSession: "true" } : {}),
                },
              } as any);
            }}
          >
            {isComplete ? (
              <RotateCcw size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
            ) : (
              <Play size={18} color={ICON_COLORS.white} strokeWidth={2.5} fill={ICON_COLORS.white} />
            )}
            <Text className="text-white font-black text-base">
              {isComplete ? "Retake Quiz" : hasStarted ? "Continue Quiz" : "Start Quiz"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
