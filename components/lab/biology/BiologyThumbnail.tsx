import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Leaf } from "lucide-react-native";

function WaterCycleThumbnail() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 150">
      <Defs>
        <SvgLinearGradient id="waterSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#DFF2FF" />
          <Stop offset="1" stopColor="#9DD8FF" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="120" height="150" rx="20" fill="url(#waterSky)" />
      <Circle cx="25" cy="26" r="12" fill="#FFD65A" />
      <Ellipse cx="78" cy="34" rx="18" ry="9" fill="#FFFFFF" opacity="0.92" />
      <Ellipse cx="92" cy="38" rx="15" ry="8" fill="#FFFFFF" opacity="0.9" />
      <Path d="M0 91 L27 55 L51 88 L73 66 L101 96 L120 78 L120 118 L0 118 Z" fill="#77B8DE" />
      <Path d="M0 103 L29 76 L48 99 L70 84 L96 107 L120 96 L120 122 L0 122 Z" fill="#559AC5" />
      <Rect y="111" width="120" height="39" fill="#43A8EC" />
      <Path d="M6 130 C27 119 42 140 64 128 C82 119 99 135 118 124" stroke="#BDEAFF" strokeWidth="3" fill="none" />
      <Path d="M66 110 C64 92 66 83 73 72 M73 78 L68 84 M73 78 L78 84" stroke="#1976D2" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M86 110 C84 92 86 83 93 72 M93 78 L88 84 M93 78 L98 84" stroke="#1976D2" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function PhotosynthesisThumbnail() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 150">
      <Defs>
        <SvgLinearGradient id="leafBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F1FAD7" />
          <Stop offset="1" stopColor="#DDF2BB" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="120" height="150" rx="20" fill="url(#leafBg)" />
      <Circle cx="23" cy="24" r="10" fill="#FFC928" />
      {[0, 45, 90, 135].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return <Line key={deg} x1={23 + Math.cos(rad) * 14} y1={24 + Math.sin(rad) * 14} x2={23 + Math.cos(rad) * 19} y2={24 + Math.sin(rad) * 19} stroke="#FFC928" strokeWidth="2" />;
      })}
      <Path d="M28 95 C36 46 76 29 101 36 C98 74 75 104 36 103 Z" fill="#76B947" stroke="#3B7F28" strokeWidth="3" />
      <Path d="M33 103 C50 79 67 63 93 43" stroke="#3B7F28" strokeWidth="3" fill="none" />
      <Path d="M50 82 L46 62 M63 70 L81 68 M72 58 L69 45" stroke="#4B9136" strokeWidth="2" fill="none" />
      <Circle cx="28" cy="121" r="14" fill="#CBD5E1" />
      <SvgText x="28" y="125" fontSize="11" fontWeight="700" fill="#475569" textAnchor="middle">CO₂</SvgText>
      <Circle cx="91" cy="119" r="14" fill="#3194E8" />
      <SvgText x="91" y="123" fontSize="11" fontWeight="700" fill="#FFFFFF" textAnchor="middle">O₂</SvgText>
      <Path d="M40 111 C48 104 51 101 52 93" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
      <Path d="M78 95 C81 104 84 107 87 109" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
    </Svg>
  );
}

function GasExchangeThumbnail() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 150">
      <Defs>
        <SvgLinearGradient id="lungBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF2F4" />
          <Stop offset="1" stopColor="#FFE0E6" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="120" height="150" rx="20" fill="url(#lungBg)" />
      <Rect x="56" y="18" width="8" height="46" rx="4" fill="#EE6D83" />
      <Line x1="60" y1="58" x2="43" y2="77" stroke="#D94A66" strokeWidth="5" strokeLinecap="round" />
      <Line x1="60" y1="58" x2="77" y2="77" stroke="#D94A66" strokeWidth="5" strokeLinecap="round" />
      <Path d="M48 63 C27 62 17 82 19 113 C21 132 40 132 52 119 L56 78 Z" fill="#F08BA0" stroke="#D94A66" strokeWidth="2" />
      <Path d="M72 63 C93 62 103 82 101 113 C99 132 80 132 68 119 L64 78 Z" fill="#F08BA0" stroke="#D94A66" strokeWidth="2" />
      <Path d="M43 77 L34 93 M43 78 L48 99 M77 77 L86 93 M77 78 L72 99" stroke="#D94A66" strokeWidth="2" strokeLinecap="round" />
      <SvgText x="15" y="58" fontSize="13" fontWeight="800" fill="#1976D2">O₂</SvgText>
      <SvgText x="87" y="58" fontSize="12" fontWeight="800" fill="#E11D48">CO₂</SvgText>
      <Path d="M30 62 L40 70" stroke="#1976D2" strokeWidth="2.5" />
      <Path d="M82 70 L91 62" stroke="#E11D48" strokeWidth="2.5" />
    </Svg>
  );
}

export default function BiologyThumbnail({ animationKey, color }: { animationKey: string; color: string }) {
  if (animationKey === "water_cycle") return <WaterCycleThumbnail />;
  if (animationKey === "photosynthesis") return <PhotosynthesisThumbnail />;
  if (animationKey === "gas_exchange") return <GasExchangeThumbnail />;

  return (
    <View className="h-full w-full items-center justify-center rounded-[20px]" style={{ backgroundColor: `${color}1F` }}>
      <Leaf size={42} color={color} strokeWidth={1.8} />
    </View>
  );
}
