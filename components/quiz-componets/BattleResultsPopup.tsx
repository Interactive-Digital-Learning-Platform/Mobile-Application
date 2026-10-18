import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AlarmClock,
  Annoyed,
  BookOpen,
  ChevronDown,
  ChevronsRight,
  Flame,
  Frown,
  Home,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { BATTLE_RESULT_STYLES, BattleResultTheme } from "@/constants/battleStyles";
import { ICON_COLORS } from "@/constants/quizStyles";
import { formatMathText } from "@/constants/quizHelpers";
import { BattleParticipantResult, BattleQuestionReview, BattleQuestionReviewStatus } from "@/types/battleModuleTypes";
import ConfettiView from "@/components/quiz-componets/ConfettiView";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";

// Same visual language as app/(main)/quiz/quiz-session.tsx's results screen
// (hero card, icon circle, white/20 stat tiles, rounded CTA buttons) --
// shown as a popup over match-session.tsx instead of that data's own
// dedicated route, so the live board stays mounted underneath and the
// player never leaves this screen at all.
const RESULT_ICONS: Record<BattleResultTheme, { Icon: LucideIcon; confetti: boolean }> = {
  win:     { Icon: Trophy,     confetti: true },
  loss:    { Icon: Frown,      confetti: false },
  draw:    { Icon: Annoyed,    confetti: false },
  forfeit: { Icon: AlarmClock, confetti: false },
};

