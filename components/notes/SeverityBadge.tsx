import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const SeverityBadge = ({
  severity,
  size = "md",
}: {
  severity: "high" | "medium" | "low";
  size?: "sm" | "md";
}) => {
  const config = {
    high: {
      label: "High Priority",
      bg: "#FEE2E2",
      text: "#DC2626",
      dot: "#EF4444",
      border: "#FECACA",
    },
    medium: {
      label: "Needs Attention",
      bg: "#FEF3C7",
      text: "#D97706",
      dot: "#F59E0B",
      border: "#FDE68A",
    },
    low: {
      label: "Review Recommended",
      bg: "#ECFDF5",
      text: "#059669",
      dot: "#10B981",
      border: "#A7F3D0",
    },
  };
  const s = config[severity] || config.medium;
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.severityBadge,
        { backgroundColor: s.bg, borderColor: s.border },
        isSm && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: s.dot }, isSm && styles.dotSm]} />
      <Text style={[styles.severityText, { color: s.text }, isSm && styles.textSm]}>
        {s.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 6,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 4.5,
  },
  dot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 4,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: 10.5,
    fontWeight: "600",
  },
});

export default SeverityBadge;

