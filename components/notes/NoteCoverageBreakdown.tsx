import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { BookOpen, CheckCircle2, CircleDashed, CircleHelp, ChevronDown, ChevronUp } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { NoteCoverageBreakdown as Coverage } from "@/utils/noteCoverage";

export default function NoteCoverageBreakdown({ coverage, score, weighted, lessonCoverage }: {
  coverage: Coverage;
  score: number;
  weighted: boolean;
  lessonCoverage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!coverage.total) return null;
  const groups = [
    { key: "present", label: "Covered", heading: "Covered in your notes", concepts: coverage.covered, color: "#15803D", light: "#F0FDF4", border: "#BBF7D0", Icon: CheckCircle2 },
    { key: "partial", label: "Partial", heading: "Partly covered — add more detail", concepts: coverage.partial, color: "#B45309", light: "#FFFBEB", border: "#FDE68A", Icon: CircleDashed },
    { key: "missing", label: "Not found", heading: "Not found in this upload", concepts: coverage.missing, color: "#B91C1C", light: "#FEF2F2", border: "#FECACA", Icon: CircleHelp },
  ];
  const summary = groups.map(group => `${group.concepts.length} ${group.label.toLowerCase()}`).join(", ");
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BookOpen size={18} color={colors.primaryBlack} />
          <Text style={styles.title}>{lessonCoverage ? "Curriculum Coverage" : "Note Coverage"}</Text>
        </View>
        <View style={styles.score}><Text style={styles.scoreText}>{score}% score</Text></View>
      </View>
      <Text style={styles.subtitle}>{coverage.total} concepts checked {lessonCoverage ? "against the lesson" : "in this upload"}</Text>
      <Text style={styles.explanation}>
        {weighted ? "Some concepts count more towards the score. Partial coverage earns half credit." : "This is the saved coverage score. The counts below show concepts in each group."}
      </Text>
      <View style={styles.track} accessible accessibilityLabel={`Concept counts: ${summary}. ${coverage.total} total.`}>
        {groups.filter(group => group.concepts.length > 0).map(group => (
          <View key={group.key} style={{ flex: group.concepts.length, backgroundColor: group.color }} />
        ))}
      </View>
      <View style={styles.counts}>
        {groups.map(({ key, label, concepts, color, light, border, Icon }) => (
          <View key={key} style={[styles.tile, { backgroundColor: light, borderColor: border }]} accessible accessibilityLabel={`${concepts.length} ${label.toLowerCase()} concept${concepts.length === 1 ? "" : "s"}`}>
            <Icon size={16} color={color} />
            <Text style={[styles.count, { color }]}>{concepts.length}</Text>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.countNote}>Concept counts • {coverage.total} total</Text>
      <TouchableOpacity style={styles.toggle} accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}>
        <Text style={styles.toggleText}>{expanded ? "Hide concepts" : `View all ${coverage.total} concepts`}</Text>
        {expanded ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.groups}>
          {groups.filter(group => group.concepts.length > 0).map(({ key, heading, concepts, color, light, Icon }) => (
            <View key={key} style={[styles.group, { backgroundColor: light }]}>
              <View style={styles.groupHeader}>
                <Icon size={16} color={color} />
                <Text style={[styles.groupTitle, { color }]}>{heading} ({concepts.length})</Text>
              </View>
              {concepts.map((concept, index) => (
                <View key={`${concept.id}-${index}`} style={styles.concept}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.conceptText}>{concept.name}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.footnote}>These labels describe what appears in this upload. They do not measure everything you know.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: "#EEF2F6" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: colors.primaryBlack, flexShrink: 1 },
  score: { backgroundColor: "#FFF0E6", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  scoreText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  subtitle: { color: "#475569", fontSize: 13, lineHeight: 19 },
  explanation: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  track: { height: 10, borderRadius: 5, backgroundColor: "#F1F5F9", flexDirection: "row", overflow: "hidden", marginBottom: 12 },
  counts: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 4 },
  count: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 11, fontWeight: "600" },
  countNote: { color: "#64748B", textAlign: "center", fontSize: 11, marginTop: 8, marginBottom: 12 },
  toggle: { backgroundColor: "#FFF7ED", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  toggleText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  groups: { gap: 12, marginTop: 14 },
  group: { borderRadius: 14, padding: 12 },
  groupHeader: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 8 },
  groupTitle: { fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 18 },
  concept: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: "#FFFFFF" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  conceptText: { flex: 1, fontSize: 13, lineHeight: 19, color: "#334155" },
  footnote: { color: "#64748B", fontSize: 11, lineHeight: 17 },
});
