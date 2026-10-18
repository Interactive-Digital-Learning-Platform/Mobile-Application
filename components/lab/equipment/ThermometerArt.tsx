import Svg, { Rect, Circle, Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { THERMOMETER_MAX_TEMP, THERMOMETER_MIN_TEMP } from "@/constants/lab/probes.constants";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 16;
const VB_H = 60;
const TUBE_TOP = 6;
const TUBE_BOTTOM = 44;

export default function ThermometerArt({ size = 40, color = colors.primaryBlack, temperature }: EquipmentVisualProps) {
  const level = temperature != null ? Math.max(0.05, Math.min(1, (temperature - THERMOMETER_MIN_TEMP) / (THERMOMETER_MAX_TEMP - THERMOMETER_MIN_TEMP))) : 0.3;
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
