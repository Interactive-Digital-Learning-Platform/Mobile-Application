import Svg, { Line, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 60;
const VB_H = 20;

export default function RulerArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={2} y={4} width={56} height={12} rx={1.5} stroke={color} strokeWidth={2} fill="none" />
      {[8, 14, 20, 26, 32, 38, 44, 50].map((x, i) => (
        <Line key={x} x1={x} y1={4} x2={x} y2={i % 2 === 0 ? 10 : 8} stroke={color} strokeWidth={1.2} />
      ))}
    </Svg>
  );
}
