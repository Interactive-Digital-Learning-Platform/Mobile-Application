import React, { useState, useEffect, useCallback } from "react";
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
  Dimensions,
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
  Clock,
  AlertTriangle,
  Landmark,
  FlaskConical,
  Calculator,
  BookOpen,
  Globe,
  Code2,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth, useUser } from "@clerk/expo";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Polygon,
} from "react-native-svg";
import { notesApi } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
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

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);

      try {
        const response = await notesApi.getNotes(userId);
        if (response.success) {
          setNotes(response.data.notes);
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
            } catch (error) {
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
  const analyzedNotes = notes.filter((n) => n.status === "analyzed");
  const avgScore =
    analyzedNotes.length > 0
      ? Math.round(
          analyzedNotes.reduce(
            (sum, n) => sum + (n.analysis?.overallCompleteness ?? 0),
            0
          ) / analyzedNotes.length
        )
      : 0;
  const totalGaps = analyzedNotes.reduce(
    (sum, n) => sum + (n.analysis?.learningGaps?.length ?? 0),
    0
  );

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
                <Text style={styles.statVal}>{analyzedNotes.length}</Text>
                <Text style={styles.statLbl}>Analyzed</Text>
              </View>

              {/* Stat 2: Avg Score */}
              <View style={styles.statCell}>
                <Text style={styles.statVal}>
                  {analyzedNotes.length > 0 ? `${avgScore}%` : "—"}
                </Text>
                <Text style={styles.statLbl}>Avg Score</Text>
              </View>

              {/* Stat 3: Total Gaps */}
              <View style={[styles.statCell, styles.statCellBorderLeft]}>
                <Text style={styles.statVal}>
                  {analyzedNotes.length > 0 ? totalGaps : "—"}
                </Text>
                <Text style={styles.statLbl}>Total Gaps</Text>
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

