import Svg, { Path, Line, Defs, ClipPath, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 44;
const VB_H = 52;
const OUTLINE_D = "M17 4 L17 17 L8 45 Q6 50 11 50 L33 50 Q38 50 36 45 L27 17 L27 4";
const TOP_Y = 4;
const BOTTOM_Y = 50;

export default function FlaskArt({ size = 40, color = colors.primaryBlack, liquidColor, fillLevel = 0 }: EquipmentVisualProps) {
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
      <Path d={OUTLINE_D} stroke={color} strokeWidth={2.5} strokeLinejoin="round" fill="none" />
      <Line x1={15} y1={4} x2={29} y2={4} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={12} y1={38} x2={17} y2={38} stroke={color} strokeWidth={1.5} />
      <Line x1={11} y1={43} x2={18} y2={43} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
