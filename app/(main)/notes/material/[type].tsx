import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { materialsApi } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
import Markdown, { MarkdownIt } from "react-native-markdown-display";
import StudyFlashcards from "@/components/notes/StudyFlashcards";
import StudyStructuredNotes from "@/components/notes/StudyStructuredNotes";
import StudyMindMap from "@/components/notes/StudyMindMap";
import StudyPodcast from "@/components/notes/StudyPodcast";
import { notesErrorMessage } from "@/utils/noteErrors";
import { useNotesMaterials } from "@/hooks/use-notes-materials";
import { NOTE_MARKDOWN_OPTIONS } from "@/utils/noteStudyGuide";

const studyMarkdown = MarkdownIt(NOTE_MARKDOWN_OPTIONS);


// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function MaterialViewer() {
  const { id, type, targetGapId, targetConcept } = useLocalSearchParams<{
    id: string;
    type: string;
    targetGapId?: string;
    targetConcept?: string;
  }>();
  return <NoteMaterialScreen key={`${id}/${type}`} id={id} type={type} targetGapId={targetGapId} targetConcept={targetConcept} />;
}

function NoteMaterialScreen({ id, type, targetGapId, targetConcept }: {
  id: string; type: string; targetGapId?: string; targetConcept?: string;
}) {
  const router = useRouter();

  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const canUpdate = type === "structured_notes" || type === "flashcards" || type === "audio";
  const updates = useNotesMaterials(id, canUpdate);
  const updateStatus = updates.overview?.states.find(item => item.type === type)?.status;
  const isUpdating = !!updates.requestingType || updateStatus === "queued" || updateStatus === "generating";
  const wasUpdating = useRef(false);
  useEffect(() => {
    if (wasUpdating.current && updateStatus === "ready" && !updates.requestingType && updates.state === "idle") {
      wasUpdating.current = false;
      setReloadKey(value => value + 1);
    }
    if (updateStatus === "queued" || updateStatus === "generating") wasUpdating.current = true;
    if (updateStatus === "failed") wasUpdating.current = false;
  }, [id, type, updateStatus, updates.overview, updates.requestingType, updates.state]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const fetchMaterial = async () => {
      try {
        const response = await materialsApi.getMaterialByType(id, type, controller.signal);
        if (!response.success) throw new Error("Material unavailable");
        if (controller.signal.aborted) return;
        setMaterial(response.data);
      } catch (error) {
        if (!controller.signal.aborted) { setLoadError(notesErrorMessage(error)); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchMaterial();
    return () => controller.abort();
  }, [id, type, reloadKey]);

  const getHeaderColor = () => {
    const map: Record<string, string> = {
      structured_notes: "#3B82F6",
      flashcards: "#8B5CF6",
      revision_summary: "#10B981",
      learning_points: "#EF4444",
      audio: "#F59E0B",
      definitions: "#6366F1",
      mindmap: "#EC4899",
    };
    return map[type] ?? colors.primary;
  };

  const headerColor = getHeaderColor();

  const renderContent = () => {
    if (loading && !material) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading study material…</Text>
        </View>
      );
    }
    if (!material) {
      return (
        <View style={styles.centerContainer}>
          <Text accessibilityRole="alert" style={styles.errorText}>{loadError || "We couldn't load this study material. Please try again in a moment."}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey(value => value + 1)} style={{ padding: 16 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Try again</Text></TouchableOpacity>
        </View>
      );
    }

    // ── Audio ──────────────────────────────────────────────────────────────
    if (type === "audio" && material.audioUrl) {
      return (
        <View style={styles.contentPad}>
          <StudyPodcast key={material._id + (material.generatedAt ?? "")} audioUrl={material.audioUrl} textContent={material.textContent} transcriptCues={material.transcriptCues} />
        </View>
      );
    }

    // ── Flashcards ─────────────────────────────────────────────────────────────────
    if (type === "flashcards" && material.flashcards?.length > 0) {
      return (
        <View style={styles.contentPad}>
          <StudyFlashcards key={material._id + (material.generatedAt ?? "")} flashcards={material.flashcards} />
        </View>
      );
    }

    // ── Mind Map ───────────────────────────────────────────────────────────
    if (type === "mindmap" && material.mindMap) {
      return (
        <View style={styles.contentPad}>
          <StudyMindMap key={material._id + (material.generatedAt ?? "")} mindMap={material.mindMap} />
        </View>
      );
    }

    // ── Definitions ────────────────────────────────────────────────────────
    if (type === "definitions" && material.definitions?.length > 0) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.materialHero}>
            <Text style={styles.heroSub}>
              {material.definitions.length} key terms defined
            </Text>
          </View>
          {material.definitions.map((def: any, i: number) => (
            <View key={i} style={styles.definitionCard}>
              <View style={[styles.defIndex, { backgroundColor: `${headerColor}15` }]}>
                <Text style={[styles.defIndexText, { color: headerColor }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.defTerm, { color: headerColor }]}>{def.term}</Text>
                <Text style={styles.defDefinition}>{def.definition}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // ── Structured Notes (Specialized gap-annotated viewer) ─────────────────
    if (type === "structured_notes" && material.textContent) {
      return (
        <StudyStructuredNotes
          key={material._id + (material.generatedAt ?? "")}
          textContent={material.textContent}
          visuals={material.visuals}
          targetGapId={targetGapId}
          targetConcept={targetConcept}
        />
      );
    }

    // ── Other Markdown views (revision_summary, learning_points) ───────────
    if (material.textContent) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.markdownCard}>
            <Markdown markdownit={studyMarkdown} style={markdownStyles}>{material.textContent}</Markdown>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>This material is still being prepared.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.backButtonRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/notes/[id]", params: { id } })}
          style={styles.backButton}
        >
          <ChevronLeft size={26} color={colors.primaryBlack} />
        </TouchableOpacity>
        {canUpdate && material && <TouchableOpacity accessibilityRole="button" disabled={isUpdating || !updates.overview} onPress={() => { wasUpdating.current = true; void updates.generate(type); }} style={{ padding: 10, marginLeft: "auto", opacity: isUpdating || !updates.overview ? 0.5 : 1 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{isUpdating ? "Creating update…" : "Update version"}</Text>
        </TouchableOpacity>}
      </View>
      {canUpdate && (isUpdating || updates.requestError || updateStatus === "failed" || updates.state === "error" || updates.state === "paused") && <View style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#FFF7ED" }}>
        <Text style={{ color: "#9A3412", fontSize: 12, lineHeight: 18 }}>{updates.requestError || (updateStatus === "failed" ? "The update couldn't finish. Your saved version is still available; tap Update version to retry." : updates.state === "error" || updates.state === "paused" ? "Progress checks paused. You can check again below." : "Creating your updated material. You can keep reading or return to Notes.")}</Text>
        {(updates.state === "error" || updates.state === "paused") && <TouchableOpacity accessibilityRole="button" onPress={updates.refresh} style={{ paddingVertical: 10 }}><Text style={{ color: "#9A3412", fontWeight: "700", fontSize: 12 }}>Check progress</Text></TouchableOpacity>}
      </View>}

      {material && loadError && <View style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#FFF7ED" }}>
        <Text style={{ color: "#9A3412", fontSize: 12 }}>Could not load the updated content. Your saved version is still available.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey(value => value + 1)} style={{ paddingVertical: 10 }}><Text style={{ color: "#9A3412", fontWeight: "700" }}>Retry loading content</Text></TouchableOpacity>
      </View>}

      {/* The guide reader manages its own scroll for section navigation. */}
      {type === "structured_notes" ? (
        renderContent()
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {renderContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const markdownStyles = {
  body: { fontSize: 15, color: "#374151", fontWeight: "400" as const, lineHeight: 25 },
  heading1: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.primaryBlack,
    marginTop: 4,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1E293B",
    marginTop: 14,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },
  paragraph: { marginBottom: 10 },
  list_item: { marginBottom: 6, paddingLeft: 4 },
  strong: { fontWeight: "700" as const, color: colors.primaryBlack },
  em: { fontStyle: "italic" as const, color: colors.primary },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  code_inline: {
    backgroundColor: "#F1F5F9",
    color: "#BE185D",
    fontWeight: "600" as const,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: "#F8FAFC",
    borderLeftColor: "#3B82F6",
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1, backgroundColor: "#F8F9FB" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  loadingText: { marginTop: 14, fontSize: 15, color: "#6B7280", fontWeight: "500" },
  errorText: { fontSize: 15, color: "#94A3B8", fontWeight: "500", textAlign: "center" },

  backButtonRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },

  contentPad: { padding: 16 },

  // Material hero
  materialHero: { alignItems: "center", marginBottom: 20, marginTop: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  heroSub: { fontSize: 14, color: "#94A3B8", fontWeight: "400", textAlign: "center" },

  // ── Definitions ──────────────────────────────────────────────────────────────

  definitionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  defIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  defIndexText: { fontSize: 14, fontWeight: "700" },
  defTerm: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  defDefinition: { fontSize: 14, fontWeight: "400", color: "#475569", lineHeight: 22 },

  // ── Markdown ─────────────────────────────────────────────────────────────────

  markdownCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
});
