import Svg, { Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 30;

// The board's fixed battery symbol — not a placeable equipment item (a real circuit always needs
// one, so there's no pedagogical value in making the student drag it into place). Used directly by
// CircuitBoard.tsx, not registered in the equipment catalog.
export default function BatteryArt({ size = 30, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Line x1={0} y1={15} x2={14} y2={15} stroke={color} strokeWidth={2} />
      <Line x1={14} y1={4} x2={14} y2={26} stroke={color} strokeWidth={3} />
      <Line x1={22} y1={9} x2={22} y2={21} stroke={color} strokeWidth={1.5} />
      <Line x1={22} y1={15} x2={40} y2={15} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
