import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const SeverityBadge = ({ severity }: { severity: "high" | "medium" | "low" }) => {
  const config = {
    high: { label: "High Gap", bg: "#FEE2E2", text: "#DC2626", icon: "🔴" },
    medium: { label: "Medium Gap", bg: "#FEF3C7", text: "#D97706", icon: "🟡" },
    low: { label: "Low Gap", bg: "#DCFCE7", text: "#16A34A", icon: "🟢" },
  };
  const s = config[severity];
  return (
    <View style={[styles.severityBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.severityText, { color: s.text }]}>
        {s.icon} {s.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default SeverityBadge;
