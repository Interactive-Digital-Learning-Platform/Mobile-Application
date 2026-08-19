import Svg, { Circle, Path, Defs, ClipPath, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 18;
const VB_H = 56;
const OUTLINE_D = "M6 14 L12 14 L10 50 L8 50 Z";
const TOP_Y = 14;
const BOTTOM_Y = 50;

export default function PipetteArt({ size = 40, color = colors.primaryBlack, liquidColor, fillLevel = 0 }: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * (BOTTOM_Y - TOP_Y);

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id="interior">
          <Path d={OUTLINE_D} />
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
      <Circle cx={9} cy={8} r={6} stroke={color} strokeWidth={2.2} fill="none" />
      <Path d={OUTLINE_D} stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
