import { useId } from "react";
import Svg, { Path, Line, Defs, ClipPath } from "react-native-svg";
import { colors } from "@/constants/colors";
import { EquipmentVisualProps } from "@/types/lab";
import AnimatedLiquidRect from "./AnimatedLiquidRect";

const VB_W = 44;
const VB_H = 52;
const OUTLINE_D = "M9 6 L7 44 Q7 48 11 48 L33 48 Q37 48 37 44 L35 6";
const TOP_Y = 6; // rim — liquid never renders above this
const BOTTOM_Y = 48; // floor

export default function BeakerArt({
  size = 40,
  color = colors.primaryBlack,
  liquidColor,
  fillLevel = 0,
  liquidOpacity = 0.82,
  precipitateColor,
  cloudiness = 0,
}: EquipmentVisualProps) {
  const level = Math.max(0, Math.min(1, fillLevel));
  const liquidHeight = level * (BOTTOM_Y - TOP_Y);
  const clipId = `bk-interior-${useId()}`;

  return (
    <Svg height={size} width={(size * VB_W) / VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        {/* Reuses the outline path, closed across the open top rim — exactly the vessel's
            interior silhouette, so the liquid rect below can never render outside its shape. */}
        <ClipPath id={clipId}>
          <Path d={`${OUTLINE_D} Z`} />
        </ClipPath>
      </Defs>
      {liquidColor && level > 0 && (
        <AnimatedLiquidRect
          x={0}
          y={BOTTOM_Y - liquidHeight}
          width={VB_W}
          height={liquidHeight}
          color={liquidColor}
          opacity={liquidOpacity}
          clipPathId={clipId}
          precipitateColor={precipitateColor}
          cloudiness={cloudiness}
        />
      )}
      {liquidColor && level > 0 && (
        <Line x1={7} y1={BOTTOM_Y - liquidHeight} x2={37} y2={BOTTOM_Y - liquidHeight} stroke={color} strokeWidth={1} opacity={0.4} />
      )}
      <Path d={OUTLINE_D} stroke={color} strokeWidth={2.5} strokeLinejoin="round" fill="none" />
      <Line x1={9} y1={6} x2={16} y2={6} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={22} y1={6} x2={28} y2={6} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={34} y1={6} x2={35} y2={6} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={9} y1={30} x2={13} y2={30} stroke={color} strokeWidth={1.5} />
      <Line x1={8.5} y1={37} x2={13} y2={37} stroke={color} strokeWidth={1.5} />
      <Line x1={8} y1={44} x2={13} y2={44} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
