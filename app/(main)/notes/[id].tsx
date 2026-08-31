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
  Modal,
  TextInput,
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
  ShieldCheck,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
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
  confidenceAdjustedWeightedCoverage?: number;
  totalConcepts: number;
  foundConcepts: number;
  missedConcepts: number;
  maxWeightedScore: number;
  achievedWeightedScore: number;
  coverageScope?: "lesson_coverage" | "note_coverage";
}

interface ConceptFinding {
  conceptId: string;
  conceptName: string;
  status?: "present" | "partial" | "missing";
  found: boolean;
  decisionConfidence: number;
  matchMethod: "keyword" | "semantic" | "not_found";
  evidence?: string;
  curriculumCategory?: string;
  importanceWeight?: number;
  isFrequentlyTested?: boolean;
  studentVerification: "unverified" | "understood" | "needs_help";
  verifiedAt?: string;
}

interface ExplainableGap {
  outcomeId: string;
  outcomeDescription: string;
  status: "achieved" | "partially_achieved" | "not_achieved";
  evidence: string;
  missingConcepts: {
    id: string;
    name: string;
    weight: number;
    severity: "high" | "medium" | "low";
    category: string;
    status?: "partial" | "missing";
  }[];
  recommendation: string;
  findingStatus?: "covered_in_note" | "not_found_in_note" | "confirmed_learning_gap";
  verificationStatus?: "not_required" | "pending" | "verified";
}

interface ExamReadiness {
  rating: "Excellent" | "Good" | "Needs Work" | "At Risk";
  highPriorityConceptsCoverage: number;
  frequentlyExaminedMissing: string[];
  revisionPriority: "Low" | "Medium" | "High" | "Critical";
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
  conceptFindings?: ConceptFinding[];
  learningGaps: LearningGap[];
  explainableGaps?: ExplainableGap[];
  coverageScores?: CoverageScores;
  examReadiness?: ExamReadiness;
  ocrConfidence?: number;
  ocrLowQualityWarning?: boolean;
  ocrPageSummary?: {
    totalPages: number;
    extractedPages: number;
    failedPages: number;
  };
  noteScope?: {
    scope: "complete_lesson_note" | "partial_lesson_note" | "revision_summary" | "exercise_or_worksheet" | "diagram_or_formula_sheet" | "unknown";
    confidence: number;
    rationale: string;
  };
  contentLanguage?: {
    primaryLanguage: "Sinhala" | "English" | "Mixed" | "Unknown";
    confidence: number;
  };
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
  userSubject?: string;
  userGrade?: number;
  userTopic?: string;
  userLessonId?: string;
  analysis?: Analysis;
  createdAt: string;
}

interface MaterialsOverview {
  generatedTypes: string[];
  missingCount: number;
}

type StudentCheckStatus = "needs_input" | "support_requested" | "understood" | "mixed";

interface GapConceptView {
  id?: string;
  name: string;
  weight: number;
  severity: "high" | "medium" | "low";
  category?: string;
  coverageStatus: "partial" | "missing";
  finding?: ConceptFinding;
}

interface LearningFindingView {
  id: string;
  outcome: string;
  outcomeStatus: "partially_achieved" | "not_achieved";
  concepts: GapConceptView[];
  severity: "high" | "medium" | "low";
  evidence: string;
  recommendation: string;
  studentStatus: StudentCheckStatus;
  supportRequestedCount: number;
  understoodCount: number;
  needsInputCount: number;
  detectionConfidence?: number;
  priorityScore: number;
}

const normalizeConceptName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^needs further coverage in this note:\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toNoteCoverageEvidence = (value: string) =>
  value
    .replace(/student demonstrated understanding of/gi, "the uploaded note contains evidence for")
    .replace(/student fully covered/gi, "the uploaded note fully covers")
    .replace(/needs work on/gi, "does not fully evidence")
    .replace(/missed by student/gi, "not evidenced in this upload");

const findConceptFinding = (
  conceptId: string | undefined,
  conceptName: string,
  findings: ConceptFinding[],
) => {
  const normalizedName = normalizeConceptName(conceptName);
  return findings.find(
    (finding) =>
      (!!conceptId && finding.conceptId === conceptId) ||
      normalizeConceptName(finding.conceptName) === normalizedName,
  );
};

