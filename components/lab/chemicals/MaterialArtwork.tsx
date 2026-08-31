import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { ChemicalType } from "@/types/lab";

// Soft category tint for the element fallback tile (used only when there's no remote artwork yet).
const CATEGORY_TINT: Record<string, string> = {
  metal: "#FEF3C7",
  "non-metal": "#DCFCE7",
  metalloid: "#EDE9FE",
  gas: "#E0F2FE",
  acid: "#FEE2E2",
  base: "#DBEAFE",
  salt: "#F1F5F9",
  indicator: "#F3E8FF",
  organic: "#ECFCCB",
  oxide: "#F1F5F9",
};

const isNearWhite = (hex: string) => ["#FFFFFF", "#F2F2F2", "#F5F5F5", "#FAFAFA"].includes(hex.toUpperCase());

// Element display symbol: the diatomic-gas records carry "H2"/"O2"/"Cl2" (reactions key off that),
// but the periodic-table symbol shown to students is "H"/"O"/"Cl". Compounds keep their formula.
export const displaySymbol = (c: { symbol: string; chemicalType: string }) =>
  c.chemicalType === "element" ? c.symbol.replace(/\d+$/, "") : c.symbol;

// One place that decides how a material is drawn: remote artwork when available (cached, with a
// graceful fallback on failure), otherwise a periodic-style symbol tile for elements or a
// stylised reagent bottle for compounds — so students can still tell the two apart.
export default function MaterialArtwork({ chemical, size }: { chemical: ChemicalType; size: number }) {
  const [failed, setFailed] = useState(false);

  if (chemical.imageUrl && !failed) {
    return (
      <Image
        source={chemical.imageUrl}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={150}
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }

  if (chemical.chemicalType === "element") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.16,
          backgroundColor: CATEGORY_TINT[chemical.category] ?? "#F1F5F9",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {chemical.atomicNumber != null && (
          <Text style={{ position: "absolute", top: size * 0.08, left: size * 0.1, fontSize: size * 0.13, fontWeight: "700", color: "#475569" }}>
            {chemical.atomicNumber}
          </Text>
        )}
        <Text style={{ fontSize: size * 0.36, fontWeight: "800", color: "#0F172A" }}>{displaySymbol(chemical)}</Text>
        {chemical.atomicMass != null && (
          <Text style={{ position: "absolute", bottom: size * 0.08, fontSize: size * 0.1, color: "#64748B" }}>{chemical.atomicMass}</Text>
        )}
      </View>
    );
  }

  // compound → stylised reagent bottle, tinted with the substance colour
  const liquid = isNearWhite(chemical.color) ? "#E2E8F0" : chemical.color;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: size * 0.26, height: size * 0.14, backgroundColor: "#CBD5E1", borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.64,
          borderRadius: size * 0.12,
          backgroundColor: "#F8FAFC",
          borderWidth: 1.5,
          borderColor: "#CBD5E1",
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <View style={{ height: "58%", backgroundColor: liquid, opacity: 0.85 }} />
      </View>
    </View>
  );
}
