import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Clock, Flame, RefreshCw, Target, XCircle, Zap } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Rotating tips below the ring -- mirrors Quiz-Battle-Service's actual
// scoring config (app/core/config.py: BATTLE_SCORE_BASE_CORRECT,
// BATTLE_SPEED_BONUS_TIER1_*, BATTLE_STREAK_BONUS_TIER1_*, BATTLE_ANSWER_
// REVEAL_SECONDS) -- keep these in sync if those values ever change.
const STEPS = [
  { icon: Target, text: "Correct answers earn 100 points" },
  { icon: Zap, text: "Answer within 5s for a +30 speed bonus" },
  { icon: Flame, text: "2+ correct answers in a row starts a streak bonus" },
  { icon: RefreshCw, text: "You can change your answer until it locks" },
  { icon: Clock, text: "Answers lock in the final 5 seconds" },
  { icon: XCircle, text: "Wrong answers cost nothing -- just 0 points" },
];

const RING_SIZE = 130;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const PENDING_CAP = 0.92;
const PENDING_CLIMB_MS = 20000;

// "Preparing Match" popup, rendered directly over preparing.tsx's own
// LinearGradient with no dark tint of its own -- keeps that gradient
// looking exactly like queue.tsx's "Finding a Match…" screen (same colors,
// same brightness) instead of a blur darkening it into a different shade.
// The ring stays centered; the rotating text below it cycles through
// actual scoring/rule tips instead of generic flavor text, so the wait
// doubles as a quick how-to-play. There's no countdown here: the instant
// question generation finishes, the caller navigates straight to
// match-session.tsx and this unmounts, so the ring just creeps toward 92%
// for as long as it's shown rather than needing its own "complete" state.
export default function MatchStartPopup() {
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => setStepIndex((prev) => (prev + 1) % STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fill.value = withTiming(PENDING_CAP, { duration: PENDING_CLIMB_MS, easing: Easing.out(Easing.cubic) });
  }, [fill]);

  useAnimatedReaction(
    () => Math.round(fill.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setPercent)(current);
    }
  );

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill.value),
  }));

  const { icon: StepIcon, text } = STEPS[stepIndex];

  return (
    <View className="absolute inset-0 items-center justify-center px-10">
      <View className="items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            stroke="rgba(255,255,255,0.2)" strokeWidth={RING_STROKE} fill="transparent"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            stroke={ICON_COLORS.white} strokeWidth={RING_STROKE} fill="transparent"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeLinecap="round"
            animatedProps={ringProps}
            transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
          />
        </Svg>
        <View className="w-[72px] h-[72px] rounded-full bg-white/15 justify-center items-center border-2 border-white/30">
          <StepIcon size={22} color={ICON_COLORS.white} strokeWidth={1.8} />
          <Text className="text-white text-xs font-black mt-1">{percent}%</Text>
        </View>
      </View>

      <Text className="text-white text-lg font-black mt-5 mb-1.5">Preparing Match</Text>
      <Animated.Text
        key={stepIndex}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        className="text-white/70 text-xs font-semibold text-center"
      >
        {text}
      </Animated.Text>
    </View>
  );
}
