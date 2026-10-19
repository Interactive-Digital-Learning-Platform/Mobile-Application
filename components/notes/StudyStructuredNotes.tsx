import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { scaleForAuthor, Text, TextInput } from "@/components/ui/AppText";
import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  List,
  Search,
  Target,
  X,
} from "lucide-react-native";
import Markdown, {
  MarkdownIt,
  RenderRules,
} from "react-native-markdown-display";
import StudyVisual, { StudyVisualData } from "./StudyVisual";
import { colors } from "@/constants/colors";
import {
  filterStudySections,
  findStudyGuideTarget,
  NOTE_MARKDOWN_OPTIONS,
  parseStudyGuide,
  studyGuideOverview,
  studyHeadingKey,
  studySectionNeedsSupport,
} from "@/utils/noteStudyGuide";

const markdown = MarkdownIt(NOTE_MARKDOWN_OPTIONS);
const coverageLabels = {
  present: "Covered in your upload",
  partial: "Partially covered · build on this",
  missing: "Missing from your upload · study this",
  unchecked: "Not checked in your upload",
};
const tableRules: RenderRules = {
  table: (node, children, _parents, styles) => {
    const columns =
      node.children.find((child) => child.type === "thead")?.children[0]
        ?.children.length || 2;
    return (
      <View key={node.key} style={s.tableWrap}>
        <Text style={s.tableHint}>Swipe across to read the table</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
        >
          <View
            style={[
              styles._VIEW_SAFE_table,
              { minWidth: Math.max(280, columns * 130) },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </View>
    );
  },
};

export default function StudyStructuredNotes({
  textContent,
  visuals = [],
  targetGapId,
  targetConcept,
}: {
  textContent: string;
  visuals?: StudyVisualData[];
  targetGapId?: string;
  targetConcept?: string;
}) {
  const parsed = useMemo(() => parseStudyGuide(textContent), [textContent]);
  const sections = useMemo(
    () =>
      parsed.filter(
        (section, index) =>
          !(
            index === 0 &&
            /^#\s+[^\n]+$/.test(section.body.trim()) &&
            !section.noteCoverage &&
            !visuals.some(
              (visual) =>
                studyHeadingKey(visual.afterHeading) ===
                studyHeadingKey(section.heading),
            )
          ),
      ),
    [parsed, visuals],
  );
  const sectionNumbers = useMemo(
    () => new Map(sections.map((section, index) => [section.id, index + 1])),
    [sections],
  );
  const overview = useMemo(() => studyGuideOverview(parsed), [parsed]);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [supportOnly, setSupportOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(
    new Set(),
  );
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [pendingJump, setPendingJump] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const sectionViews = useRef(new Map<number, View>());
  const currentJump = useRef<number | null>(null);
  const visible = useMemo(
    () => filterStudySections(sections, supportOnly, query),
    [sections, supportOnly, query],
  );
  const target = useMemo(
    () => findStudyGuideTarget(sections, targetGapId, targetConcept),
    [sections, targetGapId, targetConcept],
  );
  const requestedFocus = !!(targetGapId || targetConcept);
  const measuredJump = (id: number) => {
    const container = content.current,
      section = sectionViews.current.get(id);
    if (!container || !section || currentJump.current !== id) return;
    // Measure against the whole scroll content, including hero and controls.
    section.measureLayout(
      container,
      (_x, y) => {
        if (currentJump.current !== id) return;
        scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
        currentJump.current = null;
        setPendingJump(null);
      },
      () => {
        /* The section's onLayout retries after its native view settles. */
      },
    );
  };
  const jumpTo = (id: number) => {
    setHighlighted(id);
    currentJump.current = id;
    setPendingJump(id);
  };
  useEffect(() => {
    if (target === null) return;
    setSupportOnly(false);
    setQuery("");
    setHighlighted(target);
    currentJump.current = target;
    setPendingJump(target);
  }, [target]);
  useEffect(() => {
    if (pendingJump === null) return;
    const frame = requestAnimationFrame(() => measuredJump(pendingJump));
    return () => cancelAnimationFrame(frame);
  });
  useEffect(
    () => () => {
      currentJump.current = null;
    },
    [],
  );
  const readingStyles = useMemo(
    () => {
      // Sizes were chosen for the system font; Author draws smaller (see AppText).
      const size = scaleForAuthor(fontSize);
      return {
        body: { fontSize: size, lineHeight: size * 1.7, color: "#334155", fontFamily: "Author-Regular" },
        heading1: {
          fontSize: size + 9,
          lineHeight: size * 2,
          color: "#27364B",
          fontFamily: "Author-Bold",
          marginBottom: 12,
        },
        heading2: {
          fontSize: size + 5,
          lineHeight: size * 1.8,
          color: "#27364B",
          fontFamily: "Author-Bold",
          marginTop: 4,
          marginBottom: 12,
        },
        heading3: {
          fontSize: size + 1,
          lineHeight: size * 1.6,
          color: "#9A3412",
          fontFamily: "Author-Bold",
          marginTop: 14,
          marginBottom: 8,
        },
        paragraph: { marginBottom: 12 },
        list_item: { marginBottom: 7 },
        bullet_list: { marginBottom: 12 },
        bullet_list_icon: { fontFamily: "Author-Regular" },
        ordered_list_icon: { fontFamily: "Author-Regular" },
        ordered_list: { marginBottom: 12 },
        strong: { color: "#27364B", fontFamily: "Author-Bold" },
        em: { color: "#526176", fontFamily: "Author-Italic" },
        blockquote: {
          backgroundColor: "#FFF7ED",
          borderLeftColor: "#FDBA74",
          borderLeftWidth: 3,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginVertical: 12,
        },
        code_inline: {
          backgroundColor: "#F1F5F9",
          color: "#9A3412",
          fontSize: fontSize - 1,
          fontFamily: "monospace",
        },
        fence: {
          backgroundColor: "#F1F5F9",
          color: "#334155",
          fontSize: fontSize - 2,
          padding: 12,
          borderRadius: 10,
        },
        table: { borderColor: "#CBD5E1", borderWidth: 1, marginVertical: 8 },
        tr: { borderBottomColor: "#E2E8F0", borderBottomWidth: 1 },
        th: { backgroundColor: "#FFF7ED", padding: 10 },
        td: { padding: 10 },
        hr: { backgroundColor: "#E2E8F0", height: 1, marginVertical: 14 },
      };
    },
    [fontSize],
  );
  const hasCoverage = Object.values(overview.counts).some((value) => value > 0);
  const resetFilters = () => {
    setQuery("");
    setSupportOnly(false);
  };
  const top = () => {
    scroll.current?.scrollTo({ y: 0, animated: true });
    setContentsOpen(true);
  };
  return (
    <ScrollView
      ref={scroll}
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View ref={content} collapsable={false} style={s.container}>
        <View style={s.hero}>
          <View style={s.heroLabel}>
            <BookOpen size={17} color="#9A3412" />
            <Text style={s.eyebrow}>Your study guide</Text>
          </View>
          <Text accessibilityRole="header" style={s.title}>
            {overview.title}
          </Text>
          <Text style={s.subtitle}>
            Learn the ideas, explore the examples, then check what you remember.
          </Text>
          <Text style={s.readingMeta}>
            {sections.length} sections · about {overview.readingMinutes} min
            read
          </Text>
          {hasCoverage && (
            <>
              <View style={s.coverageRow}>
                {(
                  [
                    ["present", "Covered"],
                    ["partial", "Partial"],
                    ["missing", "Missing"],
                    ["unchecked", "Not checked"],
                  ] as const
                )
                  .filter(([status]) => overview.counts[status] > 0)
                  .map(([status, label]) => (
                    <View
                      key={status}
                      style={[
                        s.countBadge,
                        status === "present" && s.coveredBadge,
                      ]}
                    >
                      <Text
                        style={[
                          s.countText,
                          status === "present" && s.coveredText,
                        ]}
                      >
                        {overview.counts[status]} {label}
                      </Text>
                    </View>
                  ))}
              </View>
              <Text style={s.coverageHint}>
                These labels describe your uploaded pages, not how much you
                understand.
              </Text>
            </>
          )}
        </View>

        <View style={s.tools}>
          <View style={s.toolsHeading}>
            <Text style={s.toolsTitle}>Make it easier to study</Text>
            <View style={s.sizeControls}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Smaller reading text"
                disabled={fontSize <= 15}
                onPress={() => setFontSize((value) => Math.max(15, value - 1))}
                style={[s.sizeButton, fontSize <= 15 && s.disabled]}
              >
                <Text style={s.sizeText}>A−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Larger reading text"
                disabled={fontSize >= 21}
                onPress={() => setFontSize((value) => Math.min(21, value + 1))}
                style={[s.sizeButton, fontSize >= 21 && s.disabled]}
              >
                <Text style={s.sizeText}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.search}>
            <Search size={18} color="#64748B" />
            <TextInput
              accessibilityLabel="Search study guide sections"
              value={query}
              onChangeText={setQuery}
              placeholder="Find a concept or keyword"
              placeholderTextColor="#64748B"
              autoCorrect={false}
              style={s.input}
            />
            {!!query && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear guide search"
                onPress={() => setQuery("")}
                style={s.clear}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.filters}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: !supportOnly }}
              onPress={() => setSupportOnly(false)}
              style={[s.filter, !supportOnly && s.filterActive]}
            >
              <Text style={[s.filterText, !supportOnly && s.filterTextActive]}>
                All sections
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: supportOnly }}
              onPress={() => setSupportOnly(true)}
              style={[s.filter, supportOnly && s.filterActive]}
            >
              <Target size={15} color={supportOnly ? "#9A3412" : "#64748B"} />
              <Text style={[s.filterText, supportOnly && s.filterTextActive]}>
                Needs attention · {overview.supportCount}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: contentsOpen }}
            onPress={() => setContentsOpen((value) => !value)}
            style={s.contentsButton}
          >
            <View style={s.contentsLabel}>
              <List size={18} color="#9A3412" />
              <Text style={s.toolsTitle}>Lesson contents</Text>
            </View>
            {contentsOpen ? (
              <ChevronUp size={18} color="#64748B" />
            ) : (
              <ChevronDown size={18} color="#64748B" />
            )}
          </TouchableOpacity>
          {contentsOpen && (
            <View style={s.contentsList}>
              {visible.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  accessibilityRole="button"
                  onPress={() => jumpTo(section.id)}
                  style={s.contentsItem}
                >
                  <Text style={s.contentsIndex}>
                    {sectionNumbers.get(section.id)}
                  </Text>
                  <Text style={s.contentsText}>
                    {section.heading.replace(/[*_`]/g, "")}
                  </Text>
                  {studySectionNeedsSupport(section) && (
                    <View style={s.supportDot} />
                  )}
                  <ChevronRight size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {requestedFocus && target === null && (
          <Text style={s.notice}>
            The requested concept wasn’t found as a section. Use search or the
            lesson contents to find it.
          </Text>
        )}
        {(supportOnly || !!query.trim()) && (
          <Text accessibilityLiveRegion="polite" style={s.results}>
            {visible.length} of {sections.length} sections shown
            {supportOnly ? " · Partial, Missing and extra support" : ""}
          </Text>
        )}
        {!visible.length && (
          <View style={s.empty}>
            <Search size={26} color="#94A3B8" />
            <Text style={s.emptyTitle}>
              {!sections.length
                ? "No lesson text is available yet"
                : supportOnly && !query.trim()
                  ? "No sections are marked for extra attention"
                  : "No matching sections"}
            </Text>
            <Text style={s.subtitle}>
              {sections.length
                ? "You can still explore the rest of the lesson."
                : "Use Update version above to create a new guide."}
            </Text>
            {!!sections.length && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={resetFilters}
                style={s.action}
              >
                <Text style={s.actionText}>Show all sections</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {visible.map((section) => {
          const isTarget = highlighted === section.id;
          const needsSupport = studySectionNeedsSupport(section);
          const firstHeadingInHero =
            section.id === sections[0]?.id && /^#\s+/.test(section.body);
          const body =
            firstHeadingInHero || section.isAnswer
              ? section.body.replace(/^#{1,6}\s+[^\n]+\n?/, "").trim()
              : section.body;
          return (
            <View
              key={section.id}
              ref={(view) => {
                if (view) sectionViews.current.set(section.id, view);
                else sectionViews.current.delete(section.id);
              }}
              collapsable={false}
              onLayout={() => {
                if (currentJump.current === section.id)
                  measuredJump(section.id);
              }}
              style={[
                s.section,
                needsSupport && s.supportSection,
                isTarget && s.focusSection,
              ]}
            >
              <View style={s.sectionTop}>
                <Text style={s.sectionNumber}>
                  {section.isAnswer
                    ? "Check your answers"
                    : `Section ${sectionNumbers.get(section.id)}`}
                </Text>
                {isTarget && <Text style={s.focusLabel}>Your focus</Text>}
              </View>
              {section.noteCoverage && (
                <View
                  style={[
                    s.coverageBadge,
                    section.noteCoverage === "present" && s.coveredBadge,
                  ]}
                >
                  <Text
                    style={[
                      s.coverageText,
                      section.noteCoverage === "present" && s.coveredText,
                    ]}
                  >
                    {coverageLabels[section.noteCoverage]}
                  </Text>
                </View>
              )}
              {!section.noteCoverage &&
                (section.isFromNotes || section.isRemediatedGap) && (
                  <Text style={s.sourceLabel}>
                    {section.isRemediatedGap
                      ? "Extra support"
                      : "From your notes"}
                  </Text>
                )}
              {section.isAnswer ? (
                <>
                  <Text accessibilityRole="header" style={s.answerTitle}>
                    {section.heading.replace(/[*_`]/g, "")}
                  </Text>
                  <Text style={s.answerHint}>
                    Try the questions before checking these answers.
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{
                      expanded: revealedAnswers.has(section.id),
                    }}
                    onPress={() =>
                      setRevealedAnswers((previous) => {
                        const next = new Set(previous);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      })
                    }
                    style={s.action}
                  >
                    <Text style={s.actionText}>
                      {revealedAnswers.has(section.id)
                        ? "Hide answers"
                        : "Show self-check answers"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {(!section.isAnswer || revealedAnswers.has(section.id)) && (
                <>
                  {!!body && (
                    <Markdown
                      markdownit={markdown}
                      style={readingStyles}
                      rules={tableRules}
                    >
                      {body}
                    </Markdown>
                  )}
                  {visuals
                    .filter(
                      (visual) =>
                        studyHeadingKey(visual.afterHeading) ===
                          studyHeadingKey(section.heading) &&
                        sections.find(
                          (item) =>
                            studyHeadingKey(item.heading) ===
                            studyHeadingKey(visual.afterHeading),
                        )?.id === section.id,
                    )
                    .map((visual, index) => (
                      <StudyVisual key={index} visual={visual} />
                    ))}
                </>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to lesson contents"
                onPress={top}
                style={s.sectionFooter}
              >
                <ArrowUp size={14} color="#64748B" />
                <Text style={s.footerText}>Lesson contents</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={s.end}>
          <BookOpen size={18} color={colors.primary} />
          <Text style={s.endText}>
            Read one idea, look away, then explain it in your own words.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9FB" },
  scrollContent: { padding: 16, paddingBottom: 70 },
  container: { gap: 16 },
  hero: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 23,
    padding: 21,
    gap: 12,
  },
  heroLabel: { flexDirection: "row", gap: 8, alignItems: "center" },
  eyebrow: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: "#27364B", fontSize: 25, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: "#526176", fontSize: 14, lineHeight: 22 },
  readingMeta: { color: "#9A3412", fontSize: 12, lineHeight: 20 },
  coverageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  countBadge: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#FFEDD5",
    borderRadius: 10,
  },
  countText: { color: "#9A3412", fontSize: 12, fontWeight: "600" },
  coveredBadge: { backgroundColor: "#DCFCE7" },
  coveredText: { color: "#166534" },
  coverageHint: { color: "#64748B", fontSize: 11, lineHeight: 18 },
  tools: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    borderRadius: 20,
    gap: 13,
  },
  toolsHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toolsTitle: { color: "#334155", fontWeight: "700", fontSize: 14 },
  sizeControls: { flexDirection: "row", gap: 7 },
  sizeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 11,
  },
  sizeText: { color: "#334155", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 13,
    color: "#334155",
  },
  clear: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },
  filterActive: { backgroundColor: "#FFEDD5" },
  filterText: { color: "#526176", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#9A3412" },
  contentsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  contentsLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  contentsList: { gap: 2 },
  contentsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 48,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E8F0",
  },
  contentsIndex: {
    color: "#9A3412",
    fontSize: 11,
    width: 20,
    fontWeight: "600",
  },
  contentsText: { color: "#334155", fontSize: 13, lineHeight: 20, flex: 1 },
  supportDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notice: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 21,
    padding: 14,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
  },
  results: { color: "#64748B", fontSize: 12, lineHeight: 20 },
  empty: {
    alignItems: "center",
    gap: 12,
    padding: 23,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },
  emptyTitle: {
    color: "#334155",
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 19,
    gap: 12,
  },
  supportSection: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  focusSection: { borderColor: "#EA580C", backgroundColor: "#FFFCF8" },
  sectionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  sectionNumber: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#64748B",
    textTransform: "uppercase",
  },
  focusLabel: { fontSize: 11, color: "#9A3412", fontWeight: "700" },
  coverageBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  coverageText: {
    color: "#9A3412",
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "600",
  },
  sourceLabel: { color: "#64748B", fontSize: 12 },
  answerTitle: {
    color: "#27364B",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  answerHint: { color: "#526176", fontSize: 13, lineHeight: 21 },
  action: {
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  actionText: { color: "#9A3412", fontSize: 13, fontWeight: "600" },
  sectionFooter: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
  footerText: { color: "#64748B", fontSize: 11 },
  tableWrap: { gap: 6, marginVertical: 8 },
  tableHint: { color: "#64748B", fontSize: 11 },
  end: {
    padding: 17,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
  },
  endText: { color: "#7C431D", fontSize: 13, lineHeight: 21, flex: 1 },
});
