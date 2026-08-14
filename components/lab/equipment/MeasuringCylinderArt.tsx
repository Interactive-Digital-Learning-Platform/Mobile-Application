import Svg, { Rect, Line, Path, Defs, ClipPath } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "./types";

const VB_W = 30;
const VB_H = 60;
const BODY_X = 9;
const BODY_Y = 4;
const BODY_W = 12;
const BODY_H = 44;

export default function MeasuringCylinderArt({
  size = 40,
  color = colors.primaryBlack,
  liquidColor,
  fillLevel = 0,
}: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * BODY_H;

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id="interior">
          <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} />
        </ClipPath>
      </Defs>
      {liquidColor && level > 0 && (
        <Rect
          x={BODY_X}
          y={BODY_Y + BODY_H - liquidHeight}
          width={BODY_W}
          height={liquidHeight}
          fill={liquidColor}
          opacity={0.8}
          clipPath="url(#interior)"
        />
      )}
      <Path d="M9 4 L7 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} rx={1} stroke={color} strokeWidth={2.5} fill="none" />
      <Rect x={5} y={48} width={20} height={7} rx={2} stroke={color} strokeWidth={2.5} fill="none" />
      <Line x1={9} y1={14} x2={12} y2={14} stroke={color} strokeWidth={1.3} />
      <Line x1={9} y1={22} x2={12} y2={22} stroke={color} strokeWidth={1.3} />
      <Line x1={9} y1={30} x2={12} y2={30} stroke={color} strokeWidth={1.3} />
      <Line x1={9} y1={38} x2={12} y2={38} stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}
