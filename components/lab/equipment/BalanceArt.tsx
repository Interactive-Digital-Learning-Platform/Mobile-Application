import Svg, { Rect, Circle, Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 50;
const VB_H = 40;

export default function BalanceArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Circle cx={25} cy={11} r={9} stroke={color} strokeWidth={2.2} fill="none" />
      <Line x1={25} y1={11} x2={25} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={25} y1={11} x2={29} y2={9} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={8} y={22} width={34} height={5} rx={2} stroke={color} strokeWidth={2.2} fill="none" />
      <Rect x={22} y={27} width={6} height={7} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={6} y={34} width={38} height={5} rx={2} stroke={color} strokeWidth={2.2} fill="none" />
    </Svg>
  );
}
