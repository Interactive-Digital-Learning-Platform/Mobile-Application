import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";

const VB_W = 40;
const VB_H = 40;

export default function VoltmeterArt({ size = 40, color = colors.primaryBlack }: EquipmentVisualProps) {
  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Circle cx={20} cy={20} r={17} stroke={color} strokeWidth={2.2} fill="none" />
      <SvgText x={20} y={26} fontSize={16} fontWeight="600" fill={color} textAnchor="middle">
        V
      </SvgText>
      <Line x1={2} y1={20} x2={8} y2={20} stroke={color} strokeWidth={2} />
      <Line x1={32} y1={20} x2={38} y2={20} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
