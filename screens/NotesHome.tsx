import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  User,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  AlertTriangle,
  Landmark,
  FlaskConical,
  Calculator,
  BookOpen,
  Globe,
  Code2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth, useUser } from "@clerk/expo";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
} from "react-native-svg";
import { notesApi } from "@/api/notesAPI";
import { notesClient } from "@/api/apiClients";
import Toast from "react-native-toast-message";

type NoteStatus = "all" | "processing" | "analyzed" | "failed";

// ─── Header Waves & Contour Lines (Inspired by Reference Design) ───────────────

const HeaderWaveBackground = () => (
  <View style={styles.waveSvgContainer} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 375 230" preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id="lineGrad1" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.40} />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.20} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.05} />
        </SvgLinearGradient>
        <SvgLinearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.30} />
          <Stop offset="60%" stopColor="#ffffff" stopOpacity={0.15} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="fillGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
          <Stop offset="60%" stopColor="#ffffff" stopOpacity={0.05} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
        </SvgLinearGradient>
      </Defs>

      {/* Layered Translucent Wave Fill 1 */}
      <Path
        d="M180 -10 C 260 40, 310 110, 390 130 L 390 -10 Z"
        fill="url(#fillGrad)"
      />

      {/* Layered Translucent Wave Fill 2 */}
      <Path
        d="M-20 70 C 80 140, 220 70, 390 160 L 390 -10 L -20 -10 Z"
        fill="url(#fillGrad)"
      />

      {/* ── Flowing Wave Contour Line 1 (Upper Arc under Avatar) ── */}
      <Path
        d="M120 -10 C 210 35, 290 85, 390 95"
        fill="none"
        stroke="url(#lineGrad1)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />

      {/* ── Flowing Wave Contour Line 2 (Main Swooping Diagonal Curve) ── */}
      <Path
        d="M-20 65 C 100 135, 230 75, 390 140"
        fill="none"
        stroke="url(#lineGrad1)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* ── Flowing Wave Contour Line 3 (Parallel Secondary Wave) ── */}
      <Path
        d="M-20 100 C 90 165, 240 110, 390 175"
        fill="none"
        stroke="url(#lineGrad2)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* ── Flowing Wave Contour Line 4 (Subtle Lower Depth Curve) ── */}
      <Path
        d="M30 150 C 140 200, 270 145, 390 205"
        fill="none"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* ── 1. Top-Left of Avatar: Floating Open Book Icon ── */}
      <G transform="translate(246, 44) rotate(8) scale(1.15)">
        <Path
          d="M 2 4 C 6 2.5, 10 3.2, 12 5.5 C 14 3.2, 18 2.5, 22 4 L 22 17 C 18 15.5, 14 16.2, 12 18.5 C 10 16.2, 6 15.5, 2 17 Z"
          fill="rgba(255, 255, 255, 0.10)"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 12 5.5 L 12 18.5"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </G>

      {/* ── 2. Left of Avatar: Floating Open Book Icon ── */}
      <G transform="translate(266, 104) rotate(-12) scale(0.95)">
        <Path
          d="M 2 4 C 6 2.5, 10 3.2, 12 5.5 C 14 3.2, 18 2.5, 22 4 L 22 17 C 18 15.5, 14 16.2, 12 18.5 C 10 16.2, 6 15.5, 2 17 Z"
          fill="rgba(255, 255, 255, 0.08)"
          stroke="rgba(255, 255, 255, 0.40)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 12 5.5 L 12 18.5"
          stroke="rgba(255, 255, 255, 0.40)"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      </G>

      {/* ── 3. Right of Avatar Circle (Green Circled Place): Floating Open Book Icon ── */}
      <G transform="translate(332, 110) rotate(10) scale(0.88)">
        <Path
          d="M 2 4 C 6 2.5, 10 3.2, 12 5.5 C 14 3.2, 18 2.5, 22 4 L 22 17 C 18 15.5, 14 16.2, 12 18.5 C 10 16.2, 6 15.5, 2 17 Z"
          fill="rgba(255, 255, 255, 0.08)"
          stroke="rgba(255, 255, 255, 0.38)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 12 5.5 L 12 18.5"
          stroke="rgba(255, 255, 255, 0.38)"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      </G>

      {/* ── 4. Middle-Right Edge (Green Marked): Floating Open Book Icon ── */}
      <G transform="translate(350, 150) rotate(-8) scale(0.88)">
        <Path
          d="M 2 4 C 6 2.5, 10 3.2, 12 5.5 C 14 3.2, 18 2.5, 22 4 L 22 17 C 18 15.5, 14 16.2, 12 18.5 C 10 16.2, 6 15.5, 2 17 Z"
          fill="rgba(255, 255, 255, 0.08)"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 12 5.5 L 12 18.5"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  </View>
);

