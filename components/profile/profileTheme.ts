/**
 * profileTheme.ts
 * ─────────────────────────────────────────────────────────
 * Shared palette + card/label styles for the Profile analytics screen and
 * every components/profile/* section. Extracted from app/(tabs)/profile/
 * index.tsx so new sections stay visually consistent with the existing
 * accuracy ring / subject chart / strong-weak pills / AI feedback card
 * without re-declaring the same tokens in every file.
 */
import { StyleSheet } from "react-native";

export const C = {
  p50:  "#FFF3EC",
  p100: "#FFE4CF",
  p200: "#FFCCA8",
  p300: "#FFA87A",
  p400: "#FF8C50",
  p500: "#FC6E20",
  p600: "#E55B10",
  p700: "#CC4D08",
  p800: "#A33C06",
};

export const profileStyles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    color: "#1e293b",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pillStrong: {
    backgroundColor: C.p100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillWeak: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
