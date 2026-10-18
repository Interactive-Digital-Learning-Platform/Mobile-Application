import Svg, { Line, Polyline } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 60;
const VB_H = 24;

export default function ResistorArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Line x1={0} y1={12} x2={12} y2={12} stroke={color} strokeWidth={2} />
      <Polyline
        points="12,12 17,4 23,20 29,4 35,20 41,4 47,20 48,12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Line x1={48} y1={12} x2={60} y2={12} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
