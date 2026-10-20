import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppText";
import { GitBranch, Minus, Plus, Search, X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import {
  mindMapNodes,
  prepareMindMap,
  searchMindMap,
  StudyMapNode,
} from "@/utils/noteMindMap";

const BRANCH_COLORS = [
  "#C2410C",
  "#2563EB",
  "#047857",
  "#7C3AED",
  "#BE185D",
  "#0E7490",
];

function Topic({
  node,
  color,
  depth,
  number,
  expanded,
  searching,
  query,
  toggle,
}: {
  node: StudyMapNode;
  color: string;
  depth: number;
  number?: number;
  expanded: Set<string>;
  searching: boolean;
  query: string;
  toggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const open = searching || expanded.has(node.id);
  const matches = !!query && node.label.toLocaleLowerCase().includes(query);
  const heading = (
    <>
      {depth === 0 ? (
        <View style={[s.number, { backgroundColor: `${color}14` }]}>
          <Text style={[s.numberText, { color }]}>{number}</Text>
        </View>
      ) : (
        <View style={[s.dot, { backgroundColor: color }]} />
      )}
      <View style={s.labelWrap}>
        <Text style={[s.topic, depth === 0 && s.mainTopic, matches && s.match]}>
          {node.label}
        </Text>
        {hasChildren && (
          <Text style={s.branchMeta}>
            {node.children.length} connected{" "}
            {node.children.length === 1 ? "idea" : "ideas"}
            {!searching && !open ? " · tap to explore" : ""}
          </Text>
        )}
      </View>
      {hasChildren && !searching && (
        <View style={[s.foldIcon, { backgroundColor: `${color}12` }]}>
          {open ? (
            <Minus size={17} color={color} />
          ) : (
            <Plus size={17} color={color} />
          )}
        </View>
      )}
    </>
  );
  return (
    <View style={depth === 0 ? [s.branch, { borderTopColor: color }] : s.child}>
      {hasChildren && !searching ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={node.label}
          accessibilityHint={
            open ? "Collapse connected ideas" : "Expand connected ideas"
          }
          accessibilityState={{ expanded: open }}
          onPress={() => toggle(node.id)}
          style={({ pressed }) => [s.nodeRow, pressed && s.pressed]}
        >
          {heading}
        </Pressable>
      ) : (
        <View style={s.nodeRow}>{heading}</View>
      )}
      {hasChildren && open && (
        <View
          style={[
            s.connections,
            {
              borderLeftColor: `${color}40`,
              marginLeft: depth < 2 ? 16 : 4,
              paddingLeft: depth < 2 ? 14 : 6,
            },
          ]}
        >
          {node.children.map((child) => (
            <View key={child.id} style={s.connectedNode}>
              <View
                pointerEvents="none"
                style={[
                  s.connector,
                  {
                    backgroundColor: `${color}40`,
                    left: depth < 2 ? -14 : -6,
                    width: depth < 2 ? 14 : 6,
                  },
                ]}
              />
              <Topic
                node={child}
                color={color}
                depth={depth + 1}
                expanded={expanded}
                searching={searching}
                query={query}
                toggle={toggle}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function StudyMindMap({ mindMap }: { mindMap: unknown }) {
  const { root, simplified } = useMemo(
    () => prepareMindMap(mindMap),
    [mindMap],
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(root?.children[0] ? [root.children[0].id] : []),
  );
  useEffect(() => {
    setExpanded(new Set(root?.children[0] ? [root.children[0].id] : []));
    setQuery("");
  }, [root]);
  const nodes = useMemo(() => (root ? mindMapNodes(root) : []), [root]);
  const needle = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () => (root ? searchMindMap(root, needle) : null),
    [root, needle],
  );
  const matches = needle
    ? nodes.filter((node) => node.label.toLocaleLowerCase().includes(needle))
        .length
    : 0;
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!root)
    return (
      <View style={s.empty}>
        <GitBranch size={28} color={colors.primary} />
        <Text style={s.emptyTitle}>This mind map isn’t available</Text>
        <Text style={s.caption}>
          Return to your note and try opening it again.
        </Text>
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.intro}>
        <Text accessibilityRole="header" style={s.title}>
          See how it connects
        </Text>
        <Text style={s.caption}>
          Start with the lesson, then open a branch to explore its ideas.
        </Text>
      </View>
      <View style={s.root}>
        <View style={s.rootIcon}>
          <GitBranch size={25} color={colors.primary} />
        </View>
        <Text style={s.rootEyebrow}>Your lesson map</Text>
        <Text accessibilityRole="header" style={s.rootTitle}>
          {root.label}
        </Text>
        <Text style={s.rootMeta}>
          {root.children.length} main{" "}
          {root.children.length === 1 ? "branch" : "branches"} ·{" "}
          {Math.max(0, nodes.length - 1)} connected{" "}
          {nodes.length === 2 ? "idea" : "ideas"}
        </Text>
      </View>
      {nodes.length > 1 && (
        <>
          <View style={s.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              accessibilityLabel="Search mind map topics"
              placeholder="Find a topic or keyword"
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              style={s.searchInput}
            />
            {!!query && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear topic search"
                onPress={() => setQuery("")}
                style={s.clear}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            )}
          </View>
          {needle ? (
            <Text accessibilityLiveRegion="polite" style={s.searchSummary}>
              {matches
                ? `${matches} matching ${matches === 1 ? "topic" : "topics"} · connections shown below`
                : "No matching topics"}
            </Text>
          ) : (
            <View style={s.tools}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setExpanded(
                    new Set(
                      nodes
                        .filter((node) => node.children.length)
                        .map((node) => node.id),
                    ),
                  )
                }
                style={({ pressed }) => [s.tool, pressed && s.pressed]}
              >
                <Plus size={15} color="#9A3412" />
                <Text style={s.toolText}>Expand all</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded(new Set())}
                style={({ pressed }) => [s.tool, pressed && s.pressed]}
              >
                <Minus size={15} color="#526176" />
                <Text style={[s.toolText, { color: "#526176" }]}>
                  Collapse all
                </Text>
              </Pressable>
            </View>
          )}
          {filtered ? (
            <View style={s.tree}>
              <View pointerEvents="none" style={s.trunk} />
              {filtered.children.map((node) => {
                const index = Number(node.id.split(".")[1]);
                return (
                  <Topic
                    key={node.id}
                    node={node}
                    color={BRANCH_COLORS[index % BRANCH_COLORS.length]}
                    number={index + 1}
                    depth={0}
                    expanded={expanded}
                    searching={!!needle}
                    query={needle}
                    toggle={toggle}
                  />
                );
              })}
            </View>
          ) : (
            <View style={s.empty}>
              <Search size={25} color="#94A3B8" />
              <Text style={s.emptyTitle}>Try another keyword</Text>
              <Text style={s.caption}>
                Search for a word used in this lesson’s map.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setQuery("")}
                style={s.tool}
              >
                <Text style={s.toolText}>Show all topics</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
      {!root.children.length && (
        <Text style={s.caption}>
          This saved map contains only the lesson topic; it has no connected
          branches yet.
        </Text>
      )}
      {simplified && (
        <Text style={s.notice}>
          Some parts of this saved map could not be displayed. This is a
          simplified view.
        </Text>
      )}
      <View style={s.studyTip}>
        <Text style={s.tipTitle}>Make it stick</Text>
        <Text style={s.tipText}>
          Read one branch, collapse it, then explain the connection in your own
          words.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  intro: { gap: 6 },
  title: { fontSize: 23, lineHeight: 30, fontWeight: "700", color: "#27364B" },
  caption: { fontSize: 14, lineHeight: 22, color: "#526176" },
  root: {
    alignItems: "center",
    padding: 23,
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 24,
  },
  rootIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEDD5",
  },
  rootEyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700",
    color: "#9A3412",
  },
  rootTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#27364B",
    textAlign: "center",
  },
  rootMeta: {
    fontSize: 12,
    lineHeight: 19,
    color: "#9A3412",
    textAlign: "center",
  },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: "#27364B",
    paddingVertical: 13,
  },
  clear: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
    gap: 6,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toolText: { fontSize: 12, fontWeight: "600", color: "#9A3412" },
  searchSummary: { fontSize: 12, lineHeight: 20, color: "#526176" },
  tree: { gap: 14, paddingTop: 14 },
  trunk: {
    position: "absolute",
    top: 0,
    bottom: 24,
    left: 28,
    width: 2,
    backgroundColor: "#FED7AA",
  },
  branch: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderTopWidth: 3,
    borderRadius: 18,
    padding: 12,
  },
  child: { flex: 1 },
  nodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: 9,
  },
  pressed: { opacity: 0.65 },
  number: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { fontSize: 13, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  labelWrap: { flex: 1, minWidth: 0 },
  topic: { fontSize: 14, lineHeight: 22, color: "#334155" },
  mainTopic: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: "#27364B",
  },
  match: { backgroundColor: "#FEF3C7" },
  branchMeta: { fontSize: 11, lineHeight: 18, color: "#64748B", marginTop: 4 },
  foldIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  connections: { borderLeftWidth: 2, marginTop: 4, marginBottom: 5, gap: 4 },
  connectedNode: { position: "relative" },
  connector: { position: "absolute", top: 21, height: 2 },
  empty: {
    alignItems: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
    color: "#27364B",
    textAlign: "center",
  },
  notice: { fontSize: 12, lineHeight: 20, color: "#9A3412" },
  studyTip: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    gap: 5,
  },
  tipTitle: { fontSize: 13, fontWeight: "700", color: "#9A3412" },
  tipText: { fontSize: 13, lineHeight: 21, color: "#7C431D" },
});
