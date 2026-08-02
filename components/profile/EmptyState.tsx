/**
 * EmptyState.tsx
 * ─────────────────────────────────────────────────────────
 * Small inline "not enough data yet" placeholder for a single Profile
 * analytics section — distinct from the full-screen ErrorState in
 * app/(tabs)/profile/index.tsx, which is for the whole analytics request
 * failing. This is for when the request succeeds but a specific section
 * (trend, growth, topics, recommendations...) has too little data to show
 * anything meaningful yet (e.g. performance_trend.trend === "insufficient_data").
 *
 * Usage:
 *   <EmptyState icon={TrendingUp} message="Complete a few more quizzes to see your trend." />
 */
import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { C } from "./profileTheme";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export default function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 20, paddingHorizontal: 12 }}>
      <Icon size={22} color={C.p300} strokeWidth={1.8} />
      <Text style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 17 }}>
        {message}
      </Text>
    </View>
  );
}
