import { ReactNode } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const PADDING_STYLES = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  padding?: keyof typeof PADDING_STYLES;
  variant?: "default" | "outline";
  className?: string;
  style?: StyleProp<ViewStyle>;
  // Fires a soft selection haptic on press-in — same iOS-only pattern as components/haptic-tab.tsx.
  haptic?: boolean;
};

export default function Card({
  children,
  onPress,
  selected = false,
  disabled = false,
  padding = "md",
  variant = "default",
  className = "",
  style,
  haptic = false,
}: CardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = `rounded-2xl ${PADDING_STYLES[padding]} ${
    variant === "outline" ? "bg-surface border border-border" : "bg-surface shadow-sm"
  } ${selected ? "border-2 border-emerald-500 shadow-emerald-500/30" : ""} ${disabled ? "opacity-50" : ""} ${className}`;

  if (!onPress) {
    return (
      <View className={base} style={style}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (haptic && process.env.EXPO_OS === "ios") {
          Haptics.selectionAsync();
        }
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      className={base}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
