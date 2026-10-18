import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import Animated, { Extrapolation, interpolate, useAnimatedProps } from "react-native-reanimated";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react-native";
import { BiologyCanvasProps } from "@/types/lab";
import InteractiveBiologyElement from "../InteractiveBiologyElement";
import AnimatedFlowArrow from "../AnimatedFlowArrow";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VB_W = 300;
const VB_H = 220;

// Stage order: 0 air enters airway, 1 air reaches alveoli, 2 oxygen into blood,
// 3 carbon dioxide into alveolus, 4 carbon dioxide exhaled — timelinePosition runs
// continuously 0..5 across them. Air/gas movement is a directional arrow overlay; the trachea,
// alveolus (pulsing) and capillary stay static/pulsing SVG.
export default function GasExchangeCanvas({ timelinePosition, activeComponentIds, showLabels, onTapComponent }: BiologyCanvasProps) {
  const alveolusPulseProps = useAnimatedProps(() => ({
    r: interpolate(timelinePosition.value, [1, 1.5, 2], [16, 20, 18], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 items-center justify-center">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Rect x={140} y={10} width={20} height={100} rx={8} fill="#E3E1E1" stroke="#B9C4CE" strokeWidth={1.5} />

        <Path d="M170 90 Q200 100 200 130 Q200 155 178 150" stroke="#EF5350" strokeWidth={4} fill="none" strokeLinecap="round" />

        <AnimatedCircle cx={150} cy={130} r={18} fill="#F7C9C4" stroke="#EF5350" strokeWidth={2} animatedProps={alveolusPulseProps} />
      </Svg>

      <AnimatedFlowArrow Icon={ArrowDown} color="#90A4AE" timelinePosition={timelinePosition} moveRange={[0, 1]} xRange={[50, 50]} yRange={[9, 54]} />
      <AnimatedFlowArrow
        Icon={ArrowRight}
        color="#EF5350"
        timelinePosition={timelinePosition}
        moveRange={[2, 3]}
        xRange={[47, 65]}
        yRange={[59, 59]}
      />
      <AnimatedFlowArrow
        Icon={ArrowLeft}
        color="#5B8DEF"
        timelinePosition={timelinePosition}
        moveRange={[3, 4]}
        xRange={[65, 47]}
        yRange={[65, 65]}
      />
      <AnimatedFlowArrow Icon={ArrowUp} color="#90A4AE" timelinePosition={timelinePosition} moveRange={[4, 5]} xRange={[50, 50]} yRange={[54, 9]} />

      <InteractiveBiologyElement
        xPct={50}
        yPct={25}
        label="Trachea"
        active={activeComponentIds.includes("trachea")}
        showLabel={showLabels}
        onPress={() => onTapComponent("trachea")}
      />
      <InteractiveBiologyElement
        xPct={50}
        yPct={59}
        label="Alveolus"
        active={activeComponentIds.includes("alveolus")}
        showLabel={showLabels}
        onPress={() => onTapComponent("alveolus")}
      />
      <InteractiveBiologyElement
        xPct={68}
        yPct={59}
        label="Capillary"
        active={activeComponentIds.includes("capillary")}
        showLabel={showLabels}
        onPress={() => onTapComponent("capillary")}
      />
    </View>
  );
}
