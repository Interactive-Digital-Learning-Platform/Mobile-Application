import Svg, { Circle, Rect, Path, Defs, ClipPath } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 20;
const VB_H = 56;
const TUBE_X = 8;
const TUBE_Y = 18;
const TUBE_W = 4;
const TUBE_H = 28;

export default function DropperArt({ size = 40, color = colors.primaryBlack, liquidColor, fillLevel = 0 }: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * TUBE_H;

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id="interior">
          <Rect x={TUBE_X} y={TUBE_Y} width={TUBE_W} height={TUBE_H} />
        </ClipPath>
      </Defs>
      {liquidColor && level > 0 && (
        <Rect
          x={TUBE_X}
          y={TUBE_Y + TUBE_H - liquidHeight}
          width={TUBE_W}
          height={liquidHeight}
          fill={liquidColor}
          opacity={0.8}
          clipPath="url(#interior)"
        />
      )}
      <Circle cx={10} cy={10} r={8} stroke={color} strokeWidth={2.5} fill="none" />
      <Rect x={TUBE_X} y={TUBE_Y} width={TUBE_W} height={TUBE_H} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M8 46 L12 46 L10 53 Z" fill={color} />
    </Svg>
  );
}
