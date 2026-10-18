import Svg, { Line, Circle } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 40;

export default function StirrerArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Line x1={8} y1={32} x2={32} y2={8} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={8} cy={32} r={3} fill={color} />
      <Circle cx={32} cy={8} r={3} fill={color} />
    </Svg>
  );
}
