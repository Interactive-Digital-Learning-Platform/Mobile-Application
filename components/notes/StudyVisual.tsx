import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ArrowDown, ChartNoAxesColumn, GitBranch, Clock3, Columns2 } from "lucide-react-native";
import { colors } from "@/constants/colors";

export interface StudyVisualData {
  type: "flow" | "timeline" | "comparison" | "bar";
  afterHeading: string;
  title: string;
  caption: string;
  sourceQuote: string;
  items?: { label: string; detail: string }[];
  data?: { label: string; value: number }[];
  unit?: string;
}

export default function StudyVisual({ visual }: { visual: StudyVisualData }) {
  const [showSource, setShowSource] = useState(false);
  const Icon = { flow: GitBranch, timeline: Clock3, comparison: Columns2, bar: ChartNoAxesColumn }[visual.type];
  if (!Icon) return null;
  const items = visual.items ?? [];
  const data = visual.data ?? [];
  const max = Math.max(1, ...data.map(item => item.value));
  return (
    <View style={s.card}>
      <View style={s.header}><Icon size={18} color={colors.primary} /><Text style={s.title}>{visual.title}</Text></View>
      <Text style={s.caption}>{visual.caption}</Text>
      {visual.type === "bar" ? (
        <View accessibilityLabel={`${visual.title}. Values in ${visual.unit}. Bars start at zero.`}>
          <Text style={s.unit}>{visual.unit} · scale starts at 0</Text>
          {data.map((item, index) => (
            <View key={index} style={s.barRow} accessibilityLabel={`${item.label}: ${item.value} ${visual.unit}`}>
              <View style={s.barLabel}><Text style={s.label}>{item.label}</Text><Text style={s.value}>{item.value} {visual.unit}</Text></View>
              <View style={s.track}><View style={[s.bar, { width: `${Math.max(0, item.value / max * 100)}%` }]} /></View>
            </View>
          ))}
          <View style={s.barLabel}><Text style={s.unit}>0</Text><Text style={s.unit}>{max} {visual.unit}</Text></View>
        </View>
      ) : (
        <View style={visual.type === "comparison" ? s.comparison : undefined}>
          {items.map((item, index) => (
            <View key={index} style={visual.type === "comparison" ? s.comparisonItem : undefined}>
              <View style={s.item}>
                {visual.type !== "comparison" && <View style={s.number}><Text style={s.numberText}>{index + 1}</Text></View>}
                <View style={s.itemText}><Text style={s.label}>{item.label}</Text><Text style={s.detail}>{item.detail}</Text></View>
              </View>
              {index < items.length - 1 && visual.type === "flow" && <ArrowDown style={s.arrow} size={18} color={colors.primary} />}
              {index < items.length - 1 && visual.type === "timeline" && <View style={s.connector} />}
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showSource }} onPress={() => setShowSource(!showSource)} style={s.sourceButton}>
        <Text style={s.sourceLink}>{showSource ? "Hide source excerpt" : "View source excerpt"}</Text>
      </TouchableOpacity>
      {showSource && <Text style={s.quote}>{visual.sourceQuote}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderWidth: 1, borderRadius: 18, padding: 16, marginVertical: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 9 },
  title: { fontSize: 16, fontWeight: "700", color: "#27364B", flex: 1 },
  caption: { color: "#526176", lineHeight: 21, fontSize: 13, marginTop: 8, marginBottom: 16 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 12 },
  number: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFEDD5" },
  numberText: { color: "#9A3412", fontWeight: "700", fontSize: 12 },
  itemText: { flex: 1 }, label: { fontSize: 14, color: "#27364B", fontWeight: "700", flexShrink: 1 },
  detail: { fontSize: 13, color: "#526176", lineHeight: 21, marginTop: 4 },
  arrow: { alignSelf: "center", marginVertical: 5 }, connector: { height: 16, width: 2, backgroundColor: "#FDBA74", marginLeft: 25 },
  comparison: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, comparisonItem: { flexGrow: 1, flexBasis: 180 },
  unit: { fontSize: 11, color: "#6B7280", marginBottom: 8 }, barRow: { marginBottom: 14 },
  barLabel: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 }, value: { color: "#9A3412", fontSize: 12, flexShrink: 1 },
  track: { height: 12, borderRadius: 6, backgroundColor: "#FFEDD5", overflow: "hidden" },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.primary },
  sourceButton: { paddingVertical: 10, alignSelf: "flex-start", marginTop: 6 }, sourceLink: { color: "#9A3412", fontSize: 12, fontWeight: "600" },
  quote: { color: "#526176", fontSize: 12, lineHeight: 20, borderLeftWidth: 2, borderLeftColor: "#FDBA74", paddingLeft: 10 },
});