interface Note {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  pageCount?: number;
  imageUrls?: string[];
  analysis?: {
    subject: string;
    topic: string;
    overallCompleteness: number;
    learningGaps: { concept: string; severity: string }[];
  };
}

type CoverageTrend = "improving" | "stable" | "declining";

interface SubjectMastery {
  subjectName: string;
  averageWeightedCoverage: number;
  notesAnalyzed: number;
  trend: CoverageTrend;
  recentScores: number[];
}

interface StudySession {
  noteId: string;
  subject: string;
  lessonName?: string;
  weightedCoverage: number;
  conceptsFound: number;
  conceptsMissed: number;
  analyzedAt: string;
}

interface LearningProfile {
  exists: boolean;
  totalNotesAnalyzed: number;
  subjectMastery: SubjectMastery[];
  recentSessions: StudySession[];
}

interface PersistentGap {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  timesNotFoundInNotes: number;
  timesFoundInNotes: number;
  timesPartiallyFoundInNotes: number;
  timesStudentConfirmedNeedsHelp: number;
  timesStudentConfirmedUnderstood: number;
}

function buildLocalLearningProfile(notes: Note[]): LearningProfile {
  const analyzed = notes.filter((note) => note.status === "analyzed" && note.analysis);
  const bySubject = new Map<string, number[]>();

  analyzed
    .slice()
    .reverse()
    .forEach((note) => {
      const subject = note.analysis?.subject || "Other";
      const scores = bySubject.get(subject) ?? [];
      scores.push(note.analysis?.overallCompleteness ?? 0);
      bySubject.set(subject, scores);
    });

  const subjectMastery = Array.from(bySubject.entries()).map(([subjectName, scores]) => {
    const recent = scores.slice(-3);
    const delta = recent.length >= 3 ? recent[recent.length - 1] - recent[0] : 0;
    const trend: CoverageTrend = delta >= 10 ? "improving" : delta <= -10 ? "declining" : "stable";

    return {
      subjectName,
      averageWeightedCoverage: Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length
      ),
      notesAnalyzed: scores.length,
      trend,
      recentScores: scores,
    };
  });

  const recentSessions = analyzed
    .slice(0, 10)
    .reverse()
    .map((note) => ({
      noteId: note._id,
      subject: note.analysis?.subject || "Other",
      lessonName: note.analysis?.topic,
      weightedCoverage: note.analysis?.overallCompleteness ?? 0,
      conceptsFound: 0,
      conceptsMissed: note.analysis?.learningGaps?.length ?? 0,
      analyzedAt: note.createdAt,
    }));

  return {
    exists: analyzed.length > 0,
    totalNotesAnalyzed: analyzed.length,
    subjectMastery,
    recentSessions,
  };
}

const TREND_CONFIG: Record<
  CoverageTrend,
  { label: string; color: string; backgroundColor: string; icon: LucideIcon }
> = {
  improving: {
    label: "Improving",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    icon: ArrowUpRight,
  },
  stable: {
    label: "Stable",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    icon: Minus,
  },
  declining: {
    label: "Needs attention",
    color: "#DC2626",
    backgroundColor: "#FEF2F2",
    icon: ArrowDownRight,
  },
};

// ─── Helpers & Configurations ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  uploaded: {
    bg: "#EFF6FF",
    text: "#2563EB",
    dot: "#3B82F6",
    label: "Uploaded",
  },
  processing: {
    bg: "#FFFBEB",
    text: "#D97706",
    dot: "#F59E0B",
    label: "Processing",
  },
  analyzed: {
    bg: "#ECFDF5",
    text: "#059669",
    dot: "#10B981",
    label: "Analyzed",
  },
  failed: {
    bg: "#FFF1F2",
    text: "#E11D48",
    dot: "#E11D48",
    label: "Failed",
  },
};

