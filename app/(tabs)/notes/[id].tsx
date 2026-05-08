import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Brain, BookOpen, Clock, FileText, Layers, AlertCircle, Play } from "lucide-react-native";
import { notesApi, materialsApi } from "@/services/api";
import { colors } from "@/constants/colors";

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [materialsOverview, setMaterialsOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Determine current pipeline state
  const status = note?.status || "loading";
  const isProcessing = status === "uploaded" || status === "processing";
  const isFailed = status === "failed";
  const isAnalyzed = status === "analyzed";

  const fetchNote = async () => {
    try {
      const response = await notesApi.getNote(id);
      if (response.success) {
        setNote(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch note:", error);
    }
  };

  const fetchMaterials = async () => {
    if (status !== "analyzed") return;
    try {
      const response = await materialsApi.getMaterials(id);
      if (response.success) {
        setMaterialsOverview(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  };

  const handleGenerateMaterials = async () => {
    setIsGenerating(true);
    try {
      await materialsApi.generateMaterials(id);
      // Wait a bit, then fetch materials again to see them appear
      setTimeout(fetchMaterials, 3000);
    } catch (error) {
      console.error("microsoft/trocr-base-handwritten", "Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchNote();

    // Poll if still processing
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(fetchNote, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, isProcessing]);

  useEffect(() => {
    if (isAnalyzed) {
      fetchMaterials();
    }
  }, [isAnalyzed]);

  if (loading && !note) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{note?.title || "Note Details"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Processing State */}
        {isProcessing && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.processingTitle}>AI is analyzing your notes...</Text>
            <Text style={styles.processingText}>
              We are extracting the text, identifying the subject, and finding learning gaps.
            </Text>
          </View>
        )}

        {/* Failed State */}
        {isFailed && (
          <View style={[styles.processingCard, { borderColor: '#ef4444' }]}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={styles.processingTitle}>Analysis Failed</Text>
            <Text style={styles.processingText}>{note?.errorMessage || "We couldn't read the image clearly."}</Text>
          </View>
        )}

        {/* Analyzed State */}
        {isAnalyzed && note?.analysis && (
          <>
            <View style={styles.analysisCard}>
              <View style={styles.subjectHeader}>
                <Brain size={24} color={colors.primary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.subjectTitle}>{note.analysis.subject}</Text>
                  <Text style={styles.topicText}>{note.analysis.topic}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Completeness</Text>
                  <Text style={[styles.statValue, { color: note.analysis.overallCompleteness > 70 ? '#10b981' : '#f59e0b' }]}>
                    {note.analysis.overallCompleteness}%
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Gaps Found</Text>
                  <Text style={[styles.statValue, { color: note.analysis.learningGaps.length > 0 ? '#ef4444' : '#10b981' }]}>
                    {note.analysis.learningGaps.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Learning Materials Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Study Materials</Text>
              {materialsOverview?.missingCount > 0 && (
                <TouchableOpacity 
                  style={styles.generateBtn}
                  onPress={handleGenerateMaterials}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.generateBtnText}>Generate All</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.materialsGrid}>
              <MaterialCard 
                icon={<BookOpen size={24} color="#3b82f6" />}
                title="Structured Notes"
                color="#3b82f6"
                isReady={materialsOverview?.generatedTypes.includes('structured_notes')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/structured_notes`)}
              />
              <MaterialCard 
                icon={<Layers size={24} color="#8b5cf6" />}
                title="Flashcards"
                color="#8b5cf6"
                isReady={materialsOverview?.generatedTypes.includes('flashcards')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/flashcards`)}
              />
              <MaterialCard 
                icon={<FileText size={24} color="#10b981" />}
                title="Revision Summary"
                color="#10b981"
                isReady={materialsOverview?.generatedTypes.includes('revision_summary')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/revision_summary`)}
              />
              <MaterialCard 
                icon={<AlertCircle size={24} color="#ef4444" />}
                title="Learning Gaps"
                color="#ef4444"
                isReady={materialsOverview?.generatedTypes.includes('learning_points')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/learning_points`)}
              />
              <MaterialCard 
                icon={<Play size={24} color="#f59e0b" />}
                title="Audio Lesson"
                color="#f59e0b"
                isReady={materialsOverview?.generatedTypes.includes('audio')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/audio`)}
              />
              <MaterialCard 
                icon={<BookOpen size={24} color="#6366f1" />}
                title="Definitions"
                color="#6366f1"
                isReady={materialsOverview?.generatedTypes.includes('definitions')}
                onPress={() => router.push(`/(tabs)/notes/${id}/material/definitions`)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Subcomponent for Material Cards
const MaterialCard = ({ icon, title, color, isReady, onPress }: any) => {
  return (
    <TouchableOpacity 
      style={[styles.materialCard, !isReady && styles.materialCardDisabled]} 
      onPress={onPress}
      disabled={!isReady}
      activeOpacity={0.7}
    >
      <View style={[styles.materialIcon, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={styles.materialTitle}>{title}</Text>
      <Text style={styles.materialStatus}>
        {isReady ? "Ready" : "Waiting"}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  processingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 20,
  },
  processingTitle: {
    fontSize: 20,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 8,
    textAlign: "center",
  },
  processingText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    fontFamily: "Author-Regular",
    lineHeight: 22,
  },
  analysisCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  subjectTitle: {
    fontSize: 20,
    fontFamily: "Author-Bold",
    color: colors.primaryBlack,
  },
  topicText: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: "Author-Medium",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "Author-Medium",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Author-Bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
  },
  generateBtn: {
    backgroundColor: colors.primaryBlack,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateBtnText: {
    color: "#fff",
    fontFamily: "Author-Medium",
    fontSize: 12,
  },
  materialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 40,
  },
  materialCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  materialCardDisabled: {
    opacity: 0.6,
  },
  materialIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  materialTitle: {
    fontSize: 14,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 4,
  },
  materialStatus: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "Author-Medium",
  },
});
