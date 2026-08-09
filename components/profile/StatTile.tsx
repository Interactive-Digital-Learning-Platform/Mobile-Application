import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { profileStyles as styles } from "./profileTheme";

interface StatTileProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  flex?: number;
}

export default function StatTile({
  icon: Icon, iconColor, iconBg, label, value, flex = 1,
}: StatTileProps) {
  return (
    <View style={[styles.card, { flex, alignItems: "center", paddingVertical: 14 }]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg, width: 40, height: 40, borderRadius: 20 }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={{ color: "#1e293b", fontWeight: "900", fontSize: 16, marginTop: 6 }}>{value}</Text>
      <Text
        style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
