import { useEffect } from "react";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 36;
const VB_H = 56;
const FLAME_D = "M18 2 C13 10 10 16 14 21 C15 23 21 23 22 21 C26 16 23 10 18 2 Z";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The flame only renders lit (orange, gently flickering) when `on` — previously it painted
// unconditionally regardless of the burner's actual heated state. When off it draws as a faint
// unlit outline so the shape still reads as "a burner" rather than disappearing entirely.
export default function BurnerArt({ size = 40, color = colors.primaryBlack, on = false }: EquipmentVisualProps) {
  const flicker = useSharedValue(1);

  useEffect(() => {
    flicker.value = on ? withRepeat(withTiming(0.75, { duration: 350 }), -1, true) : withTiming(1, { duration: 150 });
  }, [on, flicker]);

  const animatedProps = useAnimatedProps(() => ({ opacity: flicker.value }));

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={4} y={48} width={28} height={6} rx={2} stroke={color} strokeWidth={2.2} fill="none" />
      <Rect x={14} y={16} width={8} height={32} stroke={color} strokeWidth={2.2} fill="none" />
      <Circle cx={14} cy={28} r={1.4} fill={color} />
      <Circle cx={22} cy={28} r={1.4} fill={color} />
      <Circle cx={14} cy={36} r={1.4} fill={color} />
      <Circle cx={22} cy={36} r={1.4} fill={color} />
      {on ? (
        <AnimatedPath d={FLAME_D} fill={colors.primary} animatedProps={animatedProps} />
      ) : (
        <Path d={FLAME_D} fill="none" stroke={colors.borderColorLight} strokeWidth={1.5} />
      )}
    </Svg>
  );
}
