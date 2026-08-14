import Svg, { Rect, Circle, Path } from "react-native-svg";
import Animated, { SharedValue, useAnimatedProps } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "./types";

const VB_W = 40;
const VB_H = 70;

export type PhMeterLedState = "idle" | "in_liquid" | "measuring" | "complete";

const LED_COLOR: Record<PhMeterLedState, string> = {
  idle: "#B0B0B8",
  in_liquid: "#4F86C6",
  measuring: colors.primary,
  complete: "#10B981", // emerald-500 — matches the app-wide "correct/complete" accent
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = EquipmentVisualProps & {
  ledState?: PhMeterLedState;
  // Shares PhMeterInstrument's own pulse shared value (already driven while measuring) so the LED
  // pulses in lockstep with the readout text instead of needing a second, separately-timed pulse.
  pulseValue?: SharedValue<number>;
};

// The one equipment art component that isn't purely static — its LED reflects the probe's live
// state (see PhMeterInstrument.tsx). The numeric readout itself is NOT drawn here; it's a plain
// RN <Text> layered on top by PhMeterInstrument, to avoid react-native-svg's text-rendering quirks.
export default function PhMeterArt({ size = 40, color = colors.primaryBlack, ledState = "idle", pulseValue }: Props) {
  const animatedProps = useAnimatedProps(() => ({ opacity: pulseValue ? pulseValue.value : 1 }));

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={6} y={2} width={28} height={40} rx={6} stroke={color} strokeWidth={2.2} fill="none" />
      <Rect x={10} y={8} width={20} height={14} rx={2} stroke={color} strokeWidth={1.8} fill="none" />
      <AnimatedCircle cx={30} cy={30} r={2.6} fill={LED_COLOR[ledState]} animatedProps={animatedProps} />
      <Rect x={17} y={42} width={6} height={20} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M17 62 L23 62 L20 70 Z" fill={color} />
    </Svg>
  );
}
