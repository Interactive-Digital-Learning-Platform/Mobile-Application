import { Text, View } from "react-native";
import { LucideIcon } from "lucide-react-native";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

const TONE_STYLES: Record<BadgeTone, { bg: string; text: string; iconColor: string }> = {
  neutral: { bg: "bg-bg-soft", text: "text-ink", iconColor: "#0F172A" },
  primary: { bg: "bg-primary/10", text: "text-primary", iconColor: "#FC6E20" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", iconColor: "#059669" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", iconColor: "#B45309" },
  danger: { bg: "bg-red-50", text: "text-red-700", iconColor: "#B91C1C" },
};

type BadgeProps = {
  label: string;
  icon?: LucideIcon;
  tone?: BadgeTone;
  // Escape hatch for backend-provided colors (e.g. per-experiment difficulty color) that don't
  // map to a fixed semantic tone.
  color?: string;
};

export default function Badge({ label, icon: Icon, tone = "neutral", color }: BadgeProps) {
  const { bg, text, iconColor } = TONE_STYLES[tone];

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${color ? "" : bg}`}
      style={color ? { backgroundColor: `${color}22` } : undefined}
    >
      {Icon && <Icon size={12} color={color ?? iconColor} />}
      <Text className={`text-xs font-amedium ${color ? "" : text}`} style={color ? { color } : undefined}>
        {label}
      </Text>
    </View>
  );
}
