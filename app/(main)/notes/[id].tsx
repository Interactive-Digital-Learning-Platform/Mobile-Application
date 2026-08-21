import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Brain,
  BookOpen,
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
import SeverityBadge from "@/components/notes/SeverityBadge";

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

// ─── Processing Pipeline Card ────────────────────────────────────────────────

const PIPELINE_STAGES_INFO = [
  {
    label: "Scanning Handwriting",
    detail: "Running optical character recognition on your images…",
    estimatedEndSec: 12,
  },
  {
    label: "Detecting Subject & Grade",
    detail: "Identifying subject area, topic, and curriculum level…",
    estimatedEndSec: 24,
  },
  {
    label: "Matching Curriculum",
    detail: "Searching the curriculum knowledge base for relevant content…",
    estimatedEndSec: 37,
  },
  {
    label: "Analyzing Learning Gaps",
    detail: "Calculating concept coverage and identifying missing knowledge…",
    estimatedEndSec: 50,
  },
  {
    label: "Building Study Materials",
    detail: "Generating personalized flashcards, quizzes, and summaries…",
    estimatedEndSec: 65,
  },
];

const EST_TOTAL_SECS = 65;

const ProcessingCard: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulsing "LIVE" badge animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Elapsed timer — ticks every second
  useEffect(() => {
    const startTime = new Date(createdAt).getTime();
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSec(elapsed);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Smooth progress bar animation (capped at 92% until server confirms done)
  useEffect(() => {
    const capped = Math.min((elapsedSec / EST_TOTAL_SECS) * 100, 92);
    Animated.timing(progressAnim, {
      toValue: capped,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [elapsedSec]);

  // Determine active stage index
  const activeIdx = (() => {
    const i = PIPELINE_STAGES_INFO.findIndex((s) => elapsedSec < s.estimatedEndSec);
    return i === -1 ? PIPELINE_STAGES_INFO.length - 1 : i;
  })();

  const currentStage = PIPELINE_STAGES_INFO[activeIdx];
  const pct = Math.min(Math.round((elapsedSec / EST_TOTAL_SECS) * 100), 92);
  const etaSec = Math.max(0, EST_TOTAL_SECS - elapsedSec);
  const fmtTime = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <View style={styles.aiProgressCard}>
      {/* ── Header Row ── */}
      <View style={styles.aiProgressHeader}>
        <View style={styles.processingIconWrap}>
          <Brain size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.processingTitle}>AI Analysis in Progress</Text>
          <Text style={styles.processingSubtitle}>{fmtTime(elapsedSec)} elapsed</Text>
        </View>
        <Animated.View style={{ opacity: pulseAnim }}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </Animated.View>
      </View>

      {/* ── Animated Progress Bar ── */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </View>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressPct}>{pct}% complete</Text>
        <Text style={styles.progressEta}>~{fmtTime(etaSec)} remaining</Text>
      </View>

      {/* ── Current Stage Highlight ── */}
      <View style={styles.currentStageBox}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.currentStageLabel}>{currentStage.label}</Text>
          <Text style={styles.currentStageDetail} numberOfLines={2}>
            {currentStage.detail}
          </Text>
        </View>
      </View>

      {/* ── Stage Checklist ── */}
      <View style={styles.stageList}>
        {PIPELINE_STAGES_INFO.map((stage, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;
          return (
            <View key={idx} style={styles.stageRow}>
              <View
                style={[
                  styles.stageDot,
                  isDone
                    ? { backgroundColor: "#10b981" }
                    : isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: "#E2E8F0" },
                ]}
              >
                {isDone ? (
                  <CheckCircle2 size={12} color="#fff" />
                ) : isActive ? (
                  <ActivityIndicator size={10} color="#fff" />
                ) : null}
              </View>
              <Text
                style={[
                  styles.stageLabel,
                  isDone
                    ? { color: "#10b981", fontWeight: "600" }
                    : isActive
                    ? { color: colors.primary, fontWeight: "700" }
                    : { color: "#94A3B8", fontWeight: "400" },
                ]}
                numberOfLines={1}
              >
                {stage.label}
              </Text>
              {isDone && (
                <View style={styles.stageDoneBadge}>
                  <Text style={styles.stageDoneBadgeText}>Done</Text>
                </View>
              )}
              {isActive && (
                <View style={styles.stageActiveBadge}>
                  <Text style={styles.stageActiveBadgeText}>Running</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

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
      pathname: "/(main)/notes/material/[type]",
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
      <StatusBar backgroundColor="#F8F9FB" barStyle="dark-content" />
      {/* ── Top Back Button ── */}
      <View style={styles.topBackRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isProcessing && { flexGrow: 1, justifyContent: "center" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Processing State ── */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <View style={styles.processingHeaderBlock}>
              <Text style={styles.noteTitleHeading} numberOfLines={2}>
                {note.title}
              </Text>
              <Text style={styles.noteDateSub}>
                Uploaded {new Date(note.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <ProcessingCard createdAt={note.createdAt} />
            <Text style={styles.processingFooterHint}>
              ✦ Processing in background — you can stay or check back anytime
            </Text>
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
  loadingText: { fontSize: 15, color: "#6B7280", fontWeight: "500" },
  errorText: { fontSize: 16, color: "#6B7280", fontWeight: "500", textAlign: "center" },
  backBtn: {
    marginTop: 12,
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: "#fff", fontWeight: "500", fontSize: 14 },

  // Top Back Row
  topBackRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── AI Processing State ───────────────────────────────────────────────────
  processingContainer: {
    paddingVertical: 4,
  },
  processingHeaderBlock: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  noteTitleHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primaryBlack,
    marginBottom: 4,
    lineHeight: 28,
  },
  noteDateSub: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  aiProgressCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  aiProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  processingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  processingSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%" as any,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  progressEta: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  currentStageBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}08`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  currentStageLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 3,
  },
  currentStageDetail: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
    lineHeight: 18,
  },
  stageList: { gap: 6 },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stageLabel: { fontSize: 13, flex: 1 },
  stageDoneBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stageDoneBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16A34A",
  },
  stageActiveBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stageActiveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary,
  },
  processingFooterHint: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 24,
    letterSpacing: 0.2,
  },

  // ── Failed state card ────────────────────────────────────────────────────
  processingCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  processingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  // Summary card
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 8,
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
    fontWeight: "700",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  topicName: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  gradeChip: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  gradeChipText: {
    fontSize: 11,
    fontWeight: "600",
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
  scoreText: { fontSize: 16, fontWeight: "700" },
  scoreLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "500" },
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
  statPillText: { fontSize: 12, fontWeight: "600" },

  // Sections
  section: {
    marginHorizontal: 20,
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
    fontWeight: "600",
    color: colors.primaryBlack,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
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
  chipText: { fontSize: 12, fontWeight: "500" },

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
    fontWeight: "600",
    color: colors.primaryBlack,
    flex: 1,
  },

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
    fontWeight: "400",
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
    fontWeight: "400",
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pageTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  pageTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    fontWeight: "600",
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
  generateBtnText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  generatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  generatingBadgeText: { color: "#fff", fontSize: 12, fontWeight: "500" },
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
    fontWeight: "400",
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
    fontWeight: "600",
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
