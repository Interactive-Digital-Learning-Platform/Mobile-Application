/**
 * SectionHeader.tsx
 * ─────────────────────────────────────────────────────────
 * Icon badge + uppercase label row used at the top of every Profile
 * analytics card (matches the existing "Subject Accuracy & Difficulty" /
 * "AI Feedback" header pattern) — extracted so new sections don't
 * re-declare the same row.
 *
 * Usage:
 *   <SectionHeader icon={BarChart2} label="Topic Performance" />
 *   <SectionHeader icon={TrendingDown} label="Needs Work" color="#DC2626" iconBg="#FFE4E6" />
 */
import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { C, profileStyles as styles } from "./profileTheme";

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
  /** Label text color (default matches the existing dark-slate header text). */
  color?: string;
  /** Icon color (defaults to the primary orange). */
  iconColor?: string;
  /** Icon badge background (defaults to the light orange tint). */
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
