import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Brain,
  BookOpen,
  Clock,
  FileText,
  Layers,
  AlertCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  TrendingUp,
  Star,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react-native";
import { materialsApi, notesApi } from "@/api/notesAPI";
import { getNotesResourceUrl } from "@/api/apiClients";
import { colors } from "@/constants/colors";
import Markdown from "react-native-markdown-display";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearningGap {
  concept: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

interface Analysis {
  subject: string;
  topic: string;
  gradeLevel: string;
  keyConcepts: string[];
  strengthAreas: string[];
  missingConcepts: string[];
  learningGaps: LearningGap[];
  overallCompleteness: number;
  analyzedAt: string;
}

interface Note {
  _id: string;
  title: string;
  imageUrl: string;
  imageUrls?: string[];
  pageCount?: number;
  rawText: string;
  status: "uploaded" | "processing" | "analyzed" | "failed";
  errorMessage?: string;
  analysis?: Analysis;
  createdAt: string;
}

interface MaterialsOverview {
  generatedTypes: string[];
  missingCount: number;
}



// ─── Helper Components ────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }: { severity: "high" | "medium" | "low" }) => {
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

const ConceptChip = ({
  label,
  type = "neutral",
}: {
  label: string;
  type?: "primary" | "success" | "danger" | "neutral";
}) => {
  const colorMap = {
    primary: { bg: `${colors.primary}15`, text: colors.primary, border: `${colors.primary}30` },
    success: { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0" },
    danger: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
    neutral: { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  };
  const c = colorMap[type];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const MaterialCard = ({
  icon,
  title,
  color,
  isReady,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  isReady: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.materialCard, !isReady && styles.materialCardDisabled]}
    onPress={onPress}
    disabled={!isReady}
    activeOpacity={0.7}
  >
    <View style={[styles.materialIcon, { backgroundColor: `${color}18` }]}>
      {icon}
    </View>
    <Text style={styles.materialTitle} numberOfLines={2}>{title}</Text>
    <View style={[styles.materialStatusDot, { backgroundColor: isReady ? "#10b981" : "#d1d5db" }]} />
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [materialsOverview, setMaterialsOverview] = useState<MaterialsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  // Guard: ensure auto-generate fires only once per screen mount
  const hasTriggeredGeneration = React.useRef(false);

  const status = note?.status ?? "loading";
  const isProcessing = status === "uploaded" || status === "processing";
  const isFailed = status === "failed";
  const isAnalyzed = status === "analyzed";

  // ── Fetch note ──────────────────────────────────────────────────────────────
  const fetchNote = useCallback(async () => {
    try {
      const response = await notesApi.getNote(id);
      if (response.success) {
        setNote(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch note:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch materials overview ────────────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    try {
      const response = await materialsApi.getMaterials(id);
      if (response.success) {
        setMaterialsOverview(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  }, [id]);

  // ── Auto-generate materials when analysis completes ─────────────────────────
  const triggerMaterialGeneration = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      console.log("⚙️ Auto-triggering material generation...");
      await materialsApi.generateMaterials(id);
      // Wait a moment then fetch materials
      setTimeout(fetchMaterials, 4000);
    } catch (error) {
      console.error("Material generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [id, isGenerating, fetchMaterials]);

  // ── Polling while processing ────────────────────────────────────────────────
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(fetchNote, 3500);
    return () => clearInterval(interval);
  }, [isProcessing, fetchNote]);

  // ── When analysis is done, fetch materials ──────────────────────────────────
  useEffect(() => {
    if (!isAnalyzed) return;
    fetchMaterials();
  }, [isAnalyzed, fetchMaterials]);

  // ── Auto-generate if no materials yet (fires ONCE per mount) ───────────────
  useEffect(() => {
    if (!isAnalyzed) return;
    if (materialsOverview === null) return; // still loading
    if (hasTriggeredGeneration.current) return; // already fired
    if (materialsOverview.generatedTypes.length === 0) {
      hasTriggeredGeneration.current = true;
      triggerMaterialGeneration();
    }
  }, [isAnalyzed, materialsOverview]);

  // ─────────────────────────────────────────────────────────────────────────────

  const getCompletenessColor = (score: number) => {
    if (score >= 75) return "#10b981";
    if (score >= 45) return "#f59e0b";
    return "#ef4444";
  };

  const navigateToMaterial = (type: string) => {
    router.push({
      pathname: "/(tabs)/notes/material/[type]",
      params: { id, type },
    });
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading note...</Text>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={styles.errorText}>Note not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {note.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Processing State ── */}
        {isProcessing && (
          <View style={styles.processingCard}>
            <View style={styles.processingIconWrap}>
              <Brain size={32} color={colors.primary} />
            </View>
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.processingTitle}>AI is analyzing your notes…</Text>
            <Text style={styles.processingText}>
              Extracting handwriting, identifying subject & topic, detecting learning gaps.
              This takes 20–60 seconds.
            </Text>
            <View style={styles.pipelineSteps}>
              {["OCR Extraction", "AI Analysis", "Generating Materials"].map(
                (step, i) => (
                  <View key={i} style={styles.pipelineStep}>
                    <View style={[styles.pipelineDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.pipelineStepText}>{step}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}

        {/* ── Failed State ── */}
        {isFailed && (
          <View style={[styles.processingCard, { borderColor: "#FCA5A5" }]}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={[styles.processingTitle, { color: "#DC2626" }]}>
              Analysis Failed
            </Text>
            <Text style={styles.processingText}>
              {note.errorMessage || "Could not process this image. Please ensure the image is clear and try uploading again."}
            </Text>
          </View>
        )}

        {/* ── Analyzed State ── */}
        {isAnalyzed && note.analysis && (
          <>
            {/* ── Analysis Summary Card ── */}
            <View style={styles.summaryCard}>
              {/* Subject + Grade */}
              <View style={styles.summaryHeader}>
                <View style={styles.subjectIconWrap}>
                  <Brain size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{note.analysis.subject}</Text>
                  <Text style={styles.topicName}>{note.analysis.topic}</Text>
                </View>
                <View style={styles.gradeChip}>
                  <Text style={styles.gradeChipText}>{note.analysis.gradeLevel}</Text>
                </View>
              </View>

              {/* Completeness Score */}
              <View style={styles.completenessRow}>
                <View style={styles.completenessBarWrap}>
                  <View style={styles.completenessBar}>
                    <View
                      style={[
                        styles.completenessBarFill,
                        {
                          width: `${note.analysis.overallCompleteness}%` as any,
                          backgroundColor: getCompletenessColor(
                            note.analysis.overallCompleteness
                          ),
                        },
                      ]}
                    />
                  </View>
                </View>
                <View
                  style={[
                    styles.scoreCircle,
                    {
                      borderColor: getCompletenessColor(
                        note.analysis.overallCompleteness
                      ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreText,
                      {
                        color: getCompletenessColor(
                          note.analysis.overallCompleteness
                        ),
                      },
                    ]}
                  >
                    {note.analysis.overallCompleteness}%
                  </Text>
                  <Text style={styles.scoreLabel}>Score</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <Text style={[styles.statPillText, { color: "#DC2626" }]}>
                    {note.analysis.learningGaps.length} Gaps
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <Text style={[styles.statPillText, { color: "#16A34A" }]}>
                    {note.analysis.keyConcepts.length} Concepts
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Star size={14} color="#D97706" />
                  <Text style={[styles.statPillText, { color: "#D97706" }]}>
                    {note.analysis.strengthAreas.length} Strengths
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Key Concepts ── */}
            {note.analysis.keyConcepts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Key Concepts in Your Notes</Text>
                </View>
                <View style={styles.chipWrap}>
                  {note.analysis.keyConcepts.map((concept, i) => (
                    <ConceptChip key={i} label={concept} type="primary" />
                  ))}
                </View>
              </View>
            )}

            {/* ── Strength Areas ── */}
            {note.analysis.strengthAreas.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={18} color="#16A34A" />
                  <Text style={[styles.sectionTitle, { color: "#16A34A" }]}>
                    What You Did Well
                  </Text>
                </View>
                <View style={styles.chipWrap}>
                  {note.analysis.strengthAreas.map((area, i) => (
                    <ConceptChip key={i} label={area} type="success" />
                  ))}
                </View>
              </View>
            )}

            {/* ── Learning Gaps (Core Feature) ── */}
            {note.analysis.learningGaps.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Target size={18} color="#DC2626" />
                  <Text style={[styles.sectionTitle, { color: "#DC2626" }]}>
                    Learning Gaps Detected
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  These are concepts missing or poorly explained in your notes.
                  Focus your revision here.
                </Text>
                {note.analysis.learningGaps.map((gap, i) => (
                  <View key={i} style={styles.gapCard}>
                    <View style={styles.gapCardHeader}>
                      <Text style={styles.gapConcept}>{gap.concept}</Text>
                      <SeverityBadge severity={gap.severity} />
                    </View>
                    <View style={styles.gapSuggestionWrap}>
                      <Zap size={14} color={colors.primary} style={{ marginTop: 2 }} />
                      <Text style={styles.gapSuggestion}>{gap.suggestion}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Missing Concepts ── */}
            {note.analysis.missingConcepts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <AlertCircle size={18} color="#D97706" />
                  <Text style={[styles.sectionTitle, { color: "#D97706" }]}>
                    Missing from Your Notes
                  </Text>
                </View>
                <View style={styles.chipWrap}>
                  {note.analysis.missingConcepts.map((concept, i) => (
                    <ConceptChip key={i} label={concept} type="danger" />
                  ))}
                </View>
              </View>
            )}

            {/* ── Original Note Images (Collapsible Multi-Page Gallery) ── */}
            {(() => {
              const allPages =
                note.imageUrls && note.imageUrls.length > 0
                  ? note.imageUrls
                  : [note.imageUrl];

              return (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.collapseHeader}
                    onPress={() => setImageExpanded(!imageExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionTitleRow}>
                      <FileText size={18} color="#6B7280" />
                      <Text style={[styles.sectionTitle, { color: "#6B7280" }]}>
                        Original Note Image{allPages.length > 1 ? `s (${allPages.length} Pages)` : ""}
                      </Text>
                    </View>
                    {imageExpanded ? (
                      <ChevronUp size={18} color="#6B7280" />
                    ) : (
                      <ChevronDown size={18} color="#6B7280" />
                    )}
                  </TouchableOpacity>

                  {imageExpanded && (
                    <View style={{ marginTop: 12 }}>
                      {allPages.length > 1 ? (
                        <>
                          {/* Page Selector Tabs */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.pageTabList}
                          >
                            {allPages.map((_, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.pageTab,
                                  selectedPageIndex === idx && styles.pageTabActive,
                                ]}
                                onPress={() => setSelectedPageIndex(idx)}
                              >
                                <Text
                                  style={[
                                    styles.pageTabText,
                                    selectedPageIndex === idx && styles.pageTabTextActive,
                                  ]}
                                >
                                  Page {idx + 1}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>

                          {/* Selected Page View */}
                          <View style={styles.noteImageWrap}>
                            <Image
                              source={{
                                uri: getNotesResourceUrl(allPages[selectedPageIndex] || allPages[0]),
                              }}
                              style={styles.noteImage}
                              resizeMode="contain"
                            />
                            <View style={styles.pageNumberOverlay}>
                              <Text style={styles.pageNumberOverlayText}>
                                Page {selectedPageIndex + 1} of {allPages.length}
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <Image
                          source={{ uri: getNotesResourceUrl(allPages[0]) }}
                          style={styles.noteImage}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* ── OCR Text (Collapsible) ── */}
            {note.rawText ? (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.collapseHeader}
                  onPress={() => setOcrExpanded(!ocrExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionTitleRow}>
                    <FileText size={18} color="#6B7280" />
                    <Text style={[styles.sectionTitle, { color: "#6B7280" }]}>
                      Extracted Text (OCR)
                    </Text>
                  </View>
                  {ocrExpanded ? (
                    <ChevronUp size={18} color="#6B7280" />
                  ) : (
                    <ChevronDown size={18} color="#6B7280" />
                  )}
                </TouchableOpacity>
                {ocrExpanded && (
                  <View style={styles.ocrTextBox}>
                    <Text style={styles.ocrText}>{note.rawText}</Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* ── Study Materials ── */}
            <View style={styles.section}>
              <View style={styles.materialsHeader}>
                <View style={styles.sectionTitleRow}>
                  <BookOpen size={18} color={colors.primaryBlack} />
                  <Text style={styles.sectionTitle}>Study Materials</Text>
                </View>
                {isGenerating && (
                  <View style={styles.generatingBadge}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.generatingBadgeText}>Generating…</Text>
                  </View>
                )}
                {!isGenerating && materialsOverview && materialsOverview.missingCount > 0 && (
                  <TouchableOpacity
                    style={styles.generateBtn}
                    onPress={triggerMaterialGeneration}
                  >
                    <Text style={styles.generateBtnText}>Re-generate</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isGenerating && (
                <View style={styles.generatingInfo}>
                  <Text style={styles.generatingInfoText}>
                    🤖 AI is generating all 7 study materials for you. This takes about 30–60 seconds…
                  </Text>
                </View>
              )}

              <View style={styles.materialsGrid}>
                <MaterialCard
                  icon={<BookOpen size={22} color="#3b82f6" />}
                  title="Structured Notes"
                  color="#3b82f6"
                  isReady={materialsOverview?.generatedTypes.includes("structured_notes") ?? false}
                  onPress={() => navigateToMaterial("structured_notes")}
                />
                <MaterialCard
                  icon={<Layers size={22} color="#8b5cf6" />}
                  title="Flashcards"
                  color="#8b5cf6"
                  isReady={materialsOverview?.generatedTypes.includes("flashcards") ?? false}
                  onPress={() => navigateToMaterial("flashcards")}
                />
                <MaterialCard
                  icon={<FileText size={22} color="#10b981" />}
                  title="Revision Summary"
                  color="#10b981"
                  isReady={materialsOverview?.generatedTypes.includes("revision_summary") ?? false}
                  onPress={() => navigateToMaterial("revision_summary")}
                />
                <MaterialCard
                  icon={<Target size={22} color="#ef4444" />}
                  title="Learning Points"
                  color="#ef4444"
                  isReady={materialsOverview?.generatedTypes.includes("learning_points") ?? false}
                  onPress={() => navigateToMaterial("learning_points")}
                />
                <MaterialCard
                  icon={<Play size={22} color="#f59e0b" />}
                  title="Audio Lesson"
                  color="#f59e0b"
                  isReady={materialsOverview?.generatedTypes.includes("audio") ?? false}
                  onPress={() => navigateToMaterial("audio")}
                />
                <MaterialCard
                  icon={<BookOpen size={22} color="#6366f1" />}
                  title="Key Definitions"
                  color="#6366f1"
                  isReady={materialsOverview?.generatedTypes.includes("definitions") ?? false}
                  onPress={() => navigateToMaterial("definitions")}
                />
                <MaterialCard
                  icon={<Layers size={22} color="#ec4899" />}
                  title="Mind Map"
                  color="#ec4899"
                  isReady={materialsOverview?.generatedTypes.includes("mindmap") ?? false}
                  onPress={() => navigateToMaterial("mindmap")}
                />
              </View>
            </View>

            <View style={{ height: 50 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
    gap: 12,
    padding: 40,
  },
  loadingText: { fontSize: 15, color: "#6B7280", fontFamily: "Author-Medium" },
  errorText: { fontSize: 16, color: "#6B7280", fontFamily: "Author-Medium", textAlign: "center" },
  backBtn: {
    marginTop: 12,
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: "#fff", fontFamily: "Author-Medium", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },

  scroll: { flex: 1 },

  // Processing
  processingCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  processingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  processingTitle: {
    fontSize: 18,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 8,
    textAlign: "center",
  },
  processingText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Author-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  pipelineSteps: { alignSelf: "stretch", gap: 8 },
  pipelineStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  pipelineDot: { width: 8, height: 8, borderRadius: 4 },
  pipelineStepText: { fontSize: 13, color: "#6B7280", fontFamily: "Author-Medium" },

  // Summary card
  summaryCard: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  subjectIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  subjectName: {
    fontSize: 18,
    fontFamily: "Author-Bold",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  topicName: { fontSize: 13, color: "#6B7280", fontFamily: "Author-Medium" },
  gradeChip: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  gradeChipText: {
    fontSize: 11,
    fontFamily: "Author-SemiBold",
    color: colors.primary,
  },
  completenessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  completenessBarWrap: { flex: 1 },
  completenessBar: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  completenessBarFill: { height: "100%", borderRadius: 4 },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: { fontSize: 16, fontFamily: "Author-Bold" },
  scoreLabel: { fontSize: 9, color: "#94A3B8", fontFamily: "Author-Medium" },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statPillText: { fontSize: 12, fontFamily: "Author-SemiBold" },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Author-Regular",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Author-Medium" },

  // Gap cards
  gapCard: {
    backgroundColor: "#FFFBF7",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  gapConcept: {
    fontSize: 15,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  severityText: { fontSize: 11, fontFamily: "Author-SemiBold" },
  gapSuggestionWrap: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 10,
  },
  gapSuggestion: {
    fontSize: 13,
    color: "#78350F",
    fontFamily: "Author-Regular",
    lineHeight: 20,
    flex: 1,
  },

  // Collapsible
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ocrTextBox: {
    marginTop: 12,
    backgroundColor: "#F8F9FB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ocrText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: "Author-Regular",
    lineHeight: 22,
  },
  noteImage: {
    width: "100%",
    height: 320,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  noteImageWrap: {
    position: "relative",
    width: "100%",
  },
  pageTabList: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 8,
  },
  pageTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pageTabActive: {
    backgroundColor: colors.primaryBlack,
    borderColor: colors.primaryBlack,
  },
  pageTabText: {
    fontSize: 12,
    fontFamily: "Author-Medium",
    color: "#64748B",
  },
  pageTabTextActive: {
    color: "#FFFFFF",
  },
  pageNumberOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageNumberOverlayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Author-SemiBold",
  },

  // Materials
  materialsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  generateBtn: {
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  generateBtnText: { color: "#fff", fontSize: 12, fontFamily: "Author-Medium" },
  generatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  generatingBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Author-Medium" },
  generatingInfo: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  generatingInfoText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: "Author-Regular",
    lineHeight: 20,
  },
  materialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  materialCard: {
    width: "48%",
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  materialCardDisabled: { opacity: 0.55 },
  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  materialTitle: {
    fontSize: 13,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 6,
  },
  materialStatusDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
