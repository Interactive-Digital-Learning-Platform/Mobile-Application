import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import Animated, { Extrapolation, interpolate, useAnimatedProps } from "react-native-reanimated";
import { ArrowLeft, ArrowRight, ArrowUp } from "lucide-react-native";
import { BiologyCanvasProps } from "@/types/lab";
import InteractiveBiologyElement from "../InteractiveBiologyElement";
import AnimatedFlowArrow from "../AnimatedFlowArrow";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const VB_W = 300;
const VB_H = 220;

// Stage order: 0 sunlight, 1 water via xylem, 2 CO2 via stomata, 3 reaction in chloroplast,
// 4 glucose produced, 5 oxygen released — timelinePosition runs continuously 0..6 across them.
// The static/pulsing scene (sun, leaf, chloroplast, stomata, xylem tube) stays SVG; matter that
// actually travels (water, CO2, O2) is a directional arrow overlay — see AnimatedFlowArrow.
export default function PhotosynthesisCanvas({ timelinePosition, activeComponentIds, showLabels, onTapComponent }: BiologyCanvasProps) {
  const sunRayProps = useAnimatedProps(() => ({
    opacity: interpolate(timelinePosition.value, [0, 1, 5, 6], [0.15, 1, 1, 0.35], Extrapolation.CLAMP),
  }));

  const chloroplastGlowProps = useAnimatedProps(() => ({
    opacity: interpolate(timelinePosition.value, [3, 3.5, 4], [0.35, 1, 0.6], Extrapolation.CLAMP),
    r: interpolate(timelinePosition.value, [3, 3.5, 4], [7, 11, 8], Extrapolation.CLAMP),
  }));

  const glucoseDotProps = useAnimatedProps(() => ({
    opacity: interpolate(timelinePosition.value, [4, 4.2, 5], [0, 1, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 items-center justify-center">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Circle cx={40} cy={30} r={16} fill="#F7C948" />
        <AnimatedLine x1={56} y1={40} x2={140} y2={90} stroke="#F7C948" strokeWidth={2} animatedProps={sunRayProps} />

        <Rect x={0} y={200} width={VB_W} height={20} fill="#C9A16A" />
        <Line x1={150} y1={200} x2={150} y2={95} stroke="#8D6E63" strokeWidth={4} />

        <Path d="M110 95 Q150 40 190 95 Q150 130 110 95 Z" fill="#8BC34A" stroke="#558B2F" strokeWidth={2} />
        <Circle cx={190} cy={95} r={4} fill="#33691E" />
        <AnimatedCircle cx={150} cy={95} r={7} fill="#33691E" animatedProps={chloroplastGlowProps} />
        <AnimatedCircle cx={150} cy={95} r={5} fill="#FBC02D" animatedProps={glucoseDotProps} />
      </Svg>

      <AnimatedFlowArrow
        Icon={ArrowUp}
        color="#2196F3"
        timelinePosition={timelinePosition}
        moveRange={[1, 2]}
        xRange={[50, 50]}
        yRange={[87, 43]}
      />
      <AnimatedFlowArrow
        Icon={ArrowLeft}
        color="#78909C"
        timelinePosition={timelinePosition}
        moveRange={[2, 3]}
        xRange={[90, 63]}
        yRange={[43, 43]}
      />
      <AnimatedFlowArrow
        Icon={ArrowRight}
        color="#EF5350"
        timelinePosition={timelinePosition}
        moveRange={[5, 6]}
        xRange={[63, 90]}
        yRange={[43, 43]}
      />

      <InteractiveBiologyElement
        xPct={50}
        yPct={43}
        label="Chloroplast"
        active={activeComponentIds.includes("chloroplast")}
        showLabel={showLabels}
        onPress={() => onTapComponent("chloroplast")}
      />
      <InteractiveBiologyElement
        xPct={63}
        yPct={43}
        label="Stomata"
        active={activeComponentIds.includes("stomata")}
        showLabel={showLabels}
        onPress={() => onTapComponent("stomata")}
      />
      <InteractiveBiologyElement
        xPct={50}
        yPct={80}
        label="Xylem"
        active={activeComponentIds.includes("xylem")}
        showLabel={showLabels}
        onPress={() => onTapComponent("xylem")}
      />
    </View>
  );
}
