import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, FileText, ChevronRight } from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { notesApi } from "@/services/api";
import { colors } from "@/constants/colors";

export default function NotesIndex() {
  const router = useRouter();
  const { userId } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = async () => {
    if (!userId) return;
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
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return '#3b82f6'; // blue
      case 'processing': return '#f59e0b'; // amber
      case 'analyzed': return '#10b981'; // green
      case 'failed': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const renderNoteCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/notes/${item._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <FileText size={24} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.cardAction}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <ChevronRight size={20} color="#9ca3af" style={{ marginLeft: 8 }} />
        </View>
      </View>
      
      {item.analysis && (
        <View style={styles.analysisPreview}>
          <Text style={styles.subjectText}>{item.analysis.subject} • {item.analysis.topic}</Text>
          <View style={styles.completenessContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${item.analysis.overallCompleteness}%`,
                    backgroundColor: item.analysis.overallCompleteness > 70 ? '#10b981' : 
                                     item.analysis.overallCompleteness > 40 ? '#f59e0b' : '#ef4444'
                  }
                ]} 
              />
            </View>
            <Text style={styles.completenessText}>{item.analysis.overallCompleteness}% Score</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
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

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <FileText size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptyText}>
            Upload your handwritten notes to get AI-powered analysis and learning materials.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push("/(tabs)/notes/upload")}
          >
            <Text style={styles.emptyButtonText}>Upload First Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderNoteCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 4,
    fontFamily: "Author-Medium",
  },
  title: {
    fontSize: 32,
    color: colors.primaryBlack,
    fontFamily: "Author-Bold",
  },
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: "#9ca3af",
    fontFamily: "Author-Regular",
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Author-Medium",
  },
  analysisPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  subjectText: {
    fontSize: 14,
    fontFamily: "Author-Medium",
    color: "#4b5563",
    marginBottom: 8,
  },
  completenessContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginRight: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  completenessText: {
    fontSize: 12,
    fontFamily: "Author-SemiBold",
    color: "#4b5563",
    width: 60,
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    fontFamily: "Author-Regular",
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Author-Medium",
  },
});
