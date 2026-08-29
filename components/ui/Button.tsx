import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LucideIcon } from "lucide-react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
export type ButtonSize = "md" | "lg";

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string; iconColor?: string }> = {
  primary: { bg: "bg-primary", text: "text-white" },
  secondary: { bg: "bg-ink", text: "text-white" },
  ghost: { bg: "bg-transparent border border-border", text: "text-ink" },
  success: { bg: "bg-emerald-500", text: "text-white" },
  danger: { bg: "bg-transparent border border-red-300", text: "text-red-600", iconColor: "#DC2626" },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; text: string }> = {
  md: { padding: "py-3 px-5", text: "text-base" },
  lg: { padding: "py-4 px-6", text: "text-lg" },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = "left",
  fullWidth = true,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;
  const { bg, text, border, iconColor: variantIconColor } = VARIANT_STYLES[variant];
  const { padding, text: textSize } = SIZE_STYLES[size];
  const iconColor = variantIconColor ?? (text === "text-white" ? "white" : "#0F172A");

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      className={`${fullWidth ? "w-full" : "self-start"} ${bg} ${border ?? ""} ${padding} rounded-xl flex-row items-center justify-center gap-2 ${
        isDisabled ? "opacity-50" : ""
      }`}
      style={animatedStyle}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon size={18} color={iconColor} />}
          <Text className={`${text} ${textSize} font-amedium`}>{label}</Text>
          {Icon && iconPosition === "right" && <Icon size={18} color={iconColor} />}
        </>
      )}
    </AnimatedPressable>
  );
}
