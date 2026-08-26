import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const SeverityBadge = ({ severity }: { severity: "high" | "medium" | "low" }) => {
  const config = {
    high: { label: "High Priority", bg: "#FEE2E2", text: "#DC2626", border: "#FECACA", icon: "🔴" },
    medium: { label: "Needs Attention", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A", icon: "🟠" },
    low: { label: "Review Recommended", bg: "#F0FDF4", text: "#16A34A", border: "#DCFCE7", icon: "🟡" },
  };
  const s = config[severity] || config.medium;
  return (
    <View style={[styles.severityBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
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
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  severityText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});

export default SeverityBadge;
