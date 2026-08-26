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
  ChevronRight,
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
  Clock,
  Minimize2,
  Info,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { materialsApi, notesApi } from "@/api/notesAPI";
import { getNotesResourceUrl } from "@/api/apiClients";
import { colors } from "@/constants/colors";
import SeverityBadge from "@/components/notes/SeverityBadge";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 170;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PROCESSING_TIPS = [
  "Clear handwriting and good lighting yield the best diagram and text extraction.",
  "AI is identifying key topics and calculating your personalized curriculum coverage.",
  "Building tailored interactive flashcards, quizzes, and revision summaries…",
  "Analysis keeps running in the background — feel free to explore other tabs anytime!",
  "Pinpointing learning gaps so you know exactly which areas need more practice.",
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearningGap {
  concept: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

interface CoverageScores {
  simpleCoverage: number;
  weightedCoverage: number;
  totalConcepts: number;
  foundConcepts: number;
  missedConcepts: number;
  maxWeightedScore: number;
  achievedWeightedScore: number;
}

interface ExplainableGap {
  outcomeId: string;
  outcomeDescription: string;
  status: "achieved" | "partially_achieved" | "not_achieved";
  evidence: string;
  missingConcepts: Array<{
    id: string;
    name: string;
    weight: number;
    severity: "high" | "medium" | "low";
    category: string;
  }>;
  recommendation: string;
}

interface ExamReadiness {
  rating: "Excellent" | "Good" | "Needs Work" | "At Risk";
  highPriorityConceptsCoverage: number;
  frequentlyExaminedMissing: string[];
  revisionPriority: "Low" | "Medium" | "High" | "Critical";
  estimatedScoreRange: string;
}

interface Analysis {
  subject: string;
  topic: string;
  gradeLevel: string;
  unitNumber?: number;
  lessonNumber?: number;
  lessonId?: string;
  keyConcepts: string[];
  strengthAreas: string[];
  missingConcepts: string[];
  learningGaps: LearningGap[];
  explainableGaps?: ExplainableGap[];
  coverageScores?: CoverageScores;
  examReadiness?: ExamReadiness;
  ocrConfidence?: number;
  ocrLowQualityWarning?: boolean;
  textbookReference?: string;
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
  isGeneratingAll,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  isReady: boolean;
  isGeneratingAll?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.materialListRow, !isReady && styles.materialListRowDisabled]}
    onPress={isReady ? onPress : undefined}
    activeOpacity={0.75}
  >
    {/* Colored left accent */}
    <View style={[styles.materialListAccent, { backgroundColor: color }]} />
    {/* Icon */}
    <View style={[styles.materialListIconWrap, { backgroundColor: `${color}18` }]}>
      {icon}
    </View>
    {/* Label + meta */}
    <View style={styles.materialListBody}>
      <Text style={[styles.materialListLabel, !isReady && { color: "#94A3B8" }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.materialListMeta, { color: isReady ? "#10B981" : (isGeneratingAll ? color : "#94A3B8") }]}>
        {isReady ? "Ready — tap to open" : isGeneratingAll ? "Generating…" : "Not yet generated"}
      </Text>
    </View>
    {/* Right indicator */}
    <View style={styles.materialListRight}>
      {isReady ? (
        <ChevronRight size={18} color="#CBD5E1" />
      ) : isGeneratingAll ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.materialLockDot} />
      )}
    </View>
  </TouchableOpacity>
);

// ─── Processing Pipeline Card ────────────────────────────────────────────────

const PIPELINE_STAGES_INFO = [
  {
    label: "Scanning Handwriting",
    detail: "Running optical character recognition on your images…",
    estimatedEndSec: 8,
  },
  {
    label: "Detecting Subject & Grade",
    detail: "Identifying subject area, topic, and curriculum level…",
    estimatedEndSec: 16,
  },
  {
    label: "Matching Curriculum",
    detail: "Searching curriculum knowledge base & textbook passages…",
    estimatedEndSec: 24,
  },
  {
    label: "Analyzing Learning Gaps",
    detail: "Calculating concept coverage and identifying missing knowledge…",
    estimatedEndSec: 32,
  },
];

const EST_TOTAL_SECS = 32;

