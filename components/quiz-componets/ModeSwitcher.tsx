import React, { useCallback, useEffect } from "react";
import { TouchableOpacity, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { ICON_COLORS } from "@/constants/quizStyles";

export type QuizMode = "practice" | "online";

interface ModeSwitcherProps {
  mode: QuizMode;
  onModeChange: (mode: QuizMode) => void;
}

const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };
const UNDERLINE_HEIGHT = 3;
const INACTIVE_TAB_COLOR = "rgba(255,255,255,0.65)";

// Compact underline tabs, styled for the bg-primary header (white active tab + underline, translucent white inactive).
// The parent can also change `mode` itself (swipe on the list, or a ?mode= route param),
// so the underline follows the `mode` prop rather than only reacting to taps here.
export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  const progress = useSharedValue(mode === "online" ? 1 : 0);
  const practiceX = useSharedValue(0);
  const practiceW = useSharedValue(0);
  const onlineX = useSharedValue(0);
  const onlineW = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(mode === "online" ? 1 : 0, SPRING_CONFIG);
  }, [mode, progress]);

  const handlePress = useCallback(
    (selected: QuizMode) => {
      if (selected !== mode) onModeChange(selected);
    },
    [mode, onModeChange]
  );

  const onPracticeLayout = useCallback((e: LayoutChangeEvent) => {
    practiceX.value = e.nativeEvent.layout.x;
    practiceW.value = e.nativeEvent.layout.width;
  }, [practiceX, practiceW]);

  const onOnlineLayout = useCallback((e: LayoutChangeEvent) => {
    onlineX.value = e.nativeEvent.layout.x;
    onlineW.value = e.nativeEvent.layout.width;
  }, [onlineX, onlineW]);

  const underlineStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [practiceW.value, onlineW.value]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [practiceX.value, onlineX.value]) }],
  }));

  const practiceTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [ICON_COLORS.white, INACTIVE_TAB_COLOR]),
  }));

  const onlineTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [INACTIVE_TAB_COLOR, ICON_COLORS.white]),
  }));

  return (
    <View className="items-center">
      <View className="flex-row gap-8 relative pb-1.5" accessibilityRole="tablist">
        <TouchableOpacity
          onLayout={onPracticeLayout}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          onPress={() => handlePress("practice")}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "practice" }}
        >
          <Animated.Text className="text-[15px] font-bold" style={practiceTextStyle}>
            Practice
          </Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity
          onLayout={onOnlineLayout}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          onPress={() => handlePress("online")}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "online" }}
        >
          <Animated.Text className="text-[15px] font-bold" style={onlineTextStyle}>
            Online 1v1
          </Animated.Text>
        </TouchableOpacity>

        <Animated.View
          className="absolute bottom-0 left-0 rounded-full bg-white"
          style={[{ height: UNDERLINE_HEIGHT }, underlineStyle]}
        />
      </View>
    </View>
  );
}
