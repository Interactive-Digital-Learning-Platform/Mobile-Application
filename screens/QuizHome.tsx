import StatisticButton from "@/components/quiz-componets/StatisticButton";
import ModeSwitcher, { QuizMode } from "@/components/quiz-componets/ModeSwitcher";
import PracticeList from "@/components/quiz-componets/PracticeList";
import OnlineList from "@/components/quiz-componets/OnlineList";
import OfflineBanner from "@/components/quiz-componets/OfflineBanner";
import { StatusBar, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    SafeAreaView,
} from "react-native-safe-area-context";
import { ICON_COLORS } from "@/constants/quizStyles";

const SWIPE_ACTIVATE_PX = 20;
const SWIPE_FAIL_Y_PX = 15;
const SWIPE_DISTANCE_PX = 60;
const SWIPE_VELOCITY = 500;
const MODE_SLIDE_PX = 48;
const MODE_SLIDE_MS = 220;
const HEADER_FADE_PX = 240;
const HEADER_FADE_STOPS = 12;
const HEADER_FALLBACK_PX = 420; // until the header has been measured on first layout

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `#${a.map((c, i) => Math.round(c + (b[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

// Eased gradient: a plain two-stop linear fade shows a hard line where it starts and ends, so the fade is sampled
// along an ease-in-out curve instead -- slow at both ends, faster in the middle -- giving a seamless blend.
function easedFade(from: string, to: string, fadeStart: number, steps: number) {
  const colors = [from, from];
  const locations = [0, fadeStart];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t); // smoothstep
    colors.push(mixHex(from, to, eased));
    locations.push(fadeStart + (1 - fadeStart) * t);
  }
  return { colors, locations };
}

export default function QuizHome() {
  const [mode, setMode] = useState<QuizMode>("practice");
  const [headerBottom, setHeaderBottom] = useState(0);
  // Lets a caller force this tab open on a specific mode (e.g.
  // BattleResultsPopup's "Practice" button, which needs the Practice tab
  // specifically, not whatever mode this screen happened to be left on --
  // this tab navigator stays mounted in the background while the battle
  // stack is open on top of it, so `mode` otherwise wouldn't reset on its
  // own just from navigating back here).
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  useEffect(() => {
    if (modeParam === "practice" || modeParam === "online") setMode(modeParam);
  }, [modeParam]);

  const switchMode = useCallback((next: QuizMode) => {
    if (next === mode) return;
    Haptics.selectionAsync();
    setMode(next);
  }, [mode]);

  // Swipe left -> Online, swipe right -> Practice. Only claims clearly horizontal drags (activeOffsetX) and gives up
  // as soon as the finger moves vertically (failOffsetY), so the list keeps scrolling and short taps on card buttons
  // still go through.
  const swipe = Gesture.Pan()
    .activeOffsetX([-SWIPE_ACTIVATE_PX, SWIPE_ACTIVATE_PX])
    .failOffsetY([-SWIPE_FAIL_Y_PX, SWIPE_FAIL_Y_PX])
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if (e.translationX < -SWIPE_DISTANCE_PX || (flung && e.velocityX < 0)) {
        runOnJS(switchMode)("online");
      } else if (e.translationX > SWIPE_DISTANCE_PX || (flung && e.velocityX > 0)) {
        runOnJS(switchMode)("practice");
      }
    });

  // Mode-change slide: the new list slides in from the side of its tab (Practice left, Online right) and fades in.
  // Transform/opacity only -- a Reanimated `entering` layout animation used to live here, but it animates the view's
  // frame from a snapshot taken at mount, so when the list mounted before the safe-area inset / header height had
  // settled (first load, no cached data) it stayed stuck at that stale position, overlapping the header.
  const listOffset = useSharedValue(0);
  const listOpacity = useSharedValue(1);
  const isFirstModeRender = useRef(true);

  useEffect(() => {
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    listOffset.value = mode === "online" ? MODE_SLIDE_PX : -MODE_SLIDE_PX;
    listOpacity.value = 0;
    listOffset.value = withTiming(0, { duration: MODE_SLIDE_MS, easing: Easing.out(Easing.cubic) });
    listOpacity.value = withTiming(1, { duration: MODE_SLIDE_MS });
  }, [mode, listOffset, listOpacity]);

  const listSlideStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    transform: [{ translateX: listOffset.value }],
  }));

  // White status-bar text over the bg-primary header (a light system appearance would otherwise render it dark);
  // hand back whatever style was there when leaving the tab.
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, [])
  );

  // Solid bg-primary behind the white header content (greeting, donut, stats, mode tabs), then a short fade into
  // primary-50 across the filter row, so the white list cards always sit on light orange. Positioned from the
  // header's measured bottom edge rather than fixed percentages so the fade lands in the same place on every screen.
  const headerEnd = headerBottom || HEADER_FALLBACK_PX;
  const gradientHeight = headerEnd + HEADER_FADE_PX;
  const fade = easedFade(ICON_COLORS.primary500, ICON_COLORS.primary50, headerEnd / gradientHeight, HEADER_FADE_STOPS);

  return (
    <View className="flex-1" style={{ backgroundColor: ICON_COLORS.primary50 }}>
      <LinearGradient
        colors={fade.colors as [string, string, ...string[]]}
        locations={fade.locations as [number, number, ...number[]]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: gradientHeight }}
      />
      <SafeAreaView edges={["top"]} className="flex-1 w-full">

        <View
          className="w-full items-center px-[30px] pt-4 pb-3"
          onLayout={(e) => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
          <OfflineBanner />
          <StatisticButton mode={mode} />
          <View className="mt-4">
            <ModeSwitcher mode={mode} onModeChange={switchMode} />
          </View>
        </View>

        <View className="flex-1 justify-start items-center">
          <GestureDetector gesture={swipe}>
            <Animated.View key={mode} className="flex-1 w-full" style={listSlideStyle}>
              {mode === "practice" ? <PracticeList /> : <OnlineList />}
            </Animated.View>
          </GestureDetector>
        </View>
      </SafeAreaView>
    </View>
  );
}
