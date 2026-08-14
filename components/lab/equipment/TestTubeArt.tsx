import Svg, { Path, Ellipse, Line, Defs, ClipPath, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "./types";

const VB_W = 24;
const VB_H = 60;
const OUTLINE_D = "M6 4 L6 42 Q6 50 12 50 Q18 50 18 42 L18 4";
const TOP_Y = 4;
const BOTTOM_Y = 50;

export default function TestTubeArt({ size = 40, color = colors.primaryBlack, liquidColor, fillLevel = 0 }: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * (BOTTOM_Y - TOP_Y);

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id="interior">
          <Path d={`${OUTLINE_D} Z`} />
        </ClipPath>
      </Defs>
      {liquidColor && level > 0 && (
        <Rect
          x={0}
          y={BOTTOM_Y - liquidHeight}
          width={VB_W}
          height={liquidHeight}
          fill={liquidColor}
          opacity={0.8}
          clipPath="url(#interior)"
        />
      )}
      <Path d={OUTLINE_D} stroke={color} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Ellipse cx={12} cy={4} rx={6} ry={1.8} stroke={color} strokeWidth={2} fill="none" />
      <Line x1={6} y1={30} x2={9} y2={30} stroke={color} strokeWidth={1.3} />
      <Line x1={6} y1={37} x2={9} y2={37} stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}
