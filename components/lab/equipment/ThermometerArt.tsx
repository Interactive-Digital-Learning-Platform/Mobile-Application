import Svg, { Rect, Circle, Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "./types";

const VB_W = 16;
const VB_H = 60;
const TUBE_TOP = 6;
const TUBE_BOTTOM = 44;
// Backend clamps: room temp is 25°C, heating jumps to at least 80°C (labRun.controller.js) — so
// this range comfortably spans "cold" through "actively boiling" without needing a wider scale.
const MIN_TEMP = 20;
const MAX_TEMP = 100;

export default function ThermometerArt({ size = 40, color = colors.primaryBlack, temperature }: EquipmentVisualProps) {
  const level = temperature != null ? Math.max(0.05, Math.min(1, (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP))) : 0.3;
  const mercuryHeight = level * (TUBE_BOTTOM - TUBE_TOP);
  const mercuryColor = temperature != null && temperature >= 55 ? colors.primary : "#4F86C6";

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={6} y={2} width={4} height={44} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={7} y={TUBE_BOTTOM - mercuryHeight} width={2} height={mercuryHeight} fill={mercuryColor} />
      <Circle cx={8} cy={50} r={7} stroke={color} strokeWidth={2} fill={mercuryColor} />
      <Line x1={11} y1={10} x2={13} y2={10} stroke={color} strokeWidth={1.2} />
      <Line x1={11} y1={18} x2={13} y2={18} stroke={color} strokeWidth={1.2} />
      <Line x1={11} y1={26} x2={13} y2={26} stroke={color} strokeWidth={1.2} />
      <Line x1={11} y1={34} x2={13} y2={34} stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}
