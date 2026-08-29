import Svg, { Circle, Line, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 44;

export default function StopwatchArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={16} y={2} width={8} height={4} rx={1.5} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={20} cy={24} r={16} stroke={color} strokeWidth={2.2} fill="none" />
      <Line x1={20} y1={24} x2={20} y2={14} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={20} y1={24} x2={27} y2={27} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