// One participant's column in the vs comparison -- score, streak, and
// rating change stacked vertically, same shape for "You" and the opponent
// so the two sides read as a direct comparison rather than two different
// layouts.
function ParticipantStatColumn({ name, result }: { name: string; result: BattleParticipantResult }) {
  const delta = result.rating_delta ?? 0;
  const isUp = delta >= 0;
  return (
    <View className="flex-1 items-center gap-3">
      <Text className="text-slate-800 font-black text-sm" numberOfLines={1}>
        {name}
      </Text>
      <View className="items-center">
        <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Score</Text>
        <Text className="text-slate-800 font-black text-lg">{result.final_score ?? 0}</Text>
      </View>
      <View className="items-center">
        <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Streak</Text>
        <Text className="text-slate-800 font-black text-lg">{result.best_streak ?? 0}</Text>
      </View>
      <View className="items-center">
        <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Rating</Text>
        <View className="flex-row items-center gap-1">
          {isUp ? (
            <TrendingUp size={12} color={ICON_COLORS.emerald500} strokeWidth={2.5} />
          ) : (
            <TrendingDown size={12} color={ICON_COLORS.rose500} strokeWidth={2.5} />
          )}
          <Text className={`font-black text-sm ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? "+" : ""}
            {delta}
          </Text>
        </View>
      </View>
    </View>
  );
}

const REVIEW_STATUS_STYLES: Record<BattleQuestionReviewStatus, { label: string; chip: string; text: string }> = {
  correct: { label: "Correct", chip: "bg-emerald-100", text: "text-emerald-700" },
  incorrect: { label: "Wrong", chip: "bg-rose-100", text: "text-rose-600" },
  skipped: { label: "Skipped", chip: "bg-amber-100", text: "text-amber-700" },
  unanswered: { label: "Not reached", chip: "bg-slate-100", text: "text-slate-500" },
};

// One question of the end-of-match review: the right answer next to the
// player's own pick, and what it scored.
function ReviewRow({ item }: { item: BattleQuestionReview }) {
  const status = REVIEW_STATUS_STYLES[item.status];
  const picked = item.selected_option != null;
  return (
    <View className="py-3 border-t border-slate-100">
      <View className="flex-row items-start gap-2">
        <Text className="text-slate-400 text-xs font-black mt-0.5">Q{item.question_order + 1}</Text>
        <Text className="flex-1 text-slate-800 text-sm font-bold">{formatMathText(item.question)}</Text>
        <View className={`px-2 py-0.5 rounded-full ${status.chip}`}>
          <Text className={`text-[10px] font-black ${status.text}`}>{status.label}</Text>
        </View>
      </View>
      <View className="ml-7 mt-2 gap-1">
        {picked && (
          <Text className="text-xs text-slate-500">
            Your answer:{" "}
            <Text className={`font-bold ${item.status === "correct" ? "text-emerald-600" : "text-rose-500"}`}>
              {formatMathText(item.selected_option ?? "")}
            </Text>
          </Text>
        )}
        {item.status !== "correct" && item.correct_answer != null && (
          <Text className="text-xs text-slate-500">
            Correct answer:{" "}
            <Text className="font-bold text-emerald-600">{formatMathText(item.correct_answer)}</Text>
          </Text>
        )}
        <Text className="text-xs text-slate-500">
          Points: <Text className="font-black text-slate-800">+{item.total_question_score}</Text>
          {item.speed_bonus > 0 || item.streak_bonus > 0
            ? ` (${[
                `${item.base_score}`,
                item.speed_bonus > 0 ? `${item.speed_bonus} speed` : null,
                item.streak_bonus > 0 ? `${item.streak_bonus} streak` : null,
              ]
                .filter(Boolean)
                .join(" + ")})`
            : ""}
          {item.response_time_ms != null ? ` · ${(item.response_time_ms / 1000).toFixed(1)}s` : ""}
        </Text>
      </View>
    </View>
  );
}

// Collapsed by default so the result itself stays the focus; tap to open.
function AnswerReview({ review }: { review: BattleQuestionReview[] | null }) {
  const [open, setOpen] = useState(false);
  const correct = review?.filter((r) => r.status === "correct").length ?? 0;
  // This player's bonus totals for the match -- only revealed now, at the end.
  const speedTotal = review?.reduce((sum, r) => sum + r.speed_bonus, 0) ?? 0;
  const streakTotal = review?.reduce((sum, r) => sum + r.streak_bonus, 0) ?? 0;
  return (
    <View className="bg-white rounded-2xl px-4 border border-slate-100 shadow-sm shadow-black/5">
      <TouchableOpacity
        className="flex-row items-center justify-between py-3.5"
        activeOpacity={0.8}
        disabled={!review}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Answer review"
      >
        <View>
          <Text className="text-slate-800 text-sm font-black">Answer review</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {review ? `${correct}/${review.length} correct` : "Loading your answers…"}
          </Text>
          {review && (speedTotal > 0 || streakTotal > 0) && (
            <View className="flex-row gap-1.5 mt-1.5">
              {speedTotal > 0 && (
                <View className="flex-row items-center gap-1 bg-primary-50 px-2 py-0.5 rounded-full">
                  <Zap size={11} color={ICON_COLORS.primary600} strokeWidth={2.5} />
                  <Text className="text-primary-700 text-[11px] font-black">+{speedTotal} speed</Text>
                </View>
              )}
              {streakTotal > 0 && (
                <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Flame size={11} color={ICON_COLORS.amber500} strokeWidth={2.5} />
                  <Text className="text-amber-700 text-[11px] font-black">+{streakTotal} streak</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={20} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
      {open && review?.map((item) => <ReviewRow key={item.question_order} item={item} />)}
    </View>
  );
}

interface BattleResultsPopupProps {
  visible: boolean;
  subject: string;
  me: BattleParticipantResult;
  opponent: BattleParticipantResult | null;
  // This player's own per-question review -- null while it's still loading.
  review: BattleQuestionReview[] | null;
  // The match clock ran out (rather than both players finishing) -- shown
  // as a "Time's up" badge on the result card.
  endedByTime?: boolean;
  // This player's last Next/Skip reached the server after 0:00 and wasn't saved.
  lastAnswerRefused?: boolean;
  onRematch: () => void;
  onHome: () => void;
}

export default function BattleResultsPopup({
  visible,
  subject,
  me,
  opponent,
  review,
  endedByTime = false,
  lastAnswerRefused = false,
  onRematch,
  onHome,
}: BattleResultsPopupProps) {
  const theme: BattleResultTheme = (me.result as BattleResultTheme) ?? "draw";
  const style = BATTLE_RESULT_STYLES[theme];
  const { Icon, confetti } = RESULT_ICONS[theme];
  // me.result is only ever "forfeit" from MY OWN forfeiting -- a win earned
  // because the OPPONENT forfeited still reports as a plain "win" here, so
  // this covers that case with its own subtitle instead of the generic one.
  const opponentForfeited = opponent?.result === "forfeit";
  const tagline = opponentForfeited
    ? "Opponent forfeited the match"
    : lastAnswerRefused
      ? "Your last answer came in after the clock ran out, so it wasn't counted."
      : endedByTime
        ? "The clock ran out before you both finished."
        : style.sub;
  // Same fallback chain queue.tsx already uses for the same data gap (a
  // participant who deleted their account, or a username that never got
  // backfilled) -- a real name when there is one, else a stable ID-based
  // label instead of just "Opponent".
  const opponentName = opponent
    ? (opponent.username ?? `Player #${opponent.user_id}`)
    : "Opponent";

  const router = useRouter();
  // dismissTo (not push): same rationale as onHome -- pops the whole
  // battle/queue/match-session stack instead of leaving it mounted
  // underneath. The mode param forces QuizHome onto its Practice tab
  // specifically, since that tab navigator stays mounted in the background
  // the whole time this battle was in progress and would otherwise still
  // be showing whatever mode (likely Online) it was left on.
  const handlePracticeHome = () => {
    router.dismissTo({ pathname: "/(tabs)/quiz", params: { mode: "practice" } } as any);
  };

  const heroY = useSharedValue(-80);
  const heroOp = useSharedValue(0);
  const statsY = useSharedValue(60);
  const statsOp = useSharedValue(0);

  // Replays the entrance animation every time this pops up (Modal content
  // isn't unmounted between opens the way a route's screen would be).
  useEffect(() => {
    if (!visible) return;
    heroY.value = -80;
    heroOp.value = 0;
    statsY.value = 60;
    statsOp.value = 0;
    heroOp.value = withTiming(1, { duration: 100 });
    heroY.value = withSpring(0, { damping: 16, stiffness: 130 });
    statsOp.value = withDelay(150, withTiming(1, { duration: 200 }));
    statsY.value = withDelay(150, withSpring(0, { damping: 18, stiffness: 120 }));
  }, [visible, heroY, heroOp, statsY, statsOp]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOp.value,
    transform: [{ translateY: heroY.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOp.value,
    transform: [{ translateY: statsY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/60 justify-center items-center px-5">
        {visible && (
          <View
            className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            style={{ maxHeight: "92%" }}
          >
            {confetti && <ConfettiView count={100} />}
            {/* flexShrink lets this give up height to the button footer
                below once the two combined exceed the card's maxHeight (a
                small device, a long opponent name wrapping, etc.) -- on
                any device where everything already fits, nothing scrolls
                and this looks identical to a plain View. Buttons are never
                inside this ScrollView, so they're always fully visible;
                only the result/stats content above them ever scrolls. */}
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              {/* View 1 -- match result only (win/loss/draw/forfeit), no
                  stats mixed in. */}
              <Animated.View
                style={heroStyle}
                className={`mx-4 mt-5 rounded-3xl overflow-hidden shadow-lg ${style.bg}`}
              >
                <View className="items-center px-6 pt-8 pb-8">
                  {endedByTime && (
                    <View className="flex-row items-center gap-1.5 bg-white/20 border border-white/30 px-3 py-1 rounded-full mb-4">
                      <AlarmClock size={14} color={ICON_COLORS.white} strokeWidth={2.2} />
                      <Text className="text-white text-xs font-black uppercase tracking-wide">Time&apos;s up</Text>
                    </View>
                  )}
                  <View className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 justify-center items-center">
                    <Icon size={38} color={ICON_COLORS.white} strokeWidth={1.8} />
                  </View>

                  <Text className="text-white text-2xl font-black mt-4">{style.label}</Text>
                  <Text className="text-white/70 text-sm text-center mt-1 mb-6">{tagline}</Text>

                  <View className="bg-white/15 px-3 py-1.5 rounded-xl self-center">
                    <Text className="text-white/80 text-xs font-medium">{subject}</Text>
                  </View>
                  {me.league && (
                    <View className="mt-2">
                      <LeagueBadge league={me.league} size="md" />
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* View 2 -- direct You-vs-opponent comparison, separate from
                  the result card above. */}
              <Animated.View style={statsStyle} className="mx-4 mt-4">
                <View className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm shadow-black/5">
                  <Text className="text-slate-800 text-sm font-black text-center mb-4">
                    You vs {opponentName}
                  </Text>
                  <View className="flex-row items-start">
                    <ParticipantStatColumn name="You" result={me} />
                    <View className="w-px bg-slate-100 self-stretch mx-2" />
                    {opponent ? (
                      <ParticipantStatColumn name={opponentName} result={opponent} />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-slate-300 text-xs text-center">No opponent data</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>

              {/* View 3 -- this player's own answers, question by question. */}
              <Animated.View style={statsStyle} className="mx-4 mt-4 mb-4">
                <AnswerReview review={review} />
              </Animated.View>
            </ScrollView>

            {/* Separate from the result/stats views above -- its own row of
                actions, not part of that content block at all. */}
            <Animated.View style={statsStyle} className="px-4 pt-3 pb-4 gap-3 border-t border-slate-100">
              <TouchableOpacity
                className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl"
                activeOpacity={0.85}
                onPress={onRematch}
              >
                <ChevronsRight size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
                <Text className="text-white font-black text-base">Next Match</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
                activeOpacity={0.85}
                onPress={onHome}
              >
                <Home size={18} color={ICON_COLORS.slate600} strokeWidth={2.2} />
                <Text className="text-slate-600 font-black text-base">Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full flex-row justify-center items-center gap-2 py-1"
                activeOpacity={0.85}
                onPress={handlePracticeHome}
              >
                <BookOpen size={16} color={ICON_COLORS.primary500} strokeWidth={2.5} />
                <Text className="text-primary font-bold text-sm">Practice</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
}
