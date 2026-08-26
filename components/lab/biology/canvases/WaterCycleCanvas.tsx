import { View } from "react-native";
import Svg, { Circle, Ellipse, Line, Rect } from "react-native-svg";
import Animated, { Extrapolation, interpolate, useAnimatedProps } from "react-native-reanimated";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { BiologyCanvasProps } from "@/types/lab";
import InteractiveBiologyElement from "../InteractiveBiologyElement";
import AnimatedFlowArrow from "../AnimatedFlowArrow";

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const VB_W = 300;
const VB_H = 220;

// Stage order: 0 sun heats ocean, 1 evaporation, 2 condensation, 3 precipitation, 4 collection,
// 5 cycle repeats — timelinePosition runs continuously 0..6 across them. Rising vapour/falling
// rain are directional arrow overlays (matching the reference sample video's evaporation
// animation); the ocean, sun and cloud stay static/pulsing SVG.
export default function WaterCycleCanvas({ timelinePosition, activeComponentIds, showLabels, onTapComponent }: BiologyCanvasProps) {
  const sunRayProps = useAnimatedProps(() => ({
    opacity: interpolate(timelinePosition.value, [0, 1, 4, 5, 6], [1, 0.3, 0.3, 1, 0.3], Extrapolation.CLAMP),
  }));

  const cloudProps = useAnimatedProps(() => ({
    rx: interpolate(timelinePosition.value, [1, 2, 3, 4], [18, 34, 34, 28], Extrapolation.CLAMP),
    opacity: interpolate(timelinePosition.value, [1, 2, 4], [0.35, 1, 0.85], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 items-center justify-center">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Circle cx={40} cy={30} r={16} fill="#F7C948" />
        <AnimatedLine x1={56} y1={40} x2={120} y2={100} stroke="#F7C948" strokeWidth={2} animatedProps={sunRayProps} />

        <AnimatedEllipse cx={190} cy={55} rx={18} ry={16} fill="#CFE3F7" stroke="#90B4D9" strokeWidth={1.5} animatedProps={cloudProps} />

        <Rect x={0} y={175} width={VB_W} height={45} fill="#4FA8F7" opacity={0.85} />
      </Svg>

      <AnimatedFlowArrow Icon={ArrowUp} color="#4FC3F7" timelinePosition={timelinePosition} moveRange={[1, 2]} xRange={[27, 27]} yRange={[82, 32]} />
      <AnimatedFlowArrow
        Icon={ArrowUp}
        color="#4FC3F7"
        timelinePosition={timelinePosition}
        moveRange={[1.15, 2]}
        xRange={[33, 33]}
        yRange={[82, 32]}
      />
      <AnimatedFlowArrow
        Icon={ArrowUp}
        color="#4FC3F7"
        timelinePosition={timelinePosition}
        moveRange={[1.3, 2]}
        xRange={[40, 40]}
        yRange={[82, 32]}
      />

      <AnimatedFlowArrow Icon={ArrowDown} color="#4FA8F7" timelinePosition={timelinePosition} moveRange={[3, 4]} xRange={[58, 58]} yRange={[35, 82]} />
      <AnimatedFlowArrow
        Icon={ArrowDown}
        color="#4FA8F7"
        timelinePosition={timelinePosition}
        moveRange={[3.15, 4]}
        xRange={[63, 63]}
        yRange={[35, 82]}
      />
      <AnimatedFlowArrow
        Icon={ArrowDown}
        color="#4FA8F7"
        timelinePosition={timelinePosition}
        moveRange={[3.3, 4]}
        xRange={[68, 68]}
        yRange={[35, 82]}
      />

      <InteractiveBiologyElement
        xPct={27}
        yPct={88}
        label="Ocean / Lake"
        active={activeComponentIds.includes("ocean")}
        showLabel={showLabels}
        onPress={() => onTapComponent("ocean")}
      />
      <InteractiveBiologyElement
        xPct={63}
        yPct={25}
        label="Cloud"
        active={activeComponentIds.includes("cloud")}
        showLabel={showLabels}
        onPress={() => onTapComponent("cloud")}
      />
    </View>
  );
}
