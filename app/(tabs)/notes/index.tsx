import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, FileText, ChevronRight, Trash2, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { notesApi } from "@/services/api";
import { colors } from "@/constants/colors";
import Toast from "react-native-toast-message";

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteStatus = "all" | "processing" | "analyzed" | "failed";

interface Note {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  analysis?: {
    subject: string;
    topic: string;
    overallCompleteness: number;
    learningGaps: { concept: string; severity: string }[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  uploaded:   { bg: "#DBEAFE", text: "#1D4ED8" },
  processing: { bg: "#FEF3C7", text: "#D97706" },
  analyzed:   { bg: "#DCFCE7", text: "#16A34A" },
  failed:     { bg: "#FEE2E2", text: "#DC2626" },
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing…",
  analyzed: "Analyzed",
  failed: "Failed",
};

const FILTER_TABS: { key: NoteStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "analyzed", label: "Analyzed" },
  { key: "failed", label: "Failed" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NotesIndex() {
  const router = useRouter();
  const { userId } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NoteStatus>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async (isRefresh = false) => {
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
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
              Toast.show({ type: "success", text1: "Note deleted" });
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

  // ── Note card ─────────────────────────────────────────────────────────────
  const renderNoteCard = ({ item }: { item: Note }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.uploaded;
    const isDeleting = deletingId === item._id;

    return (
      <TouchableOpacity
        style={[styles.card, isDeleting && { opacity: 0.4 }]}
        onPress={() => router.push(`/(tabs)/notes/${item._id}`)}
        activeOpacity={0.75}
        disabled={isDeleting}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardIconWrap}>
            <FileText size={22} color={colors.primary} />
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.analysis ? (
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.analysis.subject} · {item.analysis.topic}
              </Text>
            ) : (
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Trash2 size={16} color="#DC2626" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Completeness bar if analyzed */}
        {item.analysis && (
          <View style={styles.cardFooter}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${item.analysis.overallCompleteness}%` as any,
                    backgroundColor:
                      item.analysis.overallCompleteness >= 75
                        ? "#10b981"
                        : item.analysis.overallCompleteness >= 45
                        ? "#f59e0b"
                        : "#ef4444",
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {item.analysis.overallCompleteness}%
            </Text>
            {item.analysis.learningGaps?.length > 0 && (
              <Text style={styles.gapText}>
                · {item.analysis.learningGaps.length} gap{item.analysis.learningGaps.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <FileText size={44} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>
        {activeFilter === "all" ? "No notes yet" : `No ${activeFilter} notes`}
      </Text>
      <Text style={styles.emptyText}>
        {activeFilter === "all"
          ? "Upload a photo of your handwritten notes to get AI-powered analysis and study materials."
          : "Try switching filters or uploading a new note."}
      </Text>
      {activeFilter === "all" && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push("/(tabs)/notes/upload")}
        >
          <Plus size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.emptyButtonText}>Upload First Note</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Your Learning</Text>
          <Text style={styles.title}>Smart Notes</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(tabs)/notes/upload")}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Stats bar ── */}
      {analyzedNotes.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <CheckCircle size={15} color="#16A34A" />
            <Text style={styles.statValue}>{analyzedNotes.length}</Text>
            <Text style={styles.statLabel}>Analyzed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingUp size={15} color={colors.primary} />
            <Text style={styles.statValue}>{avgScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <AlertTriangle size={15} color="#DC2626" />
            <Text style={styles.statValue}>{totalGaps}</Text>
            <Text style={styles.statLabel}>Total Gaps</Text>
          </View>
        </View>
      )}

      {/* ── Filter tabs ── */}
      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? notes.length
              : notes.filter((n) =>
                  tab.key === "processing"
                    ? n.status === "uploaded" || n.status === "processing"
                    : n.status === tab.key
                ).length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === tab.key && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    activeFilter === tab.key && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      activeFilter === tab.key && styles.filterCountTextActive,
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

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item._id}
          renderItem={renderNoteCard}
          contentContainerStyle={[
            styles.listContainer,
            filteredNotes.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotes(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  greeting: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Author-Medium",
    marginBottom: 2,
  },
  title: { fontSize: 28, color: colors.primaryBlack, fontFamily: "Author-Bold" },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  statValue: { fontSize: 15, fontFamily: "Author-Bold", color: colors.primaryBlack },
  statLabel: { fontSize: 11, color: "#94A3B8", fontFamily: "Author-Medium" },
  statDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 2 },

  // Filter
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 5,
  },
  filterTabActive: { backgroundColor: colors.primaryBlack },
  filterTabText: { fontSize: 12, fontFamily: "Author-Medium", color: "#6B7280" },
  filterTabTextActive: { color: "#fff" },
  filterCount: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterCountText: { fontSize: 10, fontFamily: "Author-SemiBold", color: "#6B7280" },
  filterCountTextActive: { color: "#fff" },

  // Center
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // List
  listContainer: { padding: 16, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 2,
  },
  cardMeta: { fontSize: 12, color: "#6B7280", fontFamily: "Author-Regular" },
  cardDate: { fontSize: 12, color: "#94A3B8", fontFamily: "Author-Regular" },
  cardRight: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontFamily: "Author-SemiBold" },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8F9FB",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontFamily: "Author-SemiBold", color: "#475569", width: 34, textAlign: "right" },
  gapText: { fontSize: 11, fontFamily: "Author-Medium", color: "#DC2626" },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    fontFamily: "Author-Regular",
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: { color: "#fff", fontSize: 15, fontFamily: "Author-SemiBold" },
});