const buildLearningFindings = (analysis?: Analysis): LearningFindingView[] => {
  if (!analysis) return [];

  const conceptFindings = analysis.conceptFindings ?? [];
  const severityRank = { low: 1, medium: 2, high: 3 } as const;
  const explainable = analysis.explainableGaps ?? [];

  const source = explainable.length > 0
    ? explainable.map((gap) => ({
        id: gap.outcomeId,
        outcome: gap.outcomeDescription,
        outcomeStatus: gap.status === "not_achieved" ? "not_achieved" as const : "partially_achieved" as const,
        evidence: toNoteCoverageEvidence(gap.evidence),
        recommendation: gap.recommendation,
        concepts: gap.missingConcepts.map((concept) => ({
          id: concept.id,
          name: concept.name,
          weight: concept.weight ?? 1,
          severity: concept.severity ?? "medium",
          category: concept.category,
          coverageStatus: concept.status ?? "missing",
          finding: findConceptFinding(concept.id, concept.name, conceptFindings),
        })),
      }))
    : analysis.learningGaps.map((gap, index) => ({
        id: `legacy-${index}`,
        outcome: gap.concept.replace(/^Needs further coverage in this note:\s*/i, ""),
        outcomeStatus: "partially_achieved" as const,
        evidence: "No sufficient note evidence was found for this curriculum concept.",
        recommendation: gap.suggestion,
        concepts: gap.concept
          .replace(/^Needs further coverage in this note:\s*/i, "")
          .split(/[,/]/)
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            name,
            weight: gap.severity === "high" ? 5 : gap.severity === "medium" ? 3 : 1,
            severity: gap.severity,
            coverageStatus: "missing" as const,
            finding: findConceptFinding(undefined, name, conceptFindings),
          })),
      }));

  return source
    .map((gap) => {
      const supportRequestedCount = gap.concepts.filter(
        (concept) => concept.finding?.studentVerification === "needs_help",
      ).length;
      const understoodCount = gap.concepts.filter(
        (concept) => concept.finding?.studentVerification === "understood",
      ).length;
      const verifiableCount = gap.concepts.filter((concept) => concept.finding && !concept.finding.found).length;
      const needsInputCount = Math.max(0, verifiableCount - supportRequestedCount - understoodCount);
      const studentStatus: StudentCheckStatus = supportRequestedCount > 0 && understoodCount > 0
        ? "mixed"
        : supportRequestedCount > 0
        ? "support_requested"
        : needsInputCount > 0
        ? "needs_input"
        : understoodCount > 0
        ? "understood"
        : "needs_input";
      const severity = gap.concepts.reduce<"high" | "medium" | "low">(
        (highest, concept) =>
          severityRank[concept.severity] > severityRank[highest] ? concept.severity : highest,
        "low",
      );
      const confidences = gap.concepts
        .map((concept) => concept.finding?.decisionConfidence)
        .filter((value): value is number => typeof value === "number");
      const detectionConfidence = confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : undefined;
      const highestWeight = Math.max(1, ...gap.concepts.map((concept) => concept.weight));
      const frequentlyTested = gap.concepts.some((concept) => concept.finding?.isFrequentlyTested);
      const statusPriority = supportRequestedCount > 0 ? 300 : needsInputCount > 0 ? 200 : 100;
      const priorityScore =
        statusPriority +
        highestWeight * 10 +
        (frequentlyTested ? 15 : 0) +
        (detectionConfidence ?? 0) * 10;

      return {
        ...gap,
        severity,
        studentStatus,
        supportRequestedCount,
        understoodCount,
        needsInputCount,
        detectionConfidence,
        priorityScore,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
};

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
  subtitle,
  badgeText,
  color,
  isReady,
  isGeneratingAll,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeText?: string;
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 6 }}>
        <Text style={[styles.materialListLabel, !isReady && { color: "#94A3B8" }]} numberOfLines={1}>
          {title}
        </Text>
        {badgeText ? (
          <View style={[styles.materialPillBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.materialPillBadgeText, { color }]}>{badgeText}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text style={styles.materialListSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
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
  const [pipelineExpanded, setPipelineExpanded] = useState(false);
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
    <LinearGradient
      colors={["#D94E06", "#EA580C", "#FC6E20", "#FF8C50"]}
      locations={[0, 0.35, 0.7, 1]}
      style={styles.fullScreenProcessingOrange}
    >
      <StatusBar barStyle="light-content" backgroundColor="#D94E06" />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        {/* ── Top Bar ── */}
        <View style={styles.processingTopBarOrange}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButtonOrange}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={20} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.backLabelTextOrange}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onBack}
            style={styles.runInBackgroundBtnOrange}
            activeOpacity={0.8}
          >
            <Minimize2 size={13} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.runInBackgroundTextOrange}>Run in Background</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.processingScrollView}
          contentContainerStyle={styles.processingScrollContentOrange}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Central Circular Progress Ring (Quiz Screenshots 3 & 4 Style) ── */}
          <View style={styles.processingHeroOrange}>
            <View style={styles.circleProgressWrapOrange}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.circleSvg}>
                {/* Background Track Circle (Translucent White) */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                />
                {/* Animated Progress Circle (Bright Pure White) */}
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="#FFFFFF"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
                />
              </Svg>

              {/* Inner Content (Frosted Glass Badge with Icon + Percentage) */}
              <View style={styles.circleInnerContentOrange}>
                <Sparkles size={28} color="#ffffff" strokeWidth={2.2} />
                <Text style={styles.circlePctTextOrange}>{pct}%</Text>
                <Text style={styles.circleEtaTextOrange}>~{fmtTime(etaSec)} left</Text>
              </View>
            </View>

            {/* Bold Title & Subtitle */}
            <Text style={styles.processingMainTitleOrange}>Analyzing Notes</Text>
            <Text style={styles.processingMainSubtitleOrange}>
              Transcribing handwriting & mapping curriculum standards
            </Text>

            {/* Frosted AI Message Pill (Quiz Screenshot 3/4 Style) */}
            <View style={styles.aiStatusChipOrange}>
              <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.aiStatusChipTextOrange}>
                {pct < 30
                  ? "Scanning handwritten pages with OCR…"
                  : pct < 60
                  ? "Matching syllabus topics & learning outcomes…"
                  : pct < 85
                  ? "Pinpointing knowledge gaps & insights…"
                  : "Almost ready!"}
              </Text>
            </View>

            {/* Animated 4-Dot Progress Indicator */}
            <View style={styles.dotIndicatorRow}>
              <View style={[styles.dotItem, pct >= 20 && styles.dotActive]} />
              <View style={[styles.dotItem, pct >= 45 && styles.dotActive]} />
              <View style={[styles.dotItem, pct >= 70 && styles.dotActivePill]} />
              <View style={[styles.dotItem, pct >= 90 && styles.dotActive]} />
            </View>
          </View>

          {/* ── Educational Tip Banner ── */}
          <View style={styles.tipCardOrange}>
            <View style={styles.tipIconCircle}>
              <Sparkles size={14} color="#FC6E20" />
            </View>
            <Text style={styles.tipTextOrange} numberOfLines={2}>
              {PROCESSING_TIPS[tipIndex]}
            </Text>
          </View>

          {/* ── Collapsible Pipeline Stages Accordion ── */}
          <View style={styles.pipelineAccordionCard}>
            <TouchableOpacity
              style={styles.pipelineAccordionHeader}
              onPress={() => setPipelineExpanded(!pipelineExpanded)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Clock size={14} color="#ffffff" />
                <Text style={styles.pipelineAccordionTitle}>
                  ANALYSIS PIPELINE ({fmtTime(elapsedSec)} elapsed)
                </Text>
              </View>
              {pipelineExpanded ? (
                <ChevronUp size={16} color="#ffffff" />
              ) : (
                <ChevronDown size={16} color="#ffffff" />
              )}
            </TouchableOpacity>

            {pipelineExpanded && (
              <View style={styles.pipelineAccordionList}>
                {PIPELINE_STAGES_INFO.map((stage, idx) => {
                  const isDone = idx < activeIdx;
                  const isActive = idx === activeIdx;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.pipelineCardOrange,
                        isDone && styles.pipelineCardOrangeDone,
                        isActive && styles.pipelineCardOrangeActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.pipelineDotWrapOrange,
                          isDone && styles.pipelineDotOrangeDone,
                          isActive && styles.pipelineDotOrangeActive,
                        ]}
                      >
                        {isDone ? (
                          <CheckCircle2 size={13} color="#16A34A" strokeWidth={2.5} />
                        ) : isActive ? (
                          <ActivityIndicator size={10} color="#FC6E20" />
                        ) : (
                          <Text style={styles.pipelineIndexTextOrange}>{idx + 1}</Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pipelineStageNameOrange,
                            isDone && styles.pipelineStageNameOrangeDone,
                            isActive && styles.pipelineStageNameOrangeActive,
                          ]}
                          numberOfLines={1}
                        >
                          {stage.label}
                        </Text>
                        {isActive && (
                          <Text style={styles.pipelineStageDescOrange} numberOfLines={2}>
                            {stage.detail}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Text style={styles.processingBottomHintOrange}>
            ✦ Processing continues in the background — feel free to explore other tabs anytime
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
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
  const [verifyingConceptId, setVerifyingConceptId] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<{ conceptId: string; message: string } | null>(null);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [gapsExpanded, setGapsExpanded] = useState(false);
  const [priorityGapExplainerOpen, setPriorityGapExplainerOpen] = useState(false);
  const [contextEditorOpen, setContextEditorOpen] = useState(false);
  const [contextSaving, setContextSaving] = useState(false);
  const [contextSubject, setContextSubject] = useState("");
  const [contextTopic, setContextTopic] = useState("");
  const [contextGrade, setContextGrade] = useState<10 | 11 | undefined>();
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const [expandedGapIndices, setExpandedGapIndices] = useState<Record<number, boolean>>({});
  const [expandedLearningFindingIds, setExpandedLearningFindingIds] = useState<Record<string, boolean>>({});
  // Guard: ensure auto-generate fires only once per screen mount
  const hasTriggeredGeneration = React.useRef(false);

  const status = note?.status ?? "loading";
  const isProcessing = status === "uploaded" || status === "processing";
  const isFailed = status === "failed";
  const isAnalyzed = status === "analyzed";
  const learningFindings = React.useMemo(
    () => buildLearningFindings(note?.analysis),
    [note?.analysis],
  );
  const learningDecisionSummary = React.useMemo(
    () => ({
      needsInput: learningFindings.filter((finding) => finding.studentStatus === "needs_input").length,
      supportRequested: learningFindings.filter(
        (finding) => finding.studentStatus === "support_requested" || finding.studentStatus === "mixed",
      ).length,
      understood: learningFindings.filter((finding) => finding.studentStatus === "understood").length,
    }),
    [learningFindings],
  );

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

  const openLearningFinding = useCallback((findingId: string) => {
    setExpandedLearningFindingIds((previous) => ({
      ...previous,
      [findingId]: true,
    }));
    setTimeout(scrollToGaps, 50);
  }, [scrollToGaps]);

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

  const verifyConceptFinding = async (
    conceptId: string,
    status: "understood" | "needs_help",
  ) => {
    if (!note) return;
    try {
      setVerificationError(null);
      setVerifyingConceptId(conceptId);
      const response = await notesApi.verifyConceptFinding(note._id, conceptId, status);
      if (response.success && response.data?.note) {
        setNote(response.data.note);
      }
    } catch (error) {
      console.error("Failed to save concept verification:", error);
      setVerificationError({
        conceptId,
        message: "Your response could not be saved. Check the connection and try again.",
      });
    } finally {
      setVerifyingConceptId(null);
    }
  };

  const openContextEditor = () => {
    if (!note?.analysis) return;
    const detectedGrade = Number(note.analysis.gradeLevel.replace(/\D/g, ""));
    setContextSubject(note.userSubject || note.analysis.subject || "");
    setContextTopic(note.userTopic || note.analysis.topic || "");
    setContextGrade(note.userGrade === 10 || note.userGrade === 11
      ? note.userGrade
      : detectedGrade === 10 || detectedGrade === 11 ? detectedGrade : undefined);
    setContextEditorOpen(true);
  };

  const saveCorrectedContext = async () => {
    if (!note) return;
    try {
      setContextSaving(true);
      const response = await notesApi.updateNoteContext(note._id, {
        subject: contextSubject,
        topic: contextTopic,
        grade: contextGrade,
      });
      if (response.success) {
        setContextEditorOpen(false);
        setMaterialsOverview(null);
        setNote((current) => current ? { ...current, status: "processing" } : current);
        fetchNote();
      }
    } catch (error) {
      console.error("Failed to correct note context:", error);
    } finally {
      setContextSaving(false);
    }
  };

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

  const navigateToMaterial = (type: string, targetGapId?: string, targetConcept?: string) => {
    router.push({
      pathname: "/(main)/notes/material/[type]",
      params: {
        id,
        type,
        ...(targetGapId ? { targetGapId } : {}),
        ...(targetConcept ? { targetConcept } : {}),
      },
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
            {(note.analysis.ocrPageSummary?.failedPages ?? 0) > 0 && (
              <View style={styles.ocrWarningCard}>
                <AlertTriangle size={20} color="#B45309" strokeWidth={2.4} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ocrWarningTitle}>Some note pages were not read</Text>
                  <Text style={styles.ocrWarningText}>
                    OCR extracted {note.analysis.ocrPageSummary?.extractedPages} of {note.analysis.ocrPageSummary?.totalPages} uploaded pages. Coverage may be incomplete until you upload clear replacements.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(main)/notes/upload" as any)}
                    activeOpacity={0.75}
                    style={{ alignSelf: "flex-start", marginTop: 8 }}
                  >
                    <Text style={styles.ocrWarningAction}>Upload replacement photos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {note.analysis.ocrLowQualityWarning && (
              <View style={styles.ocrWarningCard}>
                <AlertTriangle size={20} color="#B45309" strokeWidth={2.4} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ocrWarningTitle}>This note may be hard to read</Text>
                  <Text style={styles.ocrWarningText}>
                    OCR confidence is {note.analysis.ocrConfidence ?? "low"}%. Coverage findings may be incomplete. Retake clear, well-lit photos before relying on them.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(main)/notes/upload" as any)}
                    activeOpacity={0.75}
                    style={{ alignSelf: "flex-start", marginTop: 8 }}
                  >
                    <Text style={styles.ocrWarningAction}>Upload clearer photos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* ── 1. Top Summary Card (Improvement 1) ── */}
            {(() => {
              const score = note.analysis.overallCompleteness;
              const isLessonCoverage = note.analysis.coverageScores?.coverageScope === "lesson_coverage";
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
                    {typeof note.analysis.coverageScores?.confidenceAdjustedWeightedCoverage === "number" && (
                      <Text style={{ marginTop: 5, color: "#64748B", fontSize: 11.5 }}>
                        Evidence-adjusted coverage: {note.analysis.coverageScores.confidenceAdjustedWeightedCoverage}%
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={openContextEditor}
                      activeOpacity={0.75}
                      style={{ alignSelf: "flex-start", marginTop: 10 }}
                    >
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                        Wrong subject or lesson? Correct it
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Main Performance Summary Row (Quiz Screenshot 6 Inspired) ── */}
                  <View style={styles.summaryHeroRow}>
                    {/* Circular Completeness Ring */}
                    <View style={styles.heroScoreRingWrap}>
                      <Svg width={106} height={106}>
                        <Circle cx={53} cy={53} r={ringR} stroke="#F1F5F9" strokeWidth={9} fill="transparent" />
                        <Circle
                          cx={53}
                          cy={53}
                          r={ringR}
                          stroke={scoreColor}
                          strokeWidth={9}
                          fill="transparent"
                          strokeDasharray={`${ringC} ${ringC}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          transform="rotate(-90, 53, 53)"
                        />
                      </Svg>
                      <View style={styles.heroScoreRingInner}>
                        <Text style={[styles.heroScorePct, { color: scoreColor }]}>{score}%</Text>
                        <Text style={styles.heroScoreLabel}>{isLessonCoverage ? "Curriculum" : "This Note"}</Text>
                        <Text style={styles.heroScoreLabel}>{isLessonCoverage ? "Coverage" : "Coverage"}</Text>
                      </View>
                    </View>

                    {/* 2x2 Metric Tiles Grid */}
                    <View style={styles.metricGrid2x2}>
                      {/* Tile 1: Concepts Covered */}
                      <View style={styles.metricGridTile}>
                        <View style={[styles.metricTileIcon, { backgroundColor: "#DCFCE7" }]}>
                          <CheckCircle2 size={13} color="#16A34A" strokeWidth={2.4} />
                        </View>
                        <Text style={styles.metricTileVal}>{coveredCount}/{totalConcepts}</Text>
                        <Text style={styles.metricTileLbl}>CONCEPTS</Text>
                      </View>

                      {/* Tile 2: Learning Gaps */}
                      <View style={styles.metricGridTile}>
                        <View
                          style={[
                            styles.metricTileIcon,
                            { backgroundColor: highPriorityGapsCount > 0 ? "#FEE2E2" : "#FEF3C7" },
                          ]}
                        >
                          <Target
                            size={13}
                            color={highPriorityGapsCount > 0 ? "#DC2626" : "#D97706"}
                            strokeWidth={2.4}
                          />
                        </View>
                        <Text
                          style={[
                            styles.metricTileVal,
                            highPriorityGapsCount > 0 && { color: "#DC2626" },
                          ]}
                        >
                          {attentionCount}
                        </Text>
                        <Text style={styles.metricTileLbl}>{isLessonCoverage ? "GAPS" : "NOT FOUND"}</Text>
                      </View>

                      {/* Tile 3: Mastery Level */}
                      <View style={styles.metricGridTile}>
                        <View style={[styles.metricTileIcon, { backgroundColor: "#FFF7ED" }]}>
                          <Sparkles size={13} color={colors.primary} strokeWidth={2.4} />
                        </View>
                        <Text style={styles.metricTileVal}>{score}%</Text>
                        <Text style={styles.metricTileLbl}>COVERAGE</Text>
                      </View>

                      {/* Tile 4: Revision priority from note coverage */}
                      <View style={styles.metricGridTile}>
                        <View style={[styles.metricTileIcon, { backgroundColor: "#EFF6FF" }]}>
                          <TrendingUp size={13} color="#2563EB" strokeWidth={2.4} />
                        </View>
                        <Text style={styles.metricTileVal} numberOfLines={1}>
                          {note.analysis.examReadiness?.revisionPriority || "Not assessed"}
                        </Text>
                        <Text style={styles.metricTileLbl}>REVISION</Text>
                      </View>
                    </View>
                  </View>

                  {/* ── AI Motivation Card (Quiz Screenshot 8 Inspired) ── */}
                  <View style={styles.aiMotivationBanner}>
                    <View style={styles.aiMotivationHeaderRow}>
                      <Sparkles size={14} color="#C2410C" strokeWidth={2.2} />
                      <Text style={styles.aiMotivationTag}>AI MOTIVATION & STUDY PLAN</Text>
                    </View>
                    <Text style={styles.aiMotivationBody}>
                      {score >= 80
                        ? `Strong note coverage: this upload evidences ${coveredCount} syllabus concepts. Use the revision summary to consolidate what you recorded.`
                        : score >= 50
                        ? `Good foundation: this upload evidences ${coveredCount} core concepts. Check the ${attentionCount} coverage findings below before choosing what to study.`
                        : `This upload evidences ${coveredCount} foundational concepts. Review each coverage finding and tell us what you know before personalised support is created.`}
                    </Text>
                  </View>

                  {/* Quick Action CTAs */}
                  <View style={styles.summaryActionsRow}>
                    <TouchableOpacity
                      style={styles.summarySecondaryBtn}
                      onPress={scrollToGaps}
                      activeOpacity={0.8}
                    >
                      <Target size={14} color="#475569" strokeWidth={2} />
                      <Text style={styles.summarySecondaryBtnText}>
                        Check {attentionCount} Finding{attentionCount !== 1 ? "s" : ""}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.summaryPrimaryBtn}
                      onPress={() => navigateToMaterial("revision_summary")}
                      activeOpacity={0.85}
                    >
                      <Zap size={14} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.summaryPrimaryBtnText}>Review Summary</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── 2. Priority Learning Gap Card (Improvement 2) ── */}
            {learningFindings.length > 0 && (() => {
              const topFinding = learningFindings[0];
              const topSupportConcept = topFinding.concepts.find(
                (concept) => concept.finding?.studentVerification === "needs_help",
              );
              const structuredNotesReady = materialsOverview?.generatedTypes.includes("structured_notes") ?? false;
              const flashcardsReady = materialsOverview?.generatedTypes.includes("flashcards") ?? false;
              const topNeedsSupport =
                topFinding.studentStatus === "support_requested" || topFinding.studentStatus === "mixed";
              const topStatus = topNeedsSupport
                ? {
                    label: "Support requested",
                    description: "Your response has created a personalised study priority.",
                    color: "#7C3AED",
                    background: "#F5F3FF",
                    border: "#DDD6FE",
                    icon: Brain,
                  }
                : topFinding.studentStatus === "understood"
                ? {
                    label: "Note improvement only",
                    description: "You understand this; improve the note without treating it as a knowledge gap.",
                    color: "#047857",
                    background: "#ECFDF5",
                    border: "#A7F3D0",
                    icon: CheckCircle2,
                  }
                : {
                    label: "Needs your input",
                    description: "Check your understanding before the system recommends remediation.",
                    color: "#C2410C",
                    background: "#FFF7ED",
                    border: "#FED7AA",
                    icon: Target,
                  };
              const TopStatusIcon = topStatus.icon;

              return (
                <>
                  <View style={[styles.learningDecisionCard, { borderColor: topStatus.border }]}>
                    <View style={styles.learningDecisionHeader}>
                      <View style={styles.learningDecisionTitleWrap}>
                        <View style={[styles.learningDecisionIcon, { backgroundColor: topStatus.background }]}>
                          <TopStatusIcon size={18} color={topStatus.color} strokeWidth={2.2} />
                        </View>
                        <View style={styles.learningDecisionTitleCopy}>
                          <Text style={styles.learningDecisionEyebrow}>NEXT LEARNING DECISION</Text>
                          <Text style={styles.learningDecisionStatus}>{topStatus.label}</Text>
                        </View>
                      </View>
                      <View style={[styles.learningDecisionBadge, { backgroundColor: topStatus.background }]}>
                        <Text style={[styles.learningDecisionBadgeText, { color: topStatus.color }]}>
                          {topFinding.severity === "high" ? "HIGH" : topFinding.severity === "medium" ? "MEDIUM" : "LOW"} CURRICULUM PRIORITY
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.learningDecisionOutcome}>{topFinding.outcome}</Text>
                    <Text style={styles.learningDecisionDescription}>{topStatus.description}</Text>

                    <View style={styles.learningEvidenceStrip}>
                      <View style={styles.learningEvidenceItem}>
                        <FileText size={14} color="#64748B" />
                        <View>
                          <Text style={styles.learningEvidenceValue}>
                            {topFinding.concepts.length}
                          </Text>
                          <Text style={styles.learningEvidenceLabel}>concepts to check</Text>
                        </View>
                      </View>
                      <View style={styles.learningEvidenceDivider} />
                      <View style={styles.learningEvidenceItem}>
                        <ShieldCheck size={14} color="#64748B" />
                        <View>
                          <Text style={styles.learningEvidenceValue}>
                            {typeof topFinding.detectionConfidence === "number"
                              ? `${Math.round(topFinding.detectionConfidence * 100)}%`
                              : "—"}
                          </Text>
                          <Text style={styles.learningEvidenceLabel}>detection confidence</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.learningDecisionSteps}>
                      <View style={[styles.learningDecisionStep, styles.learningDecisionStepDone]}>
                        <Text style={styles.learningDecisionStepNumberDone}>1</Text>
                        <Text style={styles.learningDecisionStepTextDone}>Evidence checked</Text>
                      </View>
                      <View style={styles.learningDecisionStepLine} />
                      <View
                        style={[
                          styles.learningDecisionStep,
                          topFinding.studentStatus !== "needs_input" && styles.learningDecisionStepDone,
                        ]}
                      >
                        <Text
                          style={
                            topFinding.studentStatus !== "needs_input"
                              ? styles.learningDecisionStepNumberDone
                              : styles.learningDecisionStepNumber
                          }
                        >
                          2
                        </Text>
                        <Text
                          style={
                            topFinding.studentStatus !== "needs_input"
                              ? styles.learningDecisionStepTextDone
                              : styles.learningDecisionStepText
                          }
                        >
                          Student check
                        </Text>
                      </View>
                      <View style={styles.learningDecisionStepLine} />
                      <View
                        style={[
                          styles.learningDecisionStep,
                          topNeedsSupport && styles.learningDecisionStepDone,
                        ]}
                      >
                        <Text
                          style={topNeedsSupport ? styles.learningDecisionStepNumberDone : styles.learningDecisionStepNumber}
                        >
                          3
                        </Text>
                        <Text
                          style={topNeedsSupport ? styles.learningDecisionStepTextDone : styles.learningDecisionStepText}
                        >
                          Targeted support
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.learningDecisionPrimaryButton,
                        topNeedsSupport && !structuredNotesReady && styles.learningDecisionPrimaryButtonDisabled,
                      ]}
                      disabled={topNeedsSupport && !structuredNotesReady}
                      onPress={() =>
                        topNeedsSupport
                          ? navigateToMaterial(
                              "structured_notes",
                              topFinding.id,
                              topSupportConcept?.name ?? topFinding.concepts[0]?.name,
                            )
                          : topFinding.studentStatus === "understood"
                          ? navigateToMaterial(
                              "revision_summary",
                              topFinding.id,
                              topFinding.concepts[0]?.name,
                            )
                          : openLearningFinding(topFinding.id)
                      }
                      activeOpacity={0.85}
                    >
                      {topNeedsSupport && !structuredNotesReady ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : topNeedsSupport ? (
                        <BookOpen size={16} color="#FFFFFF" />
                      ) : (
                        <Target size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.learningDecisionPrimaryButtonText}>
                        {topNeedsSupport
                          ? structuredNotesReady
                            ? "Continue personalised learning"
                            : "Preparing personalised support"
                          : topFinding.studentStatus === "understood"
                          ? "Improve this note"
                          : "Check my understanding"}
                      </Text>
                      {(!topNeedsSupport || structuredNotesReady) && (
                        <ChevronRight size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View
                    style={styles.section}
                    onLayout={(event) => {
                      gapsSectionY.current = event.nativeEvent.layout.y;
                    }}
                  >
                    <View style={styles.learningFindingsHeader}>
                      <View style={styles.learningFindingsHeaderCopy}>
                        <Text style={styles.learningFindingsTitle}>Coverage Findings & Study Decisions</Text>
                        <Text style={styles.learningFindingsSubtitle}>
                          Evidence from this upload becomes a learning priority only after your input.
                        </Text>
                      </View>
                      <View style={styles.gapCountPill}>
                        <Text style={styles.gapCountPillText}>{learningFindings.length}</Text>
                      </View>
                    </View>

                    <View style={styles.learningDecisionSummaryRow}>
                      <View style={[styles.learningSummaryChip, styles.learningSummaryChipPending]}>
                        <Target size={13} color="#C2410C" />
                        <Text style={[styles.learningSummaryChipText, { color: "#C2410C" }]}>
                          {learningDecisionSummary.needsInput} need input
                        </Text>
                      </View>
                      <View style={[styles.learningSummaryChip, styles.learningSummaryChipSupport]}>
                        <Brain size={13} color="#7C3AED" />
                        <Text style={[styles.learningSummaryChipText, { color: "#7C3AED" }]}>
                          {learningDecisionSummary.supportRequested} support
                        </Text>
                      </View>
                      <View style={[styles.learningSummaryChip, styles.learningSummaryChipUnderstood]}>
                        <CheckCircle2 size={13} color="#047857" />
                        <Text style={[styles.learningSummaryChipText, { color: "#047857" }]}>
                          {learningDecisionSummary.understood} understood
                        </Text>
                      </View>
                    </View>

                    {(note.analysis.ocrLowQualityWarning || note.analysis.noteScope?.scope !== "complete_lesson_note") && (
                      <View style={styles.learningReliabilityNotice}>
                        <Info size={14} color="#475569" />
                        <Text style={styles.learningReliabilityNoticeText}>
                          {note.analysis.ocrLowQualityWarning
                            ? "Image readability was limited, so verify these findings before acting on them."
                            : "This appears to be a partial or specialised note. Missing concepts may exist on other pages."}
                        </Text>
                      </View>
                    )}

                    <View style={styles.learningFindingList}>
                      {(gapsExpanded ? learningFindings : learningFindings.slice(0, 3)).map(
                        (finding, findingIndex) => {
                          const isExpanded = !!expandedLearningFindingIds[finding.id];
                          const hasSupport =
                            finding.studentStatus === "support_requested" || finding.studentStatus === "mixed";
                          const isUnderstood = finding.studentStatus === "understood";
                          const findingStatusConfig = hasSupport
                            ? { label: "Support requested", color: "#7C3AED", background: "#F5F3FF" }
                            : isUnderstood
                            ? { label: "Understood", color: "#047857", background: "#ECFDF5" }
                            : { label: "Needs your input", color: "#C2410C", background: "#FFF7ED" };
                          const supportConcept = finding.concepts.find(
                            (concept) => concept.finding?.studentVerification === "needs_help",
                          );

                          return (
                            <View key={finding.id} style={styles.learningFindingCard}>
                              <View style={styles.learningFindingCardTopRow}>
                                <Text style={styles.learningFindingIndex}>FINDING {findingIndex + 1}</Text>
                                <View
                                  style={[
                                    styles.learningFindingStatusBadge,
                                    { backgroundColor: findingStatusConfig.background },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.learningFindingStatusBadgeText,
                                      { color: findingStatusConfig.color },
                                    ]}
                                  >
                                    {findingStatusConfig.label}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.learningFindingOutcome}>{finding.outcome}</Text>
                              <View style={styles.learningFindingMetaRow}>
                                <Text style={styles.learningFindingMetaText}>
                                  {finding.concepts.length} concept{finding.concepts.length === 1 ? "" : "s"} to check
                                </Text>
                                <View style={styles.learningFindingMetaDot} />
                                <Text style={styles.learningFindingMetaText}>
                                  {finding.severity} curriculum priority
                                </Text>
                              </View>

                              <TouchableOpacity
                                style={styles.learningFindingExpandButton}
                                onPress={() =>
                                  setExpandedLearningFindingIds((previous) => ({
                                    ...previous,
                                    [finding.id]: !previous[finding.id],
                                  }))
                                }
                                activeOpacity={0.75}
                              >
                                <Text style={styles.learningFindingExpandButtonText}>
                                  {isExpanded ? "Hide evidence and actions" : "Review evidence and decide"}
                                </Text>
                                {isExpanded ? (
                                  <ChevronUp size={16} color={colors.primary} />
                                ) : (
                                  <ChevronDown size={16} color={colors.primary} />
                                )}
                              </TouchableOpacity>

                              {isExpanded && (
                                <View style={styles.learningFindingDrawer}>
                                  <View style={styles.learningEvidenceCard}>
                                    <View style={styles.learningEvidenceCardHeader}>
                                      <FileText size={14} color="#475569" />
                                      <Text style={styles.learningEvidenceCardTitle}>What the system observed</Text>
                                    </View>
                                    <Text style={styles.learningEvidenceCardText}>{finding.evidence}</Text>
                                    <Text style={styles.learningEvidenceMethodText}>
                                      Detection confidence: {typeof finding.detectionConfidence === "number"
                                        ? `${Math.round(finding.detectionConfidence * 100)}%`
                                        : "not available"}. This measures the note analysis—not your knowledge.
                                    </Text>
                                  </View>

                                  <Text style={styles.learningConceptListTitle}>CHECK EACH CONCEPT</Text>
                                  <View style={styles.learningConceptList}>
                                    {finding.concepts.map((concept) => {
                                      const verification = concept.finding?.studentVerification ?? "unverified";
                                      const canVerify = Boolean(
                                        concept.finding &&
                                          (concept.finding.status !== "present" || !concept.finding.found),
                                      );
                                      const isVerifying = verifyingConceptId === concept.finding?.conceptId;

                                      return (
                                        <View key={concept.id ?? concept.name} style={styles.learningConceptCard}>
                                          <View style={styles.learningConceptHeader}>
                                            <View style={styles.learningConceptHeaderCopy}>
                                              <Text style={styles.learningConceptName}>{concept.name}</Text>
                                              <Text style={styles.learningConceptMeta}>
                                                {concept.coverageStatus === "partial" ? "Partly evidenced" : "Not evidenced"}
                                                {concept.category ? ` · ${concept.category}` : ""}
                                                {` · importance ${concept.weight}/5`}
                                              </Text>
                                            </View>
                                            {concept.finding?.isFrequentlyTested && (
                                              <View style={styles.learningExamBadge}>
                                                <Star size={11} color="#B45309" fill="#FDE68A" />
                                                <Text style={styles.learningExamBadgeText}>Exam relevant</Text>
                                              </View>
                                            )}
                                          </View>

                                          {canVerify ? (
                                            <>
                                              <Text style={styles.learningSelfCheckPrompt}>
                                                Be honest: could you explain this concept without looking at the note?
                                              </Text>
                                              <View style={styles.learningSelfCheckButtons}>
                                                <TouchableOpacity
                                                  style={[
                                                    styles.learningSelfCheckButton,
                                                    styles.learningSelfCheckKnowButton,
                                                    verification === "understood" && styles.learningSelfCheckKnowButtonSelected,
                                                  ]}
                                                  disabled={Boolean(verifyingConceptId)}
                                                  onPress={() =>
                                                    concept.finding &&
                                                    verifyConceptFinding(concept.finding.conceptId, "understood")
                                                  }
                                                  activeOpacity={0.8}
                                                >
                                                  {isVerifying ? (
                                                    <ActivityIndicator size="small" color="#047857" />
                                                  ) : (
                                                    <CheckCircle2 size={15} color="#047857" />
                                                  )}
                                                  <Text style={styles.learningSelfCheckKnowText}>
                                                    {verification === "understood" ? "I know this ✓" : "I know this"}
                                                  </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                  style={[
                                                    styles.learningSelfCheckButton,
                                                    styles.learningSelfCheckSupportButton,
                                                    verification === "needs_help" && styles.learningSelfCheckSupportButtonSelected,
                                                  ]}
                                                  disabled={Boolean(verifyingConceptId)}
                                                  onPress={() =>
                                                    concept.finding &&
                                                    verifyConceptFinding(concept.finding.conceptId, "needs_help")
                                                  }
                                                  activeOpacity={0.8}
                                                >
                                                  {isVerifying ? (
                                                    <ActivityIndicator size="small" color="#7C3AED" />
                                                  ) : (
                                                    <Brain size={15} color="#7C3AED" />
                                                  )}
                                                  <Text style={styles.learningSelfCheckSupportText}>
                                                    {verification === "needs_help" ? "Support requested ✓" : "I need support"}
                                                  </Text>
                                                </TouchableOpacity>
                                              </View>
                                              {concept.finding && verificationError?.conceptId === concept.finding.conceptId && (
                                                <Text style={styles.learningVerificationErrorText}>
                                                  {verificationError.message}
                                                </Text>
                                              )}
                                            </>
                                          ) : (
                                            <Text style={styles.learningVerificationUnavailable}>
                                              Student self-check is unavailable for this legacy finding.
                                            </Text>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>

                                  <View style={styles.learningRecommendationCard}>
                                    <View style={styles.learningRecommendationHeader}>
                                      <BookOpen size={14} color="#475569" />
                                      <Text style={styles.learningRecommendationTitle}>Recommended next step</Text>
                                    </View>
                                    <Text style={styles.learningRecommendationText}>{finding.recommendation}</Text>
                                  </View>

                                  {hasSupport ? (
                                    <View style={styles.personalisedSupportCard}>
                                      <View style={styles.personalisedSupportHeader}>
                                        <Sparkles size={16} color="#7C3AED" />
                                        <View style={styles.personalisedSupportHeaderCopy}>
                                          <Text style={styles.personalisedSupportTitle}>Personalised support plan</Text>
                                          <Text style={styles.personalisedSupportSubtitle}>
                                            Built only from concepts you marked for support.
                                          </Text>
                                        </View>
                                      </View>
                                      {structuredNotesReady || flashcardsReady ? (
                                        <View style={styles.personalisedSupportActions}>
                                          {structuredNotesReady && (
                                            <TouchableOpacity
                                              style={styles.personalisedSupportPrimaryButton}
                                              onPress={() =>
                                                navigateToMaterial(
                                                  "structured_notes",
                                                  finding.id,
                                                  supportConcept?.name ?? finding.concepts[0]?.name,
                                                )
                                              }
                                            >
                                              <BookOpen size={15} color="#FFFFFF" />
                                              <Text style={styles.personalisedSupportPrimaryText}>Learn concept</Text>
                                            </TouchableOpacity>
                                          )}
                                          {flashcardsReady && (
                                            <TouchableOpacity
                                              style={styles.personalisedSupportSecondaryButton}
                                              onPress={() =>
                                                navigateToMaterial(
                                                  "flashcards",
                                                  finding.id,
                                                  supportConcept?.name ?? finding.concepts[0]?.name,
                                                )
                                              }
                                            >
                                              <Layers size={15} color="#7C3AED" />
                                              <Text style={styles.personalisedSupportSecondaryText}>Practice cards</Text>
                                            </TouchableOpacity>
                                          )}
                                        </View>
                                      ) : (
                                        <View style={styles.personalisedSupportPreparing}>
                                          <ActivityIndicator size="small" color="#7C3AED" />
                                          <Text style={styles.personalisedSupportPreparingText}>
                                            Preparing targeted notes and practice cards…
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  ) : isUnderstood ? (
                                    <View style={styles.understoodDecisionCard}>
                                      <CheckCircle2 size={16} color="#047857" />
                                      <View style={styles.understoodDecisionCopy}>
                                        <Text style={styles.understoodDecisionText}>
                                          Recorded as a note-coverage omission, not a student-confirmed support need.
                                        </Text>
                                        <TouchableOpacity
                                          style={styles.understoodDecisionAction}
                                          onPress={() =>
                                            navigateToMaterial(
                                              "revision_summary",
                                              finding.id,
                                              finding.concepts[0]?.name,
                                            )
                                          }
                                        >
                                          <Text style={styles.understoodDecisionActionText}>Improve my note</Text>
                                          <ChevronRight size={13} color="#047857" />
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  ) : (
                                    <View style={styles.pendingDecisionCard}>
                                      <Target size={15} color="#C2410C" />
                                      <Text style={styles.pendingDecisionText}>
                                        Complete the self-check above to unlock the right next step.
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        },
                      )}
                    </View>

                    {learningFindings.length > 3 && (
                      <TouchableOpacity
                        style={styles.viewAllGapsBtn}
                        onPress={() => setGapsExpanded(!gapsExpanded)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.viewAllGapsText}>
                          {gapsExpanded ? "Show fewer findings" : `View all ${learningFindings.length} findings`}
                        </Text>
                        {gapsExpanded ? (
                          <ChevronUp size={14} color={colors.primary} />
                        ) : (
                          <ChevronDown size={14} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    <View style={styles.learningResearchNote}>
                      <ShieldCheck size={15} color="#475569" />
                      <Text style={styles.learningResearchNoteText}>
                        Research-safe interpretation: absence from one note is evidence about note coverage only. A support request is student-reported and should later be validated with practice or a diagnostic assessment.
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}

            {false && (note?.analysis?.learningGaps.length ?? 0) > 0 && (() => {
              const legacyAnalysis = note?.analysis;
              if (!legacyAnalysis) return null;
              const topGap =
                legacyAnalysis!.learningGaps.find((g) => g.severity === "high") ||
                legacyAnalysis!.learningGaps.find((g) => g.severity === "medium") ||
                legacyAnalysis!.learningGaps[0];

              const topExplainableGap =
                legacyAnalysis!.explainableGaps?.find(
                  (eg) =>
                    eg.outcomeDescription === topGap.concept ||
                    eg.missingConcepts.some((mc) => topGap.concept.includes(mc.name))
                ) || legacyAnalysis!.explainableGaps?.[0];

              if (!topExplainableGap) return null;

              const isHigh = topGap.severity === "high";
              const isMedium = topGap.severity === "medium";

              const missingList =
                topExplainableGap && topExplainableGap!.missingConcepts.length > 0
                  ? topExplainableGap!.missingConcepts.map((c) => c.name)
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
                      {topExplainableGap && topExplainableGap!.missingConcepts.length > 0
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
                            <Text style={styles.explainerQuoteText}>{topExplainableGap!.evidence}</Text>
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
                      onPress={() =>
                        navigateToMaterial(
                          "structured_notes",
                          topExplainableGap?.outcomeId,
                          missingList[0] || (topExplainableGap?.missingConcepts[0]?.name)
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.priorityGapReviewBtnText}>Start Reviewing →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── 3. Note Coverage Findings ── */}
            {false && (note?.analysis?.learningGaps.length ?? 0) > 0 && (
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
                    <Text style={styles.gapsSectionTitle}>Not Covered in This Note</Text>
                  </View>
                  <View style={styles.gapCountPill}>
                    <Text style={styles.gapCountPillText}>{note!.analysis!.learningGaps.length}</Text>
                  </View>
                </View>

                <Text style={styles.sectionSubtitle}>
                  {note!.analysis!.noteScope?.scope === "complete_lesson_note"
                    ? "These are curriculum concepts not found in this lesson note. They are not assumed to be knowledge gaps."
                    : "This upload appears to be a partial or specialised note. These concepts were not found here and are not assumed to be knowledge gaps."}
                </Text>

                <View style={styles.gapsList}>
                {(gapsExpanded
                  ? note!.analysis!.learningGaps
                  : note!.analysis!.learningGaps.slice(0, 3)
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

                  const relevantFinding = note?.analysis?.conceptFindings?.find((finding) =>
                    missingList.some((name) =>
                      name.toLowerCase() === finding.conceptName.toLowerCase()
                    )
                  );

                  const statusText =
                    matchedExplainable?.findingStatus === "confirmed_learning_gap"
                      ? "Confirmed learning gap"
                      : "Not covered in this note";

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

                          {relevantFinding && (
                            <View style={styles.gapDetailBlock}>
                              <View style={styles.gapDetailLabelRow}>
                                <Info size={12} color="#64748B" />
                                <Text style={styles.gapDetailLabel}>How this finding was made</Text>
                              </View>
                              <Text style={styles.gapRecommendationText}>
                                Decision confidence: {Math.round(relevantFinding.decisionConfidence * 100)}% · {relevantFinding.matchMethod === "semantic" ? "semantic review" : relevantFinding.matchMethod === "keyword" ? "keyword match" : "no keyword or semantic evidence found"}
                              </Text>
                              {(relevantFinding.curriculumCategory || relevantFinding.importanceWeight) && (
                                <Text style={styles.gapRecommendationText}>
                                  Curriculum basis: {relevantFinding.curriculumCategory || "concept"}
                                  {relevantFinding.importanceWeight ? ` · priority ${relevantFinding.importanceWeight}/5` : ""}
                                  {relevantFinding.isFrequentlyTested ? " · frequently tested" : ""}
                                </Text>
                              )}
                              {relevantFinding.evidence ? (
                                <View style={styles.gapEvidenceQuote}>
                                  <Text style={styles.gapEvidenceQuoteText}>{relevantFinding.evidence}</Text>
                                </View>
                              ) : null}
                            </View>
                          )}

                          {relevantFinding && !relevantFinding.found && (
                            <View style={{ gap: 8 }}>
                              <Text style={styles.gapDetailLabel}>
                                Do you understand this concept even though it was not in this note?
                              </Text>
                              <TouchableOpacity
                                style={styles.gapStudyBtn}
                                disabled={verifyingConceptId === relevantFinding.conceptId}
                                onPress={() => verifyConceptFinding(relevantFinding.conceptId, "understood")}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.gapStudyBtnText}>
                                  {relevantFinding.studentVerification === "understood" ? "Marked: I understand this" : "I understand this"}
                                </Text>
                                <CheckCircle2 size={15} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.gapStudyBtn}
                                disabled={verifyingConceptId === relevantFinding.conceptId}
                                onPress={() => verifyConceptFinding(relevantFinding.conceptId, "needs_help")}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.gapStudyBtnText}>
                                  {relevantFinding.studentVerification === "needs_help" ? "Marked: I need help" : "I need help with this"}
                                </Text>
                                <AlertCircle size={15} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          )}

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
                            onPress={() =>
                              navigateToMaterial(
                                "structured_notes",
                                matchedExplainable?.outcomeId,
                                missingList[0]
                              )
                            }
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

                {note!.analysis!.learningGaps.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllGapsBtn}
                    onPress={() => setGapsExpanded(!gapsExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllGapsText}>
                      {gapsExpanded
                        ? "Show less"
                        : `View all ${note!.analysis!.learningGaps.length} findings`}
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
                    This analysis compares your uploaded note with curriculum concepts. A concept not found here may be on another page or may still be understood by you; it is not treated as a confirmed learning gap.
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
              const isLessonCoverage = note.analysis.coverageScores?.coverageScope === "lesson_coverage";
              const scoreColor = getCompletenessColor(score);
              const coveredPct = totalCount > 0 ? Math.round((coveredConcepts.length / totalCount) * 100) : 0;
              const missingPct = totalCount > 0 ? 100 - coveredPct : 0;

              return (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <BookOpen size={17} color={colors.primaryBlack} />
                      <Text style={styles.sectionTitle}>{isLessonCoverage ? "Curriculum Coverage" : "Note Coverage"}</Text>
                    </View>
                    <View style={[styles.coverageScoreBadge, { backgroundColor: `${scoreColor}15`, borderColor: `${scoreColor}40` }]}>
                      <Text style={[styles.coverageScoreText, { color: scoreColor }]}>{score}%</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionSubtitle}>
                    {isLessonCoverage
                      ? `${totalCount} total concepts mapped to official curriculum standards`
                      : `${totalCount} curriculum concepts checked against this upload only`}
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

            {/* ── 6. Personalized Study Materials ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={17} color={colors.primaryBlack} />
                  <Text style={styles.sectionTitle}>Personalized Study Materials</Text>
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
                Synthesized from your handwritten notes, official textbook passages, and identified learning gaps
              </Text>

              {(!materialsOverview || materialsOverview.missingCount > 0 || isGenerating) && (
                <View style={styles.generatingInfoBanner}>
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={styles.generatingInfoText}>
                    AI is generating your personalized study materials. Ready items can be opened immediately.
                  </Text>
                </View>
              )}

              <View style={styles.materialsList}>
                <MaterialCard
                  icon={<BookOpen size={20} color="#3B82F6" />}
                  title="Structured Notes"
                  badgeText="Complete Note"
                  subtitle="Complete lesson note with your handwriting + official textbook knowledge & highlighted gap remediations"
                  color="#3B82F6"
                  isReady={materialsOverview?.generatedTypes.includes("structured_notes") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("structured_notes")}
                />
                <MaterialCard
                  icon={<Layers size={20} color="#8B5CF6" />}
                  title="Flashcards"
                  badgeText="Active Recall"
                  subtitle="Practice cards prioritizing the concepts missing from your handwritten notes"
                  color="#8B5CF6"
                  isReady={materialsOverview?.generatedTypes.includes("flashcards") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("flashcards")}
                />
                <MaterialCard
                  icon={<BookOpen size={20} color="#6366F1" />}
                  title="Key Definitions"
                  badgeText="Core Terms"
                  subtitle="Official curriculum-aligned definitions for all key terms in this lesson"
                  color="#6366F1"
                  isReady={materialsOverview?.generatedTypes.includes("definitions") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("definitions")}
                />
                <MaterialCard
                  icon={<Layers size={20} color="#EC4899" />}
                  title="Mind Map"
                  badgeText="Visual Map"
                  subtitle="Hierarchical concept tree showing the complete lesson structure"
                  color="#EC4899"
                  isReady={materialsOverview?.generatedTypes.includes("mindmap") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("mindmap")}
                />
                <MaterialCard
                  icon={<FileText size={20} color="#10B981" />}
                  title="Revision Summary"
                  badgeText="Exam Brief"
                  subtitle="Compact exam-focused revision summary covering essential equations and facts"
                  color="#10B981"
                  isReady={materialsOverview?.generatedTypes.includes("revision_summary") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("revision_summary")}
                />
                <MaterialCard
                  icon={<Target size={20} color="#EF4444" />}
                  title="Learning Points"
                  badgeText="Checklist"
                  subtitle="Numbered learning checklist distinguishing what you covered vs gaps"
                  color="#EF4444"
                  isReady={materialsOverview?.generatedTypes.includes("learning_points") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("learning_points")}
                />
                <MaterialCard
                  icon={<Play size={20} color="#F59E0B" />}
                  title="Audio Lesson"
                  badgeText="Audio"
                  subtitle="Spoken podcast-style teacher explanation addressing your notes and explaining your gaps"
                  color="#F59E0B"
                  isReady={materialsOverview?.generatedTypes.includes("audio") ?? false}
                  isGeneratingAll={isGenerating}
                  onPress={() => navigateToMaterial("audio")}
                />
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

      <Modal
        visible={contextEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !contextSaving && setContextEditorOpen(false)}
      >
        <View style={styles.contextModalBackdrop}>
          <View style={styles.contextModalCard}>
            <Text style={styles.contextModalTitle}>Correct note context</Text>
            <Text style={styles.contextModalHelp}>
              This reruns the analysis with your selected syllabus context. Materials from the old match will be removed.
            </Text>

            <Text style={styles.contextFieldLabel}>Subject</Text>
            <TextInput
              value={contextSubject}
              onChangeText={setContextSubject}
              placeholder="e.g. Science"
              style={styles.contextTextInput}
              editable={!contextSaving}
            />
            <Text style={styles.contextFieldLabel}>Grade</Text>
            <View style={styles.contextGradeRow}>
              {([10, 11] as const).map((grade) => (
                <TouchableOpacity
                  key={grade}
                  disabled={contextSaving}
                  onPress={() => setContextGrade(contextGrade === grade ? undefined : grade)}
                  style={[styles.contextGradeButton, contextGrade === grade && styles.contextGradeButtonSelected]}
                >
                  <Text style={[styles.contextGradeText, contextGrade === grade && styles.contextGradeTextSelected]}>
                    Grade {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.contextFieldLabel}>Topic or lesson name</Text>
            <TextInput
              value={contextTopic}
              onChangeText={setContextTopic}
              placeholder="e.g. Photosynthesis"
              style={styles.contextTextInput}
              editable={!contextSaving}
            />

            <View style={styles.contextModalActions}>
              <TouchableOpacity
                disabled={contextSaving}
                onPress={() => setContextEditorOpen(false)}
                style={styles.contextCancelButton}
              >
                <Text style={styles.contextCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={contextSaving}
                onPress={saveCorrectedContext}
                style={styles.contextSaveButton}
              >
                {contextSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.contextSaveText}>Save & Reanalyse</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  contextModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  contextModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  contextModalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  contextModalHelp: { marginTop: 6, marginBottom: 16, fontSize: 12, lineHeight: 18, color: "#64748B" },
  contextFieldLabel: { marginBottom: 6, fontSize: 12, fontWeight: "700", color: "#334155" },
  contextTextInput: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    color: "#0F172A",
  },
  contextGradeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  contextGradeButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  contextGradeButtonSelected: { borderColor: colors.primary, backgroundColor: "#FFF7ED" },
  contextGradeText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  contextGradeTextSelected: { color: colors.primary },
  contextModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
  contextCancelButton: { paddingHorizontal: 14, paddingVertical: 11 },
  contextCancelText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  contextSaveButton: {
    minWidth: 142,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  contextSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  ocrWarningCard: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },
  ocrWarningTitle: { fontSize: 14, fontWeight: "800", color: "#92400E" },
  ocrWarningText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#92400E" },
  ocrWarningAction: { fontSize: 12, fontWeight: "800", color: "#B45309" },
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

  // ── Failed state card ────────────────────────────────────────────────────
  failedCardLegacy: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  failedIconWrapLegacy: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  failedTitleLegacy: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 8,
  },
  failedTextLegacy: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  failedRetryBtnLegacy: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  failedRetryTextLegacy: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13.5,
  },

  // ── Full-Screen AI Processing State (Quiz Screenshots 3 & 4 Style) ────────
  fullScreenProcessingOrange: {
    flex: 1,
  },
  processingTopBarOrange: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButtonOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  backLabelTextOrange: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  runInBackgroundBtnOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  runInBackgroundTextOrange: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  processingScrollView: {
    flex: 1,
  },
  processingScrollContentOrange: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: "center",
  },
  processingHeroOrange: {
    alignItems: "center",
    width: "100%",
    marginBottom: 18,
  },
  circleProgressWrapOrange: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  circleSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  circleInnerContentOrange: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  circlePctTextOrange: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 2,
  },
  circleEtaTextOrange: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.90)",
    marginTop: 1,
  },
  processingMainTitleOrange: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 8,
    textAlign: "center",
  },
  processingMainSubtitleOrange: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.90)",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  aiStatusChipOrange: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  aiStatusChipTextOrange: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  dotIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dotItem: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  dotActive: {
    backgroundColor: "#ffffff",
  },
  dotActivePill: {
    width: 18,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ffffff",
  },
  tipCardOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    width: "100%",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipTextOrange: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
    fontWeight: "500",
  },
  pipelineAccordionCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    marginBottom: 14,
  },
  pipelineAccordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pipelineAccordionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.6,
  },
  pipelineAccordionList: {
    marginTop: 12,
    gap: 8,
  },
  pipelineCardOrange: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 12,
    padding: 11,
    gap: 10,
  },
  pipelineCardOrangeDone: {
    backgroundColor: "#ffffff",
  },
  pipelineCardOrangeActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#EA580C",
  },
  pipelineDotWrapOrange: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  pipelineDotOrangeDone: {
    backgroundColor: "#DCFCE7",
  },
  pipelineDotOrangeActive: {
    backgroundColor: "#FFEDD5",
  },
  pipelineIndexTextOrange: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  pipelineStageNameOrange: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  pipelineStageNameOrangeDone: {
    color: "#0F172A",
    fontWeight: "700",
  },
  pipelineStageNameOrangeActive: {
    color: "#C2410C",
    fontWeight: "800",
  },
  pipelineStageDescOrange: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },
  processingBottomHintOrange: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 10,
  },

  // ── Top Summary Card (Redesigned for Improvement 1 & Quiz Screenshots 1 & 6) ──
  topSummaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  summaryHeader: {
    marginBottom: 14,
  },
  summaryHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
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
    marginTop: 4,
  },
  summaryHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  heroScoreRingWrapLegacy: {
    width: 106,
    height: 106,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroScoreRingInnerLegacy: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  heroScorePctLegacy: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  heroScoreLabelLegacy: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 11,
  },

  // 2x2 Metric Grid (Quiz Screenshot 6 Style)
  metricGrid2x2: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGridTile: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  metricTileIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  metricTileVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricTileLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.4,
  },

  // AI Motivation Banner (Quiz Screenshot 8 Style)
  aiMotivationBanner: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginBottom: 12,
    gap: 4,
  },
  aiMotivationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiMotivationTag: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#C2410C",
    letterSpacing: 0.6,
  },
  aiMotivationBody: {
    fontSize: 12,
    color: "#9A3412",
    lineHeight: 17,
    fontWeight: "500",
  },

  summaryActionsRowLegacy: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  summarySecondaryBtnLegacy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 14,
  },
  summarySecondaryBtnTextLegacy: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.2,
  },
  summaryPrimaryBtnLegacy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  learningDecisionCard: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  learningDecisionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  learningDecisionTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  learningDecisionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  learningDecisionTitleCopy: { flex: 1 },
  learningDecisionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#64748B",
  },
  learningDecisionStatus: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  learningDecisionBadge: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  learningDecisionBadgeText: {
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: "900",
    textAlign: "center",
    color: "#475569",
  },
  learningDecisionOutcome: {
    marginTop: 15,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#172033",
  },
  learningDecisionDescription: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
    color: "#64748B",
  },
  learningEvidenceStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  learningEvidenceItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  learningEvidenceDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 10,
    backgroundColor: "#E2E8F0",
  },
  learningEvidenceValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
  },
  learningEvidenceLabel: {
    marginTop: 1,
    fontSize: 9.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  learningDecisionSteps: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  learningDecisionStep: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  learningDecisionStepDone: {},
  learningDecisionStepLine: {
    width: 14,
    height: 1,
    marginBottom: 19,
    backgroundColor: "#CBD5E1",
  },
  learningDecisionStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  learningDecisionStepNumberDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FC6E20",
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  learningDecisionStepText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    textAlign: "center",
  },
  learningDecisionStepTextDone: {
    fontSize: 9,
    fontWeight: "800",
    color: "#C2410C",
    textAlign: "center",
  },
  learningDecisionPrimaryButton: {
    minHeight: 46,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FC6E20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  learningDecisionPrimaryButtonDisabled: { opacity: 0.65 },
  learningDecisionPrimaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  learningFindingsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  learningFindingsHeaderCopy: { flex: 1 },
  learningFindingsTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#172033",
  },
  learningFindingsSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: "#64748B",
  },
  learningDecisionSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  learningSummaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  learningSummaryChipPending: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  learningSummaryChipSupport: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
  learningSummaryChipUnderstood: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  learningSummaryChipText: { fontSize: 10.5, fontWeight: "800" },
  learningReliabilityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  learningReliabilityNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: "#475569",
  },
  learningFindingList: { gap: 11, marginTop: 14 },
  learningFindingCard: {
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 1,
  },
  learningFindingCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  learningFindingIndex: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.65,
    color: "#94A3B8",
  },
  learningFindingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  learningFindingStatusBadgeText: { fontSize: 9.5, fontWeight: "900" },
  learningFindingOutcome: {
    marginTop: 9,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  learningFindingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 7,
    gap: 6,
  },
  learningFindingMetaText: { fontSize: 10.5, fontWeight: "600", color: "#64748B" },
  learningFindingMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CBD5E1" },
  learningFindingExpandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  learningFindingExpandButtonText: { fontSize: 11.5, fontWeight: "800", color: colors.primary },
  learningFindingDrawer: { gap: 13, marginTop: 14 },
  learningEvidenceCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  learningEvidenceCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  learningEvidenceCardTitle: { fontSize: 11.5, fontWeight: "800", color: "#475569" },
  learningEvidenceCardText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: "#334155",
  },
  learningEvidenceMethodText: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  learningConceptListTitle: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#64748B",
  },
  learningConceptList: { gap: 9 },
  learningConceptCard: {
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  learningConceptHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  learningConceptHeaderCopy: { flex: 1 },
  learningConceptName: { fontSize: 13, lineHeight: 18, fontWeight: "800", color: "#1E293B" },
  learningConceptMeta: { marginTop: 3, fontSize: 9.5, lineHeight: 14, fontWeight: "600", color: "#94A3B8" },
  learningExamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#FFFBEB",
  },
  learningExamBadgeText: { fontSize: 8.5, fontWeight: "800", color: "#B45309" },
  learningSelfCheckPrompt: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: "#475569",
  },
  learningSelfCheckButtons: { flexDirection: "row", gap: 8, marginTop: 9 },
  learningSelfCheckButton: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  learningSelfCheckKnowButton: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  learningSelfCheckKnowButtonSelected: { backgroundColor: "#DCFCE7", borderColor: "#22C55E" },
  learningSelfCheckSupportButton: { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
  learningSelfCheckSupportButtonSelected: { backgroundColor: "#EDE9FE", borderColor: "#8B5CF6" },
  learningSelfCheckKnowText: { fontSize: 10.5, fontWeight: "800", color: "#047857" },
  learningSelfCheckSupportText: { fontSize: 10.5, fontWeight: "800", color: "#7C3AED" },
  learningVerificationErrorText: {
    marginTop: 7,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  learningVerificationUnavailable: {
    marginTop: 9,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  learningRecommendationCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  learningRecommendationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  learningRecommendationTitle: { fontSize: 11.5, fontWeight: "800", color: "#92400E" },
  learningRecommendationText: { marginTop: 6, fontSize: 11.5, lineHeight: 17, fontWeight: "500", color: "#78350F" },
  personalisedSupportCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  personalisedSupportHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  personalisedSupportHeaderCopy: { flex: 1 },
  personalisedSupportTitle: { fontSize: 12.5, fontWeight: "900", color: "#5B21B6" },
  personalisedSupportSubtitle: { marginTop: 2, fontSize: 10.5, lineHeight: 15, fontWeight: "600", color: "#7C3AED" },
  personalisedSupportActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  personalisedSupportPrimaryButton: {
    flex: 1,
    minHeight: 41,
    borderRadius: 11,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  personalisedSupportPrimaryText: { fontSize: 10.5, fontWeight: "800", color: "#FFFFFF" },
  personalisedSupportSecondaryButton: {
    flex: 1,
    minHeight: 41,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  personalisedSupportSecondaryText: { fontSize: 10.5, fontWeight: "800", color: "#7C3AED" },
  personalisedSupportPreparing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 9,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },
  personalisedSupportPreparingText: { flex: 1, fontSize: 10.5, lineHeight: 15, fontWeight: "700", color: "#6D28D9" },
  understoodDecisionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  understoodDecisionCopy: { flex: 1 },
  understoodDecisionText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontWeight: "700", color: "#047857" },
  understoodDecisionAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 7,
    paddingVertical: 3,
  },
  understoodDecisionActionText: { fontSize: 10.5, fontWeight: "900", color: "#047857" },
  pendingDecisionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  pendingDecisionText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontWeight: "700", color: "#C2410C" },
  learningResearchNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  learningResearchNoteText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontWeight: "600", color: "#475569" },

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
    fontWeight: "700",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  materialPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  materialPillBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  materialListSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "400",
    lineHeight: 16,
    marginBottom: 4,
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
