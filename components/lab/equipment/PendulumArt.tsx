import Svg, { Circle, Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 50;

export default function PendulumArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Line x1={6} y1={4} x2={34} y2={4} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={20} y1={4} x2={20} y2={38} stroke={color} strokeWidth={1.5} />
      <Circle cx={20} cy={44} r={6} stroke={color} strokeWidth={2.2} fill="none" />
    </Svg>
  );
}
