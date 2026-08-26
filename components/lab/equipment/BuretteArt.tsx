import { useId } from "react";
import Svg, { Rect, Line, Circle, Defs, ClipPath } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 26;
const VB_H = 64;
const TUBE_X = 10;
const TUBE_Y = 2;
const TUBE_W = 6;
const TUBE_H = 44;

export default function BuretteArt({ size = 40, color = colors.primaryBlack, liquidColor, fillLevel = 0 }: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * TUBE_H;
  // Each instance needs its own clip id — a hardcoded id collides across every dropper/pipette/
  // burette rendered on the bench at once, so the liquid rect can end up clipped by a completely
  // different equipment's (differently-scaled) clip shape instead of its own.
  const clipId = `burette-interior-${useId()}`;

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id={clipId}>
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
          clipPath={`url(#${clipId})`}
        />
      )}
      <Rect x={TUBE_X} y={TUBE_Y} width={TUBE_W} height={TUBE_H} stroke={color} strokeWidth={2.2} fill="none" />
      <Circle cx={13} cy={50} r={5} stroke={color} strokeWidth={2.2} fill="none" />
      <Line x1={5} y1={50} x2={21} y2={50} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x={11} y={55} width={4} height={7} stroke={color} strokeWidth={1.8} fill="none" />
      <Line x1={10} y1={12} x2={13} y2={12} stroke={color} strokeWidth={1.2} />
      <Line x1={10} y1={20} x2={13} y2={20} stroke={color} strokeWidth={1.2} />
      <Line x1={10} y1={28} x2={13} y2={28} stroke={color} strokeWidth={1.2} />
      <Line x1={10} y1={36} x2={13} y2={36} stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}
