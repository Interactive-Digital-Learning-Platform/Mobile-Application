import Svg, { Line, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 60;

export default function RetortStandArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={6} y={54} width={28} height={4} rx={1.5} stroke={color} strokeWidth={2} fill="none" />
      <Line x1={12} y1={54} x2={12} y2={6} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={12} y1={16} x2={32} y2={16} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x={26} y={13} width={8} height={6} rx={1.5} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}
