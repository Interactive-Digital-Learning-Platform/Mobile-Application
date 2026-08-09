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
