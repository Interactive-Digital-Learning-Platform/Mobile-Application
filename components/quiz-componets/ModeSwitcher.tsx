import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

const TRACK_PADDING = 4;
const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };

export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  const trackWidthSV = useSharedValue(0);
  const progress = useSharedValue(mode === "online" ? 1 : 0);

  const onTrackLayout = useCallback((e: any) => {
    trackWidthSV.value = e.nativeEvent.layout.width;
  }, [trackWidthSV]);

  const handlePress = useCallback(
    (selected: QuizMode) => {
      if (selected === mode) return;
      progress.value = withSpring(selected === "online" ? 1 : 0, SPRING_CONFIG);
      onModeChange(selected);
    },
    [mode, onModeChange, progress]
  );

  const thumbTranslateStyle = useAnimatedStyle(() => {
    const thumbWidth = (trackWidthSV.value - TRACK_PADDING * 2) / 2;
    return {
      transform: [{ translateX: interpolate(progress.value, [0, 1], [0, thumbWidth]) }],
    };
  });

  const thumbColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [ICON_COLORS.primary500, ICON_COLORS.primary500]),
    shadowColor: interpolateColor(progress.value, [0, 1], [ICON_COLORS.primary500, ICON_COLORS.primary500]),
  }));

  const practiceTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [ICON_COLORS.white, ICON_COLORS.slate400]),
  }));

  const onlineTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [ICON_COLORS.slate400, ICON_COLORS.white]),
  }));

  const badgeColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [ICON_COLORS.primary500, ICON_COLORS.blue500]),
  }));

  return (
    <View className="items-center gap-[14px]">
      <View
        className="flex-row w-[90%] h-14 p-1 rounded-[28px] bg-slate-100 overflow-hidden relative shadow shadow-black/10"
        onLayout={onTrackLayout}
      >
        <Animated.View
          className="absolute top-1 left-1 w-[50%] h-12 rounded-[24px] shadow-md"
          style={[thumbColorStyle, thumbTranslateStyle]}
        />

        <TouchableOpacity className="flex-1 flex-row justify-center items-center gap-[6px] z-10" activeOpacity={0.85} onPress={() => handlePress("practice")}>
          <Animated.Text className="text-[15px] font-bold " style={practiceTextStyle}>
            Practice
          </Animated.Text>  
        </TouchableOpacity>

        <TouchableOpacity className="flex-1 flex-row justify-center items-center gap-[6px] z-10" activeOpacity={0.85} onPress={() => handlePress("online")}>
          <Animated.Text className="text-[15px] font-bold " style={onlineTextStyle}>
            Online 1v1
          </Animated.Text>
        </TouchableOpacity>
      </View>

      
    </View>
  );
}
