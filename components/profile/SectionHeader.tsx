import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { C, profileStyles as styles } from "./profileTheme";

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
  color?: string;
  iconColor?: string;
  iconBg?: string;
  style?: object;
}

export default function SectionHeader({
  icon: Icon,
  label,
  color = "#1e293b",
  iconColor = C.p500,
  iconBg = C.p100,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 14 }, style]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
    </View>
  );
}