const ProcessingView: React.FC<{ createdAt: string; onBack: () => void }> = ({
  createdAt,
  onBack,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const progressAnim = React.useRef(new Animated.Value(0)).current;

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

  // Rotate helpful learning tips every 4.5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PROCESSING_TIPS.length);
    }, 4500);
    return () => clearInterval(tipInterval);
  }, []);

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

  const pct = Math.min(Math.round((elapsedSec / EST_TOTAL_SECS) * 100), 92);
  const etaSec = Math.max(0, EST_TOTAL_SECS - elapsedSec);
  const fmtTime = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [RING_CIRCUMFERENCE, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.fullScreenProcessing}>
      {/* ── Top Navigation Bar with clear background action ── */}
      <View style={styles.processingTopBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButtonWithLabel}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={colors.primaryBlack} />
          <Text style={styles.backLabelText}>Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBack}
          style={styles.runInBackgroundBtn}
          activeOpacity={0.8}
        >
          <Minimize2 size={13} color="#C2410C" />
          <Text style={styles.runInBackgroundText}>Run in Background</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.processingScrollView}
        contentContainerStyle={styles.processingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Circular Progress & Brain Hero Section ── */}
        <View style={styles.processingHero}>
          <View style={styles.circleProgressWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.circleSvg}>
              {/* Background Track Circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="#E2E8F0"
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              {/* Animated Progress Circle */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="#EA580C"
                strokeWidth={RING_STROKE}
                fill="transparent"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
              />
            </Svg>

            {/* Inner Content (Bottom-to-Top Filling Core + Static Brain Icon + Percentage + ETA) */}
            <View style={styles.circleInnerContent}>
              {/* Bottom-to-Top Animated Core Fill */}
              <Animated.View
                style={[
                  styles.circleCoreFill,
                  {
                    height: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                      extrapolate: "clamp",
                    }),
                  },
                ]}
              />

              {/* Static Content Layer */}
              <View style={styles.circleContentLayer}>
                <Brain size={30} color="#EA580C" strokeWidth={2.2} />
                <Text style={styles.circlePctText}>{pct}%</Text>
                <Text style={styles.circleEtaText}>~{fmtTime(etaSec)} left</Text>
              </View>
            </View>
          </View>

          <Text style={styles.processingMainTitle}>Analysis in Progress</Text>
          <Text style={styles.processingMainSubtitle}>
            Extracting handwritten content & analyzing curriculum gaps
          </Text>

          {/* Rotating Educational Tip Card */}
          <View style={styles.tipCard}>
            <Sparkles size={14} color="#EA580C" style={{ marginTop: 2 }} />
            <Text style={styles.tipText} numberOfLines={2}>
              {PROCESSING_TIPS[tipIndex]}
            </Text>
          </View>
        </View>

        {/* ── Pipeline Stages Section (Directly below Hero) ── */}
        <View style={styles.pipelineSection}>
          <View style={styles.pipelineHeaderRow}>
            <Text style={styles.pipelineSectionTitle}>ANALYSIS PIPELINE</Text>
            <View style={styles.pipelineElapsedBadge}>
              <Clock size={11} color="#64748B" />
              <Text style={styles.pipelineElapsedText}>{fmtTime(elapsedSec)} elapsed</Text>
            </View>
          </View>

          <View style={styles.pipelineList}>
            {PIPELINE_STAGES_INFO.map((stage, idx) => {
              const isDone = idx < activeIdx;
              const isActive = idx === activeIdx;

              return (
                <View
                  key={idx}
                  style={[
                    styles.pipelineCard,
                    isDone && styles.pipelineCardDone,
                    isActive && styles.pipelineCardActive,
                  ]}
                >
                  <View
                    style={[
                      styles.pipelineDotWrap,
                      isDone && styles.pipelineDotDone,
                      isActive && styles.pipelineDotActive,
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={15} color="#fff" strokeWidth={2.5} />
                    ) : isActive ? (
                      <ActivityIndicator size={12} color="#fff" />
                    ) : (
                      <Text style={styles.pipelineIndexText}>{idx + 1}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pipelineStageName,
                        isDone && styles.pipelineStageNameDone,
                        isActive && styles.pipelineStageNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {stage.label}
                    </Text>
                    {isActive && (
                      <Text style={styles.pipelineStageDesc} numberOfLines={2}>
                        {stage.detail}
                      </Text>
                    )}
                  </View>

                  {isDone && (
                    <View style={styles.stageDonePill}>
                      <Text style={styles.stageDonePillText}>Done</Text>
                    </View>
                  )}
                  {isActive && (
                    <View style={styles.stageActivePill}>
                      <Text style={styles.stageActivePillText}>Running</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Footer Background Notice ── */}
        <Text style={styles.processingBottomHint}>
          ✦ Processing continues in the background — you can safely leave this screen anytime
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const scrollViewRef = React.useRef<ScrollView>(null);
  const gapsSectionY = React.useRef<number>(0);

  const [note, setNote] = useState<Note | null>(null);
  const [materialsOverview, setMaterialsOverview] = useState<MaterialsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [gapsExpanded, setGapsExpanded] = useState(false);
  const [priorityGapExplainerOpen, setPriorityGapExplainerOpen] = useState(false);
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const [expandedGapIndices, setExpandedGapIndices] = useState<Record<number, boolean>>({});
  // Guard: ensure auto-generate fires only once per screen mount
  const hasTriggeredGeneration = React.useRef(false);

  const status = note?.status ?? "loading";
  const isProcessing = status === "uploaded" || status === "processing";
  const isFailed = status === "failed";
  const isAnalyzed = status === "analyzed";

  const toggleGapExpand = useCallback((index: number) => {
    setExpandedGapIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const scrollToGaps = useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, gapsSectionY.current - 16),
      animated: true,
    });
  }, []);

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

  // ── Manual / Re-trigger material generation ─────────────────────────────────
  const triggerMaterialGeneration = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      console.log("⚙️ Triggering material generation...");
      await materialsApi.generateMaterials(id);
      // Wait a moment then fetch materials
      setTimeout(fetchMaterials, 2000);
    } catch (error) {
      console.error("Material generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [id, isGenerating, fetchMaterials]);

  // ── Polling note while processing ───────────────────────────────────────────
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(fetchNote, 3000);
    return () => clearInterval(interval);
  }, [isProcessing, fetchNote]);

  // ── When analysis is done, fetch materials & poll while missingCount > 0 ────
  useEffect(() => {
    if (!isAnalyzed) return;
    fetchMaterials();
  }, [isAnalyzed, fetchMaterials]);

  useEffect(() => {
    if (!isAnalyzed) return;
    // Stop polling if all materials have been generated
    if (materialsOverview && materialsOverview.missingCount === 0 && materialsOverview.generatedTypes.length > 0) {
      return;
    }

    // Poll periodically while materials are being generated in the background
    const interval = setInterval(() => {
      fetchMaterials();
    }, 3500);

    return () => clearInterval(interval);
  }, [isAnalyzed, materialsOverview?.missingCount, materialsOverview?.generatedTypes.length, fetchMaterials]);

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
  if (isProcessing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F8F9FB" barStyle="dark-content" />
        <ProcessingView createdAt={note.createdAt} onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8F9FB" barStyle="dark-content" />

      {/* ── Sticky Hero Header ── */}
      <View style={styles.noteHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color="#0F172A" />
          <Text style={styles.headerBackLabel}>Notes</Text>
        </TouchableOpacity>
        <View style={styles.headerStatusBadge}>
          <CheckCircle2 size={13} color="#15803D" />
          <Text style={styles.headerStatusText}>Analyzed</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Failed State ── */}
        {isFailed && (
          <View style={styles.failedCard}>
            <View style={styles.failedIconWrap}>
              <AlertCircle size={36} color="#DC2626" />
            </View>
            <Text style={styles.failedTitle}>Analysis Failed</Text>
            <Text style={styles.failedText}>
              {note.errorMessage || "Could not process this image. Please ensure the image is clear and try uploading again."}
            </Text>
            <TouchableOpacity style={styles.failedRetryBtn} onPress={() => router.back()}>
              <Text style={styles.failedRetryText}>Go Back & Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Analyzed State ── */}
        {isAnalyzed && note.analysis && (
          <>
            {/* ── 1. Top Summary Card (Improvement 1) ── */}
            {(() => {
              const score = note.analysis.overallCompleteness;
              const scoreColor = getCompletenessColor(score);
              const totalConcepts =
                note.analysis.coverageScores?.totalConcepts ||
                (note.analysis.keyConcepts.length + note.analysis.missingConcepts.length);
              const coveredCount =
                note.analysis.coverageScores?.foundConcepts ?? note.analysis.keyConcepts.length;
              const highPriorityGapsCount = note.analysis.learningGaps.filter(
                (g) => g.severity === "high"
              ).length;
              const attentionCount =
                note.analysis.missingConcepts.length || note.analysis.learningGaps.length;

              const ringR = 40;
              const ringC = 2 * Math.PI * ringR;
              const offset = ringC * (1 - score / 100);

              const lessonNum =
                note.analysis.unitNumber ||
                note.analysis.lessonNumber ||
                (() => {
                  const ref = note.analysis.textbookReference || "";
                  const refMatch = ref.match(/(?:Unit|Lesson)\s*(\d+)/i);
                  if (refMatch) return parseInt(refMatch[1], 10);

                  const topic = note.analysis.topic || "";
                  const topicMatch = topic.match(/^(?:Unit|Lesson)?\s*(\d+)[\.\:\-]/i);
                  if (topicMatch) return parseInt(topicMatch[1], 10);

                  const lessonId = note.analysis.lessonId || "";
                  const idMatch = lessonId.match(/(?:u|unit|lesson)[-_]?0*(\d+)/i);
                  if (idMatch) return parseInt(idMatch[1], 10);

                  return null;
                })();

              const lessonBadgeText = lessonNum ? `Lesson ${lessonNum}` : null;

              return (
                <View style={styles.topSummaryCard}>
                  {/* Subject, Grade & Lesson Header */}
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryHeaderTopRow}>
                      <View style={styles.subjectPill}>
                        <BookOpen size={12} color={colors.primary} />
                        <Text style={styles.subjectPillText}>
                          {note.analysis.subject} · {note.analysis.gradeLevel}
                          {lessonNum ? ` · Lesson ${String(lessonNum).padStart(2, "0")}` : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.summaryTopicTitle} numberOfLines={2}>
                      {note.analysis.topic}
                    </Text>
                  </View>

                  {/* Main Stats: Circle Ring on Left, Explicit Breakdown on Right */}
                  <View style={styles.summaryBodyRow}>
                    <View style={styles.heroScoreRingWrap}>
                      <Svg width={100} height={100}>
                        <Circle cx={50} cy={50} r={ringR} stroke="#F1F5F9" strokeWidth={9} fill="transparent" />
                        <Circle
                          cx={50}
                          cy={50}
                          r={ringR}
                          stroke={scoreColor}
                          strokeWidth={9}
                          fill="transparent"
                          strokeDasharray={`${ringC} ${ringC}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          transform="rotate(-90, 50, 50)"
                        />
                      </Svg>
                      <View style={styles.heroScoreRingInner}>
                        <Text style={[styles.heroScorePct, { color: scoreColor }]}>{score}%</Text>
                        <Text style={styles.heroScoreLabel}>Curriculum</Text>
                        <Text style={styles.heroScoreLabel}>Coverage</Text>
                      </View>
                    </View>

                    <View style={styles.summaryStatsCol}>
                      <View style={styles.statLineItem}>
                        <View style={[styles.statDot, { backgroundColor: "#DCFCE7" }]}>
                          <CheckCircle2 size={13} color="#16A34A" />
                        </View>
                        <Text style={styles.statLineText}>
                          <Text style={styles.statLineBold}>{coveredCount}/{totalConcepts}</Text> concepts covered
                        </Text>
                      </View>

                      {attentionCount > 0 && (
                        <View style={styles.statLineItem}>
                          <View style={[styles.statDot, { backgroundColor: "#FEF3C7" }]}>
                            <AlertTriangle size={13} color="#D97706" />
                          </View>
                          <Text style={styles.statLineText}>
                            <Text style={styles.statLineBold}>{attentionCount}</Text> need{attentionCount === 1 ? "s" : ""} attention
                          </Text>
                        </View>
                      )}

                      {highPriorityGapsCount > 0 ? (
                        <View style={styles.statLineItem}>
                          <View style={[styles.statDot, { backgroundColor: "#FEE2E2" }]}>
                            <Target size={13} color="#DC2626" />
                          </View>
                          <Text style={styles.statLineText}>
                            <Text style={[styles.statLineBold, { color: "#DC2626" }]}>{highPriorityGapsCount}</Text> high-priority gap{highPriorityGapsCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.statLineItem}>
                          <View style={[styles.statDot, { backgroundColor: "#DCFCE7" }]}>
                            <Sparkles size={13} color="#16A34A" />
                          </View>
                          <Text style={styles.statLineText}>
                            <Text style={styles.statLineBold}>0</Text> critical gaps
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Quick Action CTAs */}
                  <View style={styles.summaryActionsRow}>
                    <TouchableOpacity
                      style={styles.summarySecondaryBtn}
                      onPress={scrollToGaps}
                      activeOpacity={0.8}
                    >
                      <Target size={14} color="#475569" />
                      <Text style={styles.summarySecondaryBtnText}>View Learning Gaps</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.summaryPrimaryBtn}
                      onPress={() => navigateToMaterial("structured_notes")}
                      activeOpacity={0.85}
                    >
                      <Zap size={14} color="#FFFFFF" />
                      <Text style={styles.summaryPrimaryBtnText}>Start Revision</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── 2. Priority Learning Gap Card (Improvement 2) ── */}
            {note.analysis.learningGaps.length > 0 && (() => {
              const topGap =
                note.analysis.learningGaps.find((g) => g.severity === "high") ||
                note.analysis.learningGaps.find((g) => g.severity === "medium") ||
                note.analysis.learningGaps[0];

              const topExplainableGap =
                note.analysis.explainableGaps?.find(
                  (eg) =>
                    eg.outcomeDescription === topGap.concept ||
                    eg.missingConcepts.some((mc) => topGap.concept.includes(mc.name))
                ) || note.analysis.explainableGaps?.[0];

              const isHigh = topGap.severity === "high";
              const isMedium = topGap.severity === "medium";

              const missingList =
                topExplainableGap && topExplainableGap.missingConcepts.length > 0
                  ? topExplainableGap.missingConcepts.map((c) => c.name)
                  : topGap.concept.split(/[,/]/).map((s) => s.trim()).filter(Boolean);

              const outcomeStatusText =
                topExplainableGap?.status === "not_achieved"
                  ? "Not Achieved"
                  : topExplainableGap?.status === "partially_achieved"
                  ? "Partially Achieved"
                  : isHigh
                  ? "Not Achieved"
                  : "Partially Achieved";

              const outcomeStatusColor =
                outcomeStatusText === "Not Achieved"
                  ? { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" }
                  : { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" };

              return (
                <View style={styles.priorityGapCard}>
                  {/* Header Tag + Importance Badge */}
                  <View style={styles.priorityGapHeaderRow}>
                    <View style={styles.priorityGapTag}>
                      <AlertTriangle size={13} color="#DC2626" />
                      <Text style={styles.priorityGapTagText}>PRIORITY LEARNING GAP</Text>
                    </View>
                    <View
                      style={[
                        styles.priorityGapSeverityBadge,
                        {
                          backgroundColor: isHigh ? "#FEE2E2" : isMedium ? "#FEF3C7" : "#DBEAFE",
                          borderColor: isHigh ? "#FECACA" : isMedium ? "#FDE68A" : "#BFDBFE",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityGapSeverityText,
                          { color: isHigh ? "#DC2626" : isMedium ? "#D97706" : "#2563EB" },
                        ]}
                      >
                        {isHigh ? "🔴 HIGH PRIORITY" : isMedium ? "🟠 NEEDS ATTENTION" : "🟡 REVIEW RECOMMENDED"}
                      </Text>
                    </View>
                  </View>

                  {/* Main Concept / Outcome Name */}
                  <Text style={styles.priorityGapConceptName}>
                    {topExplainableGap?.outcomeDescription || topGap.concept}
                  </Text>

                  {/* Why this is a gap block */}
                  <View style={styles.whyGapBox}>
                    <View style={styles.whyGapTitleRow}>
                      <Target size={13} color="#475569" />
                      <Text style={styles.whyGapTitle}>Why this is a gap</Text>
                    </View>
                    <Text style={styles.whyGapExplanation}>
                      {topExplainableGap && topExplainableGap.missingConcepts.length > 0
                        ? `Key required concepts are missing from your handwritten notes for this learning outcome.`
                        : `Your notes have incomplete coverage for this core syllabus requirement.`}
                    </Text>

                    {/* Missing concepts bullet list */}
                    {missingList.length > 0 && (
                      <View style={styles.priorityMissingList}>
                        <Text style={styles.priorityMissingLabel}>Missing concepts:</Text>
                        {missingList.map((conceptName, idx) => (
                          <View key={idx} style={styles.priorityMissingItem}>
                            <View style={styles.priorityMissingCross}>
                              <Text style={styles.priorityMissingCrossText}>✕</Text>
                            </View>
                            <Text style={styles.priorityMissingItemText}>{conceptName}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Status indicator row */}
                    <View style={styles.outcomeStatusRow}>
                      <Text style={styles.outcomeStatusLabel}>Learning Outcome:</Text>
                      <View
                        style={[
                          styles.outcomeStatusBadge,
                          {
                            backgroundColor: outcomeStatusColor.bg,
                            borderColor: outcomeStatusColor.border,
                          },
                        ]}
                      >
                        <Text style={[styles.outcomeStatusText, { color: outcomeStatusColor.text }]}>
                          {outcomeStatusText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Expandable Explanation (Why was this detected?) */}
                  {priorityGapExplainerOpen && (
                    <View style={styles.explainerDrawer}>
                      {topExplainableGap?.evidence ? (
                        <View style={styles.explainerSection}>
                          <Text style={styles.explainerSubhead}>Evidence found in your notes:</Text>
                          <View style={styles.explainerQuoteBox}>
                            <Text style={styles.explainerQuoteText}>"{topExplainableGap.evidence}"</Text>
                          </View>
                        </View>
                      ) : null}

                      <View style={styles.explainerSection}>
                        <Text style={styles.explainerSubhead}>System Recommendation:</Text>
                        <Text style={styles.explainerRecommendationText}>
                          {topExplainableGap?.recommendation || topGap.suggestion}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Card Action Buttons */}
                  <View style={styles.priorityGapActionsRow}>
                    <TouchableOpacity
                      style={styles.priorityGapExplainerBtn}
                      onPress={() => setPriorityGapExplainerOpen(!priorityGapExplainerOpen)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.priorityGapExplainerBtnText}>
                        {priorityGapExplainerOpen ? "Hide Explanation ▲" : "See Why Detected ▼"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.priorityGapReviewBtn}
                      onPress={() => navigateToMaterial("structured_notes")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.priorityGapReviewBtnText}>Start Reviewing →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── 3. Learning Gaps ── */}
            {note.analysis.learningGaps.length > 0 && (
              <View
                style={styles.section}
                onLayout={(e) => {
                  gapsSectionY.current = e.nativeEvent.layout.y;
                }}
              >
                {/* Section Header */}
                <View style={styles.gapsSectionHeader}>
                  <View style={styles.gapsSectionTitleWrap}>
                    <AlertCircle size={16} color={colors.primary} />
                    <Text style={styles.gapsSectionTitle}>Learning Gaps</Text>
                  </View>
                  <View style={styles.gapCountPill}>
                    <Text style={styles.gapCountPillText}>{note.analysis.learningGaps.length}</Text>
                  </View>
                </View>

                <Text style={styles.sectionSubtitle}>
                  Concepts from the official curriculum not adequately covered in your notes
                </Text>

                <View style={styles.gapsList}>
                {(gapsExpanded
                  ? note.analysis.learningGaps
                  : note.analysis.learningGaps.slice(0, 3)
                ).map((gap, i) => {
                  const isCardExpanded = !!expandedGapIndices[i];
                  const isHigh = gap.severity === "high";
                  const borderColor = isHigh ? colors.primary : colors.borderColorLight;

                  const matchedExplainable =
                    note?.analysis?.explainableGaps?.find(
                      (eg) =>
                        eg.outcomeDescription.toLowerCase() === gap.concept.toLowerCase() ||
                        eg.missingConcepts.some((mc) => gap.concept.toLowerCase().includes(mc.name.toLowerCase()))
                    ) || note?.analysis?.explainableGaps?.[i];

                  const missingList =
                    matchedExplainable && matchedExplainable.missingConcepts.length > 0
                      ? matchedExplainable.missingConcepts.map((c) => c.name)
                      : gap.concept.split(/[,/]/).map((s) => s.trim()).filter(Boolean);

                  const statusText =
                    matchedExplainable?.status === "not_achieved"
                      ? "Not Achieved"
                      : matchedExplainable?.status === "partially_achieved"
                      ? "Partially Achieved"
                      : isHigh
                      ? "Not Achieved"
                      : "Partially Achieved";

                  return (
                    <View key={i} style={[styles.gapCard, { borderLeftColor: borderColor }]}>

                      {/* Card Header: title + priority badge */}
                      <View style={styles.gapCardHeader}>
                        <Text style={styles.gapConcept} numberOfLines={2}>
                          {matchedExplainable?.outcomeDescription || gap.concept}
                        </Text>
                        <SeverityBadge severity={gap.severity} />
                      </View>

                      {/* Missing concepts — inline text list */}
                      {missingList.length > 0 && (
                        <View style={styles.gapMissingRow}>
                          <Text style={styles.gapMissingLabel}>Not covered: </Text>
                          <Text style={styles.gapMissingValue} numberOfLines={2}>
                            {missingList.join(" · ")}
                          </Text>
                        </View>
                      )}

                      {/* Divider + footer: status + toggle */}
                      <View style={styles.gapCardDivider} />
                      <View style={styles.gapCardFooterRow}>
                        <Text style={styles.gapStatusText}>{statusText}</Text>
                        <TouchableOpacity
                          onPress={() => toggleGapExpand(i)}
                          style={styles.gapToggleBtn}
                          activeOpacity={0.7}
                        >
                          {isCardExpanded
                            ? <ChevronUp size={16} color={colors.primary} />
                            : <ChevronDown size={16} color={colors.primary} />
                          }
                          <Text style={styles.gapToggleBtnText}>
                            {isCardExpanded ? "Less" : "Details"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Expandable details */}
                      {isCardExpanded && (
                        <View style={styles.gapDetailsDrawer}>

                          {/* Evidence from note */}
                          {matchedExplainable?.evidence ? (
                            <View style={styles.gapDetailBlock}>
                              <View style={styles.gapDetailLabelRow}>
                                <FileText size={12} color="#64748B" />
                                <Text style={styles.gapDetailLabel}>Found in your notes</Text>
                              </View>
                              <View style={styles.gapEvidenceQuote}>
                                <Text style={styles.gapEvidenceQuoteText}>{matchedExplainable.evidence}</Text>
                              </View>
                            </View>
                          ) : null}

                          {/* Missing concepts — numbered */}
                          {missingList.length > 0 && (
                            <View style={styles.gapDetailBlock}>
                              <View style={styles.gapDetailLabelRow}>
                                <AlertCircle size={12} color="#64748B" />
                                <Text style={styles.gapDetailLabel}>Concepts not covered</Text>
                              </View>
                              {missingList.map((cName, cIdx) => (
                                <View key={cIdx} style={styles.gapMissingItem}>
                                  <Text style={styles.gapMissingItemNum}>{cIdx + 1}.</Text>
                                  <Text style={styles.gapMissingItemText}>{cName}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Study recommendation */}
                          <View style={styles.gapDetailBlock}>
                            <View style={styles.gapDetailLabelRow}>
                              <BookOpen size={12} color="#64748B" />
                              <Text style={styles.gapDetailLabel}>What to study</Text>
                            </View>
                            <Text style={styles.gapRecommendationText}>
                              {matchedExplainable?.recommendation || gap.suggestion}
                            </Text>
                          </View>

                          {/* Review CTA */}
                          <TouchableOpacity
                            style={styles.gapStudyBtn}
                            onPress={() => navigateToMaterial("structured_notes")}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.gapStudyBtnText}>Start Reviewing</Text>
                            <ChevronRight size={15} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
                </View>

                {note.analysis.learningGaps.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllGapsBtn}
                    onPress={() => setGapsExpanded(!gapsExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllGapsText}>
                      {gapsExpanded
                        ? "Show less"
                        : `View all ${note.analysis.learningGaps.length} gaps`}
                    </Text>
                    {gapsExpanded
                      ? <ChevronUp size={14} color={colors.primary} />
                      : <ChevronDown size={14} color={colors.primary} />
                    }
                  </TouchableOpacity>
                )}

                {/* ── Educational Disclaimer / About this analysis (Improvement 13) ── */}
                <View style={styles.gapDisclaimerBox}>
                  <View style={styles.gapDisclaimerHeader}>
                    <Info size={13} color="#64748B" />
                    <Text style={styles.gapDisclaimerTitle}>About this analysis</Text>
                  </View>
                  <Text style={styles.gapDisclaimerText}>
                    Gaps are estimated by comparing your uploaded notes with curriculum standards. Gaps highlight concepts not sufficiently evidenced in your notes and do not necessarily indicate a lack of understanding.
                  </Text>
                </View>
              </View>
            )}

            {/* ── 4. What You Covered Well (Strengths - Improvement 6) ── */}
            {((note.analysis.strengthAreas && note.analysis.strengthAreas.length > 0) ||
              (note.analysis.keyConcepts && note.analysis.keyConcepts.length > 0)) && (() => {
              const strengths =
                note.analysis.strengthAreas && note.analysis.strengthAreas.length > 0
                  ? note.analysis.strengthAreas
                  : note.analysis.keyConcepts.slice(0, 4);

              return (
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <TrendingUp size={17} color="#16A34A" />
                    <Text style={[styles.sectionTitle, { color: "#16A34A" }]}>What You Covered Well</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    {strengths.length} concept{strengths.length !== 1 ? "s" : ""} adequately covered in your handwritten notes
                  </Text>
                  <View style={styles.strengthList}>
                    {strengths.map((area, i) => (
                      <View key={i} style={styles.strengthCard}>
                        <View style={styles.strengthHeaderRow}>
                          <View style={styles.strengthIconWrap}>
                            <CheckCircle2 size={16} color="#16A34A" />
                          </View>
                          <Text style={styles.strengthTitle}>{area}</Text>
                        </View>

                        {/* Verified Status Badges */}
                        <View style={styles.strengthBadgesWrap}>
                          <View style={styles.strengthBadgeItem}>
                            <Text style={styles.strengthBadgeText}>✓ Concept adequately covered</Text>
                          </View>
                          <View style={styles.strengthBadgeItem}>
                            <Text style={styles.strengthBadgeText}>✓ Learning outcome verified</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* ── 5. Curriculum Coverage & Visual Concept Map (Improvement 7 & 8) ── */}
            {(note.analysis.keyConcepts.length > 0 || note.analysis.missingConcepts.length > 0) && (() => {
              const coveredConcepts = note.analysis.keyConcepts || [];
              const missingConcepts = note.analysis.missingConcepts || [];
              const totalCount = coveredConcepts.length + missingConcepts.length;
              const score = note.analysis.overallCompleteness;
              const scoreColor = getCompletenessColor(score);
              const coveredPct = totalCount > 0 ? Math.round((coveredConcepts.length / totalCount) * 100) : 0;
              const missingPct = totalCount > 0 ? 100 - coveredPct : 0;

              return (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <BookOpen size={17} color={colors.primaryBlack} />
                      <Text style={styles.sectionTitle}>Curriculum Coverage</Text>
                    </View>
                    <View style={[styles.coverageScoreBadge, { backgroundColor: `${scoreColor}15`, borderColor: `${scoreColor}40` }]}>
                      <Text style={[styles.coverageScoreText, { color: scoreColor }]}>{score}%</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionSubtitle}>
                    {totalCount} total concepts mapped to official curriculum standards
                  </Text>

                  {/* ── Multi-Segment Visual Concept Coverage Bar (Improvement 8) ── */}
                  <View style={styles.coverageBarContainer}>
                    <View style={styles.coverageBarTrack}>
                      <View style={[styles.coverageBarCovered, { flex: coveredConcepts.length || 1 }]} />
                      {missingConcepts.length > 0 && (
                        <View style={[styles.coverageBarMissing, { flex: missingConcepts.length }]} />
                      )}
                    </View>
                    <View style={styles.coverageBarLegendRow}>
                      <View style={styles.coverageBarLegendItem}>
                        <View style={styles.coverageLegendDotCovered} />
                        <Text style={styles.coverageBarLegendText}>Covered: {coveredConcepts.length} ({coveredPct}%)</Text>
                      </View>
                      <View style={styles.coverageBarLegendItem}>
                        <View style={styles.coverageLegendDotMissing} />
                        <Text style={styles.coverageBarLegendText}>Missing: {missingConcepts.length} ({missingPct}%)</Text>
                      </View>
                    </View>
                  </View>


                  {/* Compact 3-Column Summary Tiles */}
                  <View style={styles.coverageSummaryRow}>
                    <View style={[styles.coverageSummaryTile, { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" }]}>
                      <CheckCircle2 size={14} color="#16A34A" />
                      <Text style={[styles.coverageSummaryNum, { color: "#16A34A" }]}>{coveredConcepts.length}</Text>
                      <Text style={styles.coverageSummaryLabel}>Covered</Text>
                    </View>

                    <View style={[styles.coverageSummaryTile, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}>
                      <AlertCircle size={14} color="#DC2626" />
                      <Text style={[styles.coverageSummaryNum, { color: "#DC2626" }]}>{missingConcepts.length}</Text>
                      <Text style={styles.coverageSummaryLabel}>Missing</Text>
                    </View>

                    <View style={[styles.coverageSummaryTile, { borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }]}>
                      <Layers size={14} color="#64748B" />
                      <Text style={[styles.coverageSummaryNum, { color: "#334155" }]}>{totalCount}</Text>
                      <Text style={styles.coverageSummaryLabel}>Total</Text>
                    </View>
                  </View>

                  {/* Expand / Collapse Toggle Button */}
                  <TouchableOpacity
                    style={styles.coverageToggleBtn}
                    onPress={() => setCoverageExpanded(!coverageExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.coverageToggleBtnText}>
                      {coverageExpanded ? "Hide Concept Breakdown ▲" : `View All ${totalCount} Concepts with Progress ▼`}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Grouped Concept Sections with Progress Bars */}
                  {coverageExpanded && (
                    <View style={styles.coverageGroupedContainer}>
                      {/* Covered Group */}
                      {coveredConcepts.length > 0 && (
                        <View style={styles.coverageGroupBlock}>
                          <View style={styles.coverageGroupHeader}>
                            <CheckCircle2 size={14} color="#16A34A" />
                            <Text style={styles.coverageGroupTitle}>
                              Covered in Notes ({coveredConcepts.length})
                            </Text>
                          </View>
                          <View style={styles.coverageGroupList}>
                            {coveredConcepts.map((concept, i) => (
                              <View key={`cov-${i}`} style={styles.coverageItemCovered}>
                                <View style={styles.coverageCheckCircle}>
                                  <Text style={styles.coverageCheckCircleText}>✓</Text>
                                </View>
                                <Text style={styles.coverageConceptCoveredText}>{concept}</Text>
                                <View style={styles.miniProgressBarWrap}>
                                  <View style={[styles.miniProgressBarFill, { width: "100%", backgroundColor: "#16A34A" }]} />
                                </View>
                                <Text style={[styles.miniProgressPct, { color: "#16A34A" }]}>100%</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Missing Group */}
                      {missingConcepts.length > 0 && (
                        <View style={styles.coverageGroupBlock}>
                          <View style={styles.coverageGroupHeader}>
                            <AlertTriangle size={14} color="#DC2626" />
                            <Text style={[styles.coverageGroupTitle, { color: "#DC2626" }]}>
                              Missing from Notes ({missingConcepts.length})
                            </Text>
                          </View>
                          <View style={styles.coverageGroupList}>
                            {missingConcepts.map((concept, i) => (
                              <View key={`mis-${i}`} style={styles.coverageItemMissing}>
                                <View style={styles.coverageCrossCircle}>
                                  <Text style={styles.coverageCrossCircleText}>✕</Text>
                                </View>
                                <Text style={styles.coverageConceptMissingText}>{concept}</Text>
                                <View style={styles.miniProgressBarWrap}>
                                  <View style={[styles.miniProgressBarFill, { width: "0%", backgroundColor: "#DC2626" }]} />
                                </View>
                                <Text style={[styles.miniProgressPct, { color: "#DC2626" }]}>0%</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      <Text style={styles.methodologyFootnote}>
                        * Concept-level coverage is derived from deterministic keyword and semantic matching against official curriculum standards.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* ── 6. Your Study Plan (Materials) ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={17} color={colors.primaryBlack} />
                  <Text style={styles.sectionTitle}>Your Study Plan</Text>
                </View>
                {isGenerating || (!materialsOverview) || (materialsOverview.missingCount > 0 && materialsOverview.generatedTypes.length < 7) ? (
                  <View style={styles.generatingBadge}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 5 }} />
                    <Text style={styles.generatingBadgeText}>
                      {materialsOverview && materialsOverview.generatedTypes.length > 0
                        ? `${materialsOverview.generatedTypes.length}/7 Ready`
                        : "Generating…"}
                    </Text>
                  </View>
                ) : materialsOverview && materialsOverview.missingCount === 0 ? (
                  <View style={[styles.generatingBadge, { backgroundColor: "#DCFCE7" }]}>
                    <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={[styles.generatingBadgeText, { color: "#16A34A" }]}>All Ready</Text>
                  </View>
                ) : materialsOverview && materialsOverview.missingCount > 0 ? (
                  <TouchableOpacity style={styles.regenBtn} onPress={triggerMaterialGeneration}>
                    <Text style={styles.regenBtnText}>Re-generate</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={[styles.sectionSubtitle, { marginTop: -8 }]}>
                {note.analysis.learningGaps.length > 0
                  ? `Personalized resources based on your ${note.analysis.learningGaps.length} learning gap${note.analysis.learningGaps.length !== 1 ? "s" : ""}`
                  : "Personalized learning resources for your notes"}
              </Text>

              {(!materialsOverview || materialsOverview.missingCount > 0 || isGenerating) && (
                <View style={styles.generatingInfoBanner}>
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={styles.generatingInfoText}>
                    AI is generating study materials in the background. Ready items can be opened immediately.
                  </Text>
                </View>
              )}

              <View style={styles.materialsList}>
                <MaterialCard icon={<BookOpen size={20} color="#3B82F6" />} title="Structured Notes" color="#3B82F6"
                  isReady={materialsOverview?.generatedTypes.includes("structured_notes") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("structured_notes")} />
                <MaterialCard icon={<Layers size={20} color="#8B5CF6" />} title="Flashcards" color="#8B5CF6"
                  isReady={materialsOverview?.generatedTypes.includes("flashcards") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("flashcards")} />
                <MaterialCard icon={<FileText size={20} color="#10B981" />} title="Revision Summary" color="#10B981"
                  isReady={materialsOverview?.generatedTypes.includes("revision_summary") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("revision_summary")} />
                <MaterialCard icon={<Target size={20} color="#EF4444" />} title="Learning Points" color="#EF4444"
                  isReady={materialsOverview?.generatedTypes.includes("learning_points") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("learning_points")} />
                <MaterialCard icon={<Play size={20} color="#F59E0B" />} title="Audio Lesson" color="#F59E0B"
                  isReady={materialsOverview?.generatedTypes.includes("audio") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("audio")} />
                <MaterialCard icon={<BookOpen size={20} color="#6366F1" />} title="Key Definitions" color="#6366F1"
                  isReady={materialsOverview?.generatedTypes.includes("definitions") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("definitions")} />
                <MaterialCard icon={<Layers size={20} color="#EC4899" />} title="Mind Map" color="#EC4899"
                  isReady={materialsOverview?.generatedTypes.includes("mindmap") ?? false}
                  isGeneratingAll={isGenerating} onPress={() => navigateToMaterial("mindmap")} />
              </View>
            </View>

            {/* ── 7. Original Note Images (Collapsible) ── */}
            {(() => {
              const allPages = note.imageUrls && note.imageUrls.length > 0 ? note.imageUrls : [note.imageUrl];
              return (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.collapseHeader}
                    onPress={() => setImageExpanded(!imageExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionTitleRow, { marginBottom: 0 }]}>
                      <FileText size={17} color="#64748B" />
                      <Text style={[styles.sectionTitle, { color: "#64748B" }]}>
                        Original Note{allPages.length > 1 ? `s (${allPages.length} pages)` : ""}
                      </Text>
                    </View>
                    {imageExpanded ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
                  </TouchableOpacity>
                  {imageExpanded && (
                    <View style={{ marginTop: 12 }}>
                      {allPages.length > 1 ? (
                        <>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageTabList}>
                            {allPages.map((_, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.pageTab, selectedPageIndex === idx && styles.pageTabActive]}
                                onPress={() => setSelectedPageIndex(idx)}
                              >
                                <Text style={[styles.pageTabText, selectedPageIndex === idx && styles.pageTabTextActive]}>
                                  Page {idx + 1}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <View style={styles.noteImageWrap}>
                            <Image
                              source={{ uri: getNotesResourceUrl(allPages[selectedPageIndex] || allPages[0]) }}
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

            {/* ── 8. Extracted Text (Collapsible) ── */}
            {note.rawText ? (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.collapseHeader}
                  onPress={() => setOcrExpanded(!ocrExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sectionTitleRow, { marginBottom: 0 }]}>
                    <FileText size={17} color="#64748B" />
                    <Text style={[styles.sectionTitle, { color: "#64748B" }]}>Extracted Text (OCR)</Text>
                  </View>
                  {ocrExpanded ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
                </TouchableOpacity>
                {ocrExpanded && (
                  <View style={styles.ocrTextBox}>
                    <Text style={styles.ocrText}>{note.rawText}</Text>
                  </View>
                )}
              </View>
            ) : null}

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

  // Note Detail Header
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#F8F9FB",
  },
  headerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBackLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  headerStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Full-Screen AI Processing State ───────────────────────────────────────
  fullScreenProcessing: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  processingTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backButtonWithLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backLabelText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryBlack,
  },
  runInBackgroundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  runInBackgroundText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
  },
  processingScrollView: {
    flex: 1,
  },
  processingScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  processingHero: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  circleProgressWrap: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  circleSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  circleInnerContent: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.18)",
  },
  circleCoreFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    borderTopWidth: 1.5,
    borderTopColor: "rgba(234, 88, 12, 0.55)",
  },
  circleContentLayer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  circlePctText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  circleEtaText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#C2410C",
    marginTop: 1,
  },
  processingMainTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
    textAlign: "center",
  },
  processingMainSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
    fontWeight: "500",
  },
  pipelineSection: {
    marginBottom: 16,
  },
  pipelineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pipelineSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  pipelineElapsedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pipelineElapsedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  pipelineList: {
    gap: 8,
  },
  pipelineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pipelineCardDone: {
    borderColor: "#E2E8F0",
  },
  pipelineCardActive: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
  },
  pipelineDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  pipelineDotDone: {
    backgroundColor: "#10B981",
  },
  pipelineDotActive: {
    backgroundColor: "#EA580C",
  },
  pipelineIndexText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  pipelineStageName: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#64748B",
  },
  pipelineStageNameDone: {
    color: "#0F172A",
    fontWeight: "700",
  },
  pipelineStageNameActive: {
    color: "#9A3412",
    fontWeight: "800",
  },
  pipelineStageDesc: {
    fontSize: 12,
    color: "#431407",
    marginTop: 3,
    lineHeight: 16,
  },
  stageDonePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stageDonePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  stageActivePill: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stageActivePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C2410C",
  },
  processingBottomHint: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
    letterSpacing: 0.1,
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

  // ── Top Summary Card (Redesigned for Improvement 1) ──────────────────────
  topSummaryCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  lessonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lessonPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
  },
  summaryTopicTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primaryBlack,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  summaryBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  heroScoreRingWrap: {
    width: 100,
    height: 100,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroScoreRingInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  heroScorePct: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  heroScoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 11,
  },
  summaryStatsCol: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  statLineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLineText: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "500",
    flexShrink: 1,
  },
  statLineBold: {
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  summarySecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 14,
  },
  summarySecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.2,
  },
  summaryPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  // Failed state
  failedCard: {
    margin: 20,
    backgroundColor: "#FFF5F5",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  failedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  failedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 8,
  },
  failedText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  failedRetryBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  failedRetryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryBlack,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 19,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "500" },

  // Concept numbered rows
  conceptList: { gap: 8, marginTop: 4 },
  conceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 12,
  },
  conceptIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  conceptIndexText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  conceptLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primaryBlack,
    flex: 1,
  },

  // ── Strength cards (Improvement 6) ──────────────────────────────────────────
  strengthList: {
    gap: 10,
    marginTop: 6,
  },
  strengthCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 8,
  },
  strengthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  strengthIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  strengthTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#14532D",
    flex: 1,
    lineHeight: 20,
  },
  strengthBadgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  strengthBadgeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  strengthBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },

  // ── Gap cards — redesigned from scratch ────────────────────────────────────
  gapsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  gapsSectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  gapsSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryBlack,
  },
  gapCountPill: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: "center",
  },
  gapCountPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  gapsList: {
    gap: 10,
    marginTop: 6,
  },
  // Each gap card: white, clean, left border indicates priority
  gapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderColorLight,
    borderLeftWidth: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  gapCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  gapConcept: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryBlack,
    flex: 1,
    lineHeight: 20,
  },
  // "Not covered: X · Y · Z" — quiet inline summary
  gapMissingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gapMissingLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  gapMissingValue: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
  },
  gapCardDivider: {
    height: 1,
    backgroundColor: colors.borderColorLight,
  },
  gapCardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gapStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  gapToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  gapToggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  // Expandable drawer
  gapDetailsDrawer: {
    gap: 14,
    paddingTop: 4,
  },
  gapDetailBlock: {
    gap: 6,
  },
  gapDetailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gapDetailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gapEvidenceQuote: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  gapEvidenceQuoteText: {
    fontSize: 12.5,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 19,
  },
  gapMissingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColorLight,
  },
  gapMissingItemNum: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    width: 18,
  },
  gapMissingItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primaryBlack,
    flex: 1,
    lineHeight: 19,
  },
  gapRecommendationText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  gapStudyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
  },
  gapStudyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Missing concepts chips
  missingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  missingChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },

  // Collapsible
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  ocrTextBox: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ocrText: {
    fontSize: 12,
    fontFamily: "monospace" as any,
    color: "#334155",
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

  // Materials — full-width list rows
  materialsList: {
    gap: 10,
    marginTop: 4,
  },
  materialListRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 60,
  },
  materialListRowDisabled: { opacity: 0.5 },
  materialListAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  materialListIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    flexShrink: 0,
  },
  materialListBody: {
    flex: 1,
    paddingVertical: 12,
  },
  materialListLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  materialListMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  materialListRight: {
    paddingHorizontal: 14,
  },
  materialLockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },

  // Generating banner
  generatingInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${colors.primary}0D`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  generatingInfoText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "400",
    lineHeight: 20,
    flex: 1,
  },
  generatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  generatingBadgeText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  regenBtn: {
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  regenBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // ── Priority Learning Gap Card (Improvement 2) ──────────────────────────────
  priorityGapCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  priorityGapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  priorityGapTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  priorityGapTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  priorityGapSeverityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityGapSeverityText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  priorityGapConceptName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primaryBlack,
    marginBottom: 14,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  whyGapBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  whyGapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  whyGapTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  whyGapExplanation: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 10,
  },
  priorityMissingList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 6,
  },
  priorityMissingLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priorityMissingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityMissingCross: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityMissingCrossText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  priorityMissingItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  outcomeStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  outcomeStatusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  outcomeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  outcomeStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  explainerDrawer: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  explainerSection: {
    gap: 4,
  },
  explainerSubhead: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  explainerQuoteBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  explainerQuoteText: {
    fontSize: 12.5,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 18,
  },
  explainerRecommendationText: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
  },
  priorityGapActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  priorityGapExplainerBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityGapExplainerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  priorityGapReviewBtn: {
    flex: 1.2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  priorityGapReviewBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── View All Gaps Button ────────────────────────────────────────────────────
  viewAllGapsBtn: {
    marginTop: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderColorLight,
  },
  viewAllGapsText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },

  // ── Educational Disclaimer (Improvement 13) ─────────────────────────────────
  gapDisclaimerBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  gapDisclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gapDisclaimerTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  gapDisclaimerText: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16.5,
    fontWeight: "400",
  },

  // ── Curriculum Coverage Grouped & Collapsible (Improvement 7) ──────────────
  coverageScoreBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  coverageScoreText: {
    fontSize: 12,
    fontWeight: "800",
  },
  coverageSummaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  coverageSummaryTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    gap: 3,
  },
  coverageSummaryNum: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 20,
  },
  coverageSummaryLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  coverageToggleBtn: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  coverageToggleBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },
  coverageGroupedContainer: {
    marginTop: 14,
    gap: 14,
  },
  coverageGroupBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  coverageGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  coverageGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  coverageGroupList: {
    gap: 6,
  },
  coverageItemCovered: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  coverageCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  coverageCheckCircleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  coverageConceptCoveredText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  coverageItemMissing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  coverageCrossCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  coverageCrossCircleText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  coverageConceptMissingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
    flex: 1,
  },

  // ── Visual Concept Map (Improvement 8) ────────────────────────────────────
  coverageBarContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  coverageBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    overflow: "hidden",
  },
  coverageBarCovered: {
    backgroundColor: "#16A34A",
  },
  coverageBarMissing: {
    backgroundColor: "#EF4444",
  },
  coverageBarLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  coverageBarLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  coverageLegendDotCovered: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  coverageLegendDotMissing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  coverageBarLegendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  conceptMapPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  conceptMapPillCovered: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  conceptMapPillCoveredText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  conceptMapPillMissing: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  conceptMapPillMissingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  conceptMapPillMore: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  conceptMapPillMoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  miniProgressBarWrap: {
    width: 44,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginHorizontal: 6,
  },
  miniProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  miniProgressPct: {
    fontSize: 11,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
  methodologyFootnote: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 15,
  },
});
