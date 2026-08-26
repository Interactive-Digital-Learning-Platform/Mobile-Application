import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 30;
const VB_H = 40;

export default function SlottedMassArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Path d="M13 2 Q15 2 15 6 L15 10" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Rect x={6} y={10} width={18} height={22} rx={2} stroke={color} strokeWidth={2.2} fill="none" />
      <Rect x={13} y={16} width={4} height={10} stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}