const SUBJECT_CONFIG: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  History: { icon: Landmark, bg: "#EFF6FF", color: "#2563EB" },
  Science: { icon: FlaskConical, bg: "#EFF6FF", color: "#0284C7" },
  Mathematics: { icon: Calculator, bg: "#EFF6FF", color: "#3B82F6" },
  English: { icon: BookOpen, bg: "#FDF4FF", color: "#C026D3" },
  Geography: { icon: Globe, bg: "#ECFDF5", color: "#059669" },
  Chemistry: { icon: FlaskConical, bg: "#FFF1F2", color: "#E11D48" },
  Programming: { icon: Code2, bg: "#F0FDF4", color: "#16A34A" },
};

const FILTER_TABS: { key: NoteStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "analyzed", label: "Analyzed" },
  { key: "failed", label: "Failed" },
];

function formatCreatedAt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  const day = d.getDate();
  const mon = d.toLocaleString("default", { month: "short" });
  return `${day} ${mon} · ${time}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface LearningInsightsProps {
  profile: LearningProfile;
  persistentGaps: PersistentGap[];
  notes: Note[];
  isSynced: boolean;
  onOpenNote: (noteId: string) => void;
}

function LearningInsights({
  profile,
  persistentGaps,
  notes,
  isSynced,
  onOpenNote,
}: LearningInsightsProps) {
  const subjects = profile.subjectMastery
    .slice()
    .sort((a, b) => b.averageWeightedCoverage - a.averageWeightedCoverage);
  const displayedSubjects = subjects.slice(0, 3);
  const prioritySubject = subjects.length > 1 ? subjects[subjects.length - 1] : subjects[0];
  const confirmedSupportGap = persistentGaps.find(
    (gap) => gap.timesStudentConfirmedNeedsHelp > gap.timesStudentConfirmedUnderstood
  );
  const recurringPattern = confirmedSupportGap ?? persistentGaps[0];
  const latestRelevantNote = notes.find(
    (note) =>
      note.status === "analyzed" &&
      note.analysis?.subject === (recurringPattern?.subjectName ?? prioritySubject?.subjectName)
  );
  const chartSessions = profile.recentSessions.slice(-5);
  const latestSession = chartSessions[chartSessions.length - 1];
  const previousSameSubject = profile.recentSessions
    .slice(0, -1)
    .reverse()
    .find((session) => session.subject === latestSession?.subject);
  const latestDelta =
    latestSession && previousSameSubject
      ? latestSession.weightedCoverage - previousSameSubject.weightedCoverage
      : null;

  const actionTitle = confirmedSupportGap
    ? `Review ${confirmedSupportGap.conceptName}`
    : recurringPattern
    ? `Check your understanding of ${recurringPattern.conceptName}`
    : prioritySubject
    ? `Build stronger ${prioritySubject.subjectName} notes`
    : "Analyze another note";

  const actionDescription = confirmedSupportGap
    ? `You marked this as needing help, and it was absent from ${confirmedSupportGap.timesNotFoundInNotes} analyzed notes.`
    : recurringPattern
    ? `This concept was absent from ${recurringPattern.timesNotFoundInNotes} analyzed notes. Confirm whether it is a note omission or a real support need.`
    : prioritySubject
    ? `${prioritySubject.subjectName} currently averages ${prioritySubject.averageWeightedCoverage}% note coverage. Review the latest analysis before your next upload.`
    : "Each analyzed note creates a new coverage checkpoint.";

  return (
    <View style={styles.insightsSection}>
      <View style={styles.insightsTitleRow}>
        <View style={styles.insightsTitleIcon}>
          <BarChart3 size={19} color="#FC6E20" strokeWidth={2.2} />
        </View>
        <View style={styles.insightsTitleCopy}>
          <Text style={styles.insightsTitle}>Learning Insights</Text>
          <Text style={styles.insightsSubtitle}>
            {isSynced ? "Tracked across every analyzed note" : "Based on your recent analyzed notes"}
          </Text>
        </View>
        <View style={styles.autoTrackedBadge}>
          <View style={styles.autoTrackedDot} />
          <Text style={styles.autoTrackedText}>{isSynced ? "SYNCED" : "RECENT"}</Text>
        </View>
      </View>

      <View style={styles.insightsCard}>
        <View style={styles.recentCoverageHeader}>
          <View>
            <Text style={styles.insightEyebrow}>RECENT NOTE COVERAGE</Text>
            <Text style={styles.recentCoverageValue}>
              {latestSession ? `${latestSession.weightedCoverage}%` : "—"}
            </Text>
          </View>
          {latestSession && (
            <View
              style={[
                styles.deltaBadge,
                latestDelta === null || Math.abs(latestDelta) < 1
                  ? styles.deltaBadgeNeutral
                  : latestDelta > 0
                  ? styles.deltaBadgePositive
                  : styles.deltaBadgeNegative,
              ]}
            >
              {latestDelta === null || Math.abs(latestDelta) < 1 ? (
                <Minus size={14} color="#64748B" strokeWidth={2.2} />
              ) : latestDelta > 0 ? (
                <ArrowUpRight size={14} color="#059669" strokeWidth={2.2} />
              ) : (
                <ArrowDownRight size={14} color="#DC2626" strokeWidth={2.2} />
              )}
              <Text
                style={[
                  styles.deltaBadgeText,
                  latestDelta !== null && latestDelta > 0
                    ? styles.deltaTextPositive
                    : latestDelta !== null && latestDelta < 0
                    ? styles.deltaTextNegative
                    : styles.deltaTextNeutral,
                ]}
              >
                {latestDelta === null
                  ? "Baseline"
                  : `${latestDelta > 0 ? "+" : ""}${latestDelta} pts`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.coverageChart}>
          {chartSessions.map((session) => (
            <View key={`${session.noteId}-${session.analyzedAt}`} style={styles.chartColumn}>
              <Text style={styles.chartValue}>{session.weightedCoverage}</Text>
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${Math.max(12, Math.min(100, session.weightedCoverage))}%`,
                      backgroundColor:
                        session.weightedCoverage >= 75
                          ? "#10B981"
                          : session.weightedCoverage >= 45
                          ? "#F59E0B"
                          : "#F97316",
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel} numberOfLines={1}>
                {session.subject.slice(0, 3).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        {latestSession && (
          <Text style={styles.comparisonCaption} numberOfLines={2}>
            {latestDelta === null
              ? `${latestSession.subject} baseline established. Add another ${latestSession.subject} note to measure change.`
              : `Compared with your previous ${latestSession.subject} note.`}
          </Text>
        )}
      </View>

      {displayedSubjects.length > 0 && (
        <View style={styles.insightsCard}>
          <Text style={styles.insightEyebrow}>SUBJECT NOTE COVERAGE</Text>
          <View style={styles.subjectInsightsList}>
            {displayedSubjects.map((subject) => {
              const trend = TREND_CONFIG[subject.trend] ?? TREND_CONFIG.stable;
              const TrendIcon = trend.icon;

              return (
                <View key={subject.subjectName} style={styles.subjectInsightRow}>
                  <View style={styles.subjectInsightHeader}>
                    <View style={styles.subjectInsightNameRow}>
                      <Text style={styles.subjectInsightName}>{subject.subjectName}</Text>
                      <Text style={styles.subjectNoteCount}>
                        {subject.notesAnalyzed} note{subject.notesAnalyzed === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <View style={[styles.trendBadge, { backgroundColor: trend.backgroundColor }]}>
                      <TrendIcon size={12} color={trend.color} strokeWidth={2.3} />
                      <Text style={[styles.trendBadgeText, { color: trend.color }]}>
                        {trend.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.subjectCoverageRow}>
                    <View style={styles.subjectProgressTrack}>
                      <View
                        style={[
                          styles.subjectProgressFill,
                          { width: `${Math.min(100, subject.averageWeightedCoverage)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.subjectCoverageValue}>
                      {subject.averageWeightedCoverage}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.nextActionCard}>
        <View style={styles.nextActionIcon}>
          <Target size={20} color="#ffffff" strokeWidth={2.1} />
        </View>
        <View style={styles.nextActionCopy}>
          <Text style={styles.nextActionEyebrow}>YOUR NEXT BEST ACTION</Text>
          <Text style={styles.nextActionTitle}>{actionTitle}</Text>
          <Text style={styles.nextActionDescription}>{actionDescription}</Text>
          {latestRelevantNote && (
            <TouchableOpacity
              style={styles.nextActionButton}
              activeOpacity={0.8}
              onPress={() => onOpenNote(latestRelevantNote._id)}
            >
              <Text style={styles.nextActionButtonText}>Open relevant analysis</Text>
              <ChevronRight size={14} color="#C2410C" strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {persistentGaps.length > 0 && (
        <View style={styles.recurringPatternsRow}>
          <AlertTriangle size={15} color="#B45309" strokeWidth={2} />
          <Text style={styles.recurringPatternsText}>
            {persistentGaps.length} recurring note omission{persistentGaps.length === 1 ? "" : "s"} detected
          </Text>
        </View>
      )}

      <View style={styles.insightsDisclaimer}>
        <ShieldCheck size={14} color="#64748B" strokeWidth={2} />
        <Text style={styles.insightsDisclaimerText}>
          Coverage reflects what appears in uploaded notes—not everything you know. Confirm findings inside each analysis.
        </Text>
      </View>
    </View>
  );
}

export default function NotesHome() {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName || user?.username || "dinukait";

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle("light-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("#D94E06");
      }
    }, [])
  );

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NoteStatus>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [persistentGaps, setPersistentGaps] = useState<PersistentGap[]>([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);

      try {
        const encodedUserId = encodeURIComponent(userId);
        const [notesResult, profileResult, gapsResult] = await Promise.allSettled([
          notesApi.getNotes(userId),
          notesClient.get<{ success: boolean; data: LearningProfile }>(
            `/profile/${encodedUserId}`
          ),
          notesClient.get<{
            success: boolean;
            data: { gaps: PersistentGap[] };
          }>(`/profile/${encodedUserId}/gaps`),
        ]);

        if (notesResult.status === "fulfilled" && notesResult.value.success) {
          setNotes(notesResult.value.data.notes);
        } else if (notesResult.status === "rejected") {
          throw notesResult.reason;
        }

        if (profileResult.status === "fulfilled" && profileResult.value.data.success) {
          setLearningProfile(profileResult.value.data.data);
        }

        if (gapsResult.status === "fulfilled" && gapsResult.value.data.success) {
          setPersistentGaps(gapsResult.value.data.data.gaps ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Refetch when screen comes to focus
  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  // ── Auto-refresh while any note is processing ──────────────────────────────
  useEffect(() => {
    const hasProcessing = notes.some(
      (n) => n.status === "uploaded" || n.status === "processing"
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => fetchNotes(), 5000);
    return () => clearInterval(interval);
  }, [notes, fetchNotes]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (note: Note) => {
    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note.title}"? This will also remove all generated study materials.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(note._id);
            try {
              await notesApi.deleteNote(note._id);
              setNotes((prev) => prev.filter((n) => n._id !== note._id));
              Toast.show({ type: "success", text1: "Note deleted successfully" });
            } catch {
              Toast.show({ type: "error", text1: "Failed to delete note" });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Filtered notes ────────────────────────────────────────────────────────
  const filteredNotes =
    activeFilter === "all"
      ? notes
      : notes.filter((n) =>
          activeFilter === "processing"
            ? n.status === "uploaded" || n.status === "processing"
            : n.status === activeFilter
        );

  // ── Stats ─────────────────────────────────────────────────────────────────
  const effectiveProfile = useMemo(
    () => learningProfile ?? buildLocalLearningProfile(notes),
    [learningProfile, notes]
  );
  const trackedNoteCount = effectiveProfile.totalNotesAnalyzed;
  const weightedSubjectTotal = effectiveProfile.subjectMastery.reduce(
    (sum, subject) => sum + subject.averageWeightedCoverage * subject.notesAnalyzed,
    0
  );
  const weightedSubjectCount = effectiveProfile.subjectMastery.reduce(
    (sum, subject) => sum + subject.notesAnalyzed,
    0
  );
  const avgCoverage =
    weightedSubjectCount > 0 ? Math.round(weightedSubjectTotal / weightedSubjectCount) : 0;

  // ── Note card ─────────────────────────────────────────────────────
  const renderNoteCard = ({ item }: { item: Note }) => {
    const isDeleting = deletingId === item._id;
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.uploaded;
    const isAnalyzed = item.status === "analyzed";
    const isProcessing = item.status === "processing" || item.status === "uploaded";
    const isFailed = item.status === "failed";

    // Subject Icon & style mapping
    const subjectName = item.analysis?.subject || "";
    const subjectCfg = SUBJECT_CONFIG[subjectName] || {
      icon: FileText,
      bg: "#EFF6FF",
      color: "#2563EB",
    };
    const SubjectIcon = subjectCfg.icon;

    const completeness = item.analysis?.overallCompleteness ?? 0;
    const barColor =
      completeness >= 75
        ? "#10B981"
        : completeness >= 45
        ? "#F59E0B"
        : "#E11D48";

    return (
      <TouchableOpacity
        style={[styles.noteCard, isDeleting && styles.noteCardDeleting]}
        activeOpacity={0.88}
        disabled={isDeleting}
        onPress={() => router.push(`/(main)/notes/${item._id}` as any)}
      >
        {/* Top Meta Row */}
        <View style={styles.cardHeaderRow}>
          {/* Left Icon Container */}
          <View style={[styles.cardIconWrap, { backgroundColor: subjectCfg.bg }]}>
            <SubjectIcon size={22} color={subjectCfg.color} strokeWidth={1.8} />
          </View>

          {/* Title & Subtitle Column */}
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>

            <View style={styles.cardBadgeRow}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
                <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
                  {statusCfg.label}
                </Text>
              </View>

              {/* Subject / Page count */}
              {item.analysis?.subject ? (
                <Text style={styles.cardSubjectText} numberOfLines={1}>
                  {item.analysis.subject}
                  {item.pageCount && item.pageCount > 1 ? ` · ${item.pageCount} pgs` : ""}
                </Text>
              ) : item.pageCount && item.pageCount > 0 ? (
                <Text style={styles.cardPageCountText}>
                  {item.pageCount} page{item.pageCount > 1 ? "s" : ""}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Timestamp & Delete Button */}
          <View style={styles.cardActionsCol}>
            <Text style={styles.cardDateText}>
              {formatCreatedAt(item.createdAt)}
            </Text>

            <TouchableOpacity
              style={styles.cardDeleteBtn}
              activeOpacity={0.7}
              disabled={isDeleting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#E11D48" />
              ) : (
                <Trash2 size={14} color="#E11D48" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Topic & Gaps / Status Row */}
        <View style={styles.cardTopicRow}>
          <Text style={styles.cardTopicText} numberOfLines={1}>
            Topic: {item.analysis?.topic || "General Notes"}
          </Text>

          {isAnalyzed ? (
            <View style={styles.cardScoresRow}>
              {item.analysis?.learningGaps && item.analysis.learningGaps.length > 0 && (
                <View style={styles.gapBadge}>
                  <Text style={styles.gapBadgeText}>
                    {item.analysis.learningGaps.length} gaps
                  </Text>
                </View>
              )}
              <Text style={[styles.scorePercentText, { color: barColor }]}>
                {completeness}%
              </Text>
            </View>
          ) : isProcessing ? (
            <View style={styles.processingBadge}>
              <Text style={styles.processingBadgeText}>Processing...</Text>
            </View>
          ) : isFailed ? (
            <View style={styles.failedBadge}>
              <Text style={styles.failedBadgeText}>Failed to analyze</Text>
            </View>
          ) : null}
        </View>

        {/* Slim Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: isAnalyzed ? `${Math.min(completeness, 100)}%` : isProcessing ? "40%" : "100%",
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {/* Primary Action Button (View Analysis & Materials) */}
        {isAnalyzed && (
          <TouchableOpacity
            style={styles.cardActionBtn}
            activeOpacity={0.85}
            disabled={isDeleting}
            onPress={() => router.push(`/(main)/notes/${item._id}` as any)}
          >
            <Sparkles size={15} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.cardActionBtnText}>View Analysis & Materials</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <FileText size={38} color="#FC6E20" strokeWidth={1.8} />
      </View>
      <Text style={styles.emptyTitle}>
        {activeFilter === "all" ? "No handwritten notes yet" : `No ${activeFilter} notes`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === "all"
          ? "Upload photos of your handwritten notes to get AI gap analysis, interactive flashcards, podcasts, and study materials."
          : "Try switching filters or upload a new note."}
      </Text>
      {activeFilter === "all" && (
        <TouchableOpacity
          style={styles.emptyUploadBtn}
          onPress={() => router.push("/(main)/notes/upload")}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.emptyUploadBtnText}>Upload Your First Note</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor="#D94E06" barStyle="light-content" />

      {/* ── Top Curved Gradient Header (Aligned with Quiz Tab Header) ── */}
      <LinearGradient
        colors={["#D94E06", "#EA580C", "#FC6E20", "#FF8C50", "#FFA87A"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Abstract Wavy Contour Lines Overlay with Book/Note Icons */}
        <HeaderWaveBackground />

        <SafeAreaView edges={["top"]} style={styles.gradientSafeArea}>
          {/* User Greeting Row (Matches Quiz Tab: Greeting on Left, 70px Avatar Circle on Right) */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingTextCol}>
              <Text style={styles.greetingTitle}>Hi {displayName}</Text>
              <Text style={styles.greetingSubtitle}>Welcome to Smart Notes</Text>
            </View>

            <View style={styles.avatarWrap}>
              <User size={26} color="#ffffff" strokeWidth={1.8} />
            </View>
          </View>

          {/* 3-Metric Stat Card (Matches Quiz Tab StatisticButton layout & 30px padding) */}
          <View style={styles.statCardContainer}>
            <View style={styles.statCard}>
              {/* Stat 1: Analyzed */}
              <View style={[styles.statCell, styles.statCellBorderRight]}>
                <Text style={styles.statVal}>{trackedNoteCount}</Text>
                <Text style={styles.statLbl}>Analyzed</Text>
              </View>

              {/* Stat 2: Avg Score */}
              <View style={styles.statCell}>
                <Text style={styles.statVal}>
                  {trackedNoteCount > 0 ? `${avgCoverage}%` : "—"}
                </Text>
                <Text style={styles.statLbl}>Avg Coverage</Text>
              </View>

              {/* Stat 3: Total Gaps */}
              <View style={[styles.statCell, styles.statCellBorderLeft]}>
                <Text style={styles.statVal}>
                  {trackedNoteCount > 0 ? persistentGaps.length : "—"}
                </Text>
                <Text style={styles.statLbl}>Support Areas</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Lower Content Area ── */}
      <View style={styles.lowerContainer}>
        {/* ── Pill Filter Switcher ── */}
        <View style={styles.filtersRow}>
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? notes.length
                : notes.filter((n) =>
                    tab.key === "processing"
                      ? n.status === "uploaded" || n.status === "processing"
                      : n.status === tab.key
                  ).length;
            const isActive = activeFilter === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.filterCountBadge,
                      isActive ? styles.filterCountBadgeActive : styles.filterCountBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        isActive ? styles.filterCountTextActive : styles.filterCountTextInactive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Notes List ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FC6E20" />
            <Text style={styles.loadingSubtext}>Loading your notes…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item._id}
            renderItem={renderNoteCard}
            contentContainerStyle={[
              styles.flatListContent,
              filteredNotes.length === 0 && styles.flatListEmptyContent,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotes(true)}
                tintColor="#FC6E20"
                colors={["#FC6E20"]}
              />
            }
            ListHeaderComponent={
              activeFilter === "all" && trackedNoteCount > 0 ? (
                <LearningInsights
                  profile={effectiveProfile}
                  persistentGaps={persistentGaps}
                  notes={notes}
                  isSynced={Boolean(learningProfile?.exists)}
                  onOpenNote={(noteId) =>
                    router.push(`/(main)/notes/${noteId}` as any)
                  }
                />
              ) : null
            }
            ListEmptyComponent={<EmptyState />}
          />
        )}

        {/* ── Floating Action Button (FAB) ── */}
        {!loading && (
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => router.push("/(main)/notes/upload")}
            activeOpacity={0.85}
          >
            <Plus size={30} color="#FC6E20" strokeWidth={2.8} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  gradientHeader: {
    width: "100%",
    paddingBottom: 22,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    position: "relative",
    overflow: "hidden",
  },
  waveSvgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
  },
  gradientSafeArea: {
    paddingHorizontal: 30,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 16,
  },
  greetingTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#ffffff",
    marginTop: 2,
  },
  avatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCardContainer: {
    width: "100%",
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statCell: {
    width: "33%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  statCellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: "#FC6E20",
  },
  statCellBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: "#FC6E20",
  },
  statVal: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FC6E20",
  },
  statLbl: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#FC6E20",
    marginTop: 2,
  },

  lowerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: "#FC6E20",
    borderColor: "#FC6E20",
    shadowColor: "#FC6E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillInactive: {
    backgroundColor: "#ffffff",
    borderColor: "#E2E8F0",
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  filterPillTextInactive: {
    color: "#475569",
  },
  filterCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  filterCountBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  filterCountText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  filterCountTextActive: {
    color: "#ffffff",
  },
  filterCountTextInactive: {
    color: "#64748B",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
    fontWeight: "500",
  },
  flatListContent: {
    paddingTop: 4,
    paddingBottom: 90,
  },
  flatListEmptyContent: {
    flex: 1,
  },

  // ── Note Card Styles (Matches Quiz Tab Card Shadow) ──
  insightsSection: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 18,
    gap: 10,
  },
  insightsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  insightsTitleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  insightsTitleCopy: { flex: 1 },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.25,
  },
  insightsSubtitle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: "500",
    color: "#64748B",
  },
  autoTrackedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
  },
  autoTrackedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 5,
  },
  autoTrackedText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: "#047857",
  },
  insightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  recentCoverageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  insightEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.75,
    color: "#64748B",
  },
  recentCoverageValue: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#172033",
  },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  deltaBadgeNeutral: { backgroundColor: "#F1F5F9" },
  deltaBadgePositive: { backgroundColor: "#ECFDF5" },
  deltaBadgeNegative: { backgroundColor: "#FEF2F2" },
  deltaBadgeText: { fontSize: 11, fontWeight: "800" },
  deltaTextNeutral: { color: "#64748B" },
  deltaTextPositive: { color: "#059669" },
  deltaTextNegative: { color: "#DC2626" },
  coverageChart: {
    height: 104,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  chartColumn: {
    flex: 1,
    height: "100%",
    maxWidth: 42,
    alignItems: "center",
  },
  chartValue: {
    height: 17,
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748B",
  },
  chartTrack: {
    flex: 1,
    width: 18,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  chartBar: { width: "100%", borderRadius: 6 },
  chartLabel: {
    width: 42,
    marginTop: 5,
    fontSize: 8.5,
    fontWeight: "800",
    color: "#94A3B8",
    textAlign: "center",
  },
  comparisonCaption: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },
  subjectInsightsList: { marginTop: 10, gap: 15 },
  subjectInsightRow: { gap: 7 },
  subjectInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  subjectInsightNameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  subjectInsightName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#263244",
  },
  subjectNoteCount: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendBadgeText: { fontSize: 9.5, fontWeight: "800" },
  subjectCoverageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subjectProgressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  subjectProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#FC6E20",
  },
  subjectCoverageValue: {
    width: 36,
    fontSize: 12,
    fontWeight: "900",
    color: "#C2410C",
    textAlign: "right",
  },
  nextActionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  nextActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F97316",
    marginRight: 12,
  },
  nextActionCopy: { flex: 1 },
  nextActionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.65,
    color: "#C2410C",
  },
  nextActionTitle: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#7C2D12",
  },
  nextActionDescription: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#9A3412",
  },
  nextActionButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 9,
    paddingVertical: 4,
  },
  nextActionButtonText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#C2410C",
  },
  recurringPatternsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  recurringPatternsText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  insightsDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  insightsDisclaimerText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#64748B",
  },

  noteCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  noteCardDeleting: {
    opacity: 0.4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.2,
  },
  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardSubjectText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  cardPageCountText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  cardActionsCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  cardDateText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
    justifyContent: "center",
    alignItems: "center",
  },

  cardTopicRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  cardTopicText: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  cardScoresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gapBadge: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  gapBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#E11D48",
  },
  scorePercentText: {
    fontSize: 13,
    fontWeight: "800",
  },
  processingBadge: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  processingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  failedBadge: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  failedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E11D48",
  },

  progressBarTrack: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  cardActionBtn: {
    backgroundColor: "#FC6E20",
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#FC6E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActionBtnText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  emptyUploadBtn: {
    backgroundColor: "#FC6E20",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: "#FC6E20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyUploadBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 2.5,
    borderColor: "#FC6E20",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FC6E20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
