import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Play, Pause, BookOpen, Volume2, Info, Lightbulb } from "lucide-react-native";
import {
  getNotesResourceUrl,
  notesAssetsClient,
} from "@/api/apiClients";
import { materialsApi } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
import Markdown from 'react-native-markdown-display';
import { Audio } from 'expo-av';

// --- Sub-component: Flippable Flashcard ---
const Flashcard = ({ card }: { card: any }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.flashcardWrapper}>
      <Animated.View style={[styles.flashcard, { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity }]}>
        <Text style={styles.flashcardLabel}>QUESTION</Text>
        <Text style={styles.flashcardMainText}>{card.front}</Text>
        <Text style={styles.flashcardFooter}>Tap to see answer</Text>
      </Animated.View>
      <Animated.View style={[styles.flashcard, styles.flashcardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
        <Text style={[styles.flashcardLabel, { color: colors.primary }]}>ANSWER</Text>
        <Text style={styles.flashcardMainText}>{card.back}</Text>
        <Text style={styles.flashcardFooter}>Tap to see question</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function MaterialViewer() {
  const { id, type } = useLocalSearchParams<{ id: string, type: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackScript, setFallbackScript] = useState<string | null>(null);
  
  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await materialsApi.getMaterialByType(id, type);
        if (response.success) {
          setMaterial(response.data);
          
          // If it's an audio script fallback, fetch the text
          if (type === 'audio' && response.data.audioUrl?.endsWith('.txt')) {
            const scriptRes = await notesAssetsClient.get(response.data.audioUrl);
            setFallbackScript(scriptRes.data);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch material ${type}:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterial();
  }, [id, type]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const getTitle = () => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const playAudio = async (url: string) => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const fullUrl = getNotesResourceUrl(url);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        });
      }
    } catch (error) {
      console.error("Error playing audio", error);
    }
  };

  const renderMindMapNode = (node: any, depth = 0) => {
    return (
      <View key={node.label} style={[styles.mindMapNodeContainer, { marginLeft: depth * 16 }]}>
        <View style={[styles.mindMapLine, { height: '100%', left: -8 }]} />
        <View style={styles.mindMapItemRow}>
          <View style={[styles.mindMapBullet, depth === 0 && styles.mindMapRootBullet]} />
          <Text style={[styles.mindMapLabel, depth === 0 && styles.mindMapRootLabel]}>
            {node.label}
          </Text>
        </View>
        {node.children?.map((child: any) => renderMindMapNode(child, depth + 1))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating your study material...</Text>
        </View>
      );
    }

    if (!material) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Could not load material.</Text>
        </View>
      );
    }

    // --- Audio / Transcript View ---
    if (type === 'audio') {
      const isScriptOnly = material.audioUrl?.endsWith('.txt');
      return (
        <View style={styles.audioViewContainer}>
          <View style={styles.materialHeaderCard}>
            <View style={styles.iconCircle}>
              <Volume2 size={32} color={colors.primary} />
            </View>
            <Text style={styles.materialTitle}>Audio Lesson</Text>
            <Text style={styles.materialSub}>A spoken explanation tailored to your notes.</Text>
          </View>

          {isScriptOnly ? (
            <View style={styles.transcriptCard}>
              <View style={styles.infoRow}>
                <Info size={20} color={colors.primary} />
                <Text style={styles.infoText}>Audio generation requires an API key, so here is the lesson transcript instead.</Text>
              </View>
              <Text style={styles.transcriptLabel}>LESSON TRANSCRIPT</Text>
              <Text style={styles.transcriptText}>{fallbackScript || "Loading script..."}</Text>
            </View>
          ) : (
            <View style={styles.playerCard}>
               <TouchableOpacity 
                style={styles.mainPlayButton} 
                onPress={() => playAudio(material.audioUrl)}
              >
                {isPlaying ? (
                  <Pause size={40} color="#fff" fill="#fff" />
                ) : (
                  <Play size={40} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
              <Text style={styles.playStatusText}>{isPlaying ? "NOW PLAYING" : "READY TO LISTEN"}</Text>
            </View>
          )}
        </View>
      );
    }

    // --- Mind Map ---
    if (type === 'mindmap' && material.mindMap) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.mindMapCard}>
            {renderMindMapNode(material.mindMap)}
          </View>
        </View>
      );
    }

    // --- Flashcards ---
    if (type === 'flashcards' && material.flashcards) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={20} color={colors.primary} />
            <Text style={styles.sectionHeaderText}>TAP CARDS TO FLIP</Text>
          </View>
          {material.flashcards.map((card: any, index: number) => (
            <Flashcard key={index} card={card} />
          ))}
        </View>
      );
    }

    // --- Definitions ---
    if (type === 'definitions' && material.definitions) {
      return (
        <View style={styles.contentContainer}>
          {material.definitions.map((def: any, index: number) => (
            <View key={index} style={styles.definitionCard}>
              <Text style={styles.defTerm}>{def.term}</Text>
              <Text style={styles.defDefinition}>{def.definition}</Text>
            </View>
          ))}
        </View>
      );
    }

    // --- Markdown Views (Notes, Summary, Learning Points) ---
    if (material.textContent) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.markdownCard}>
            <Markdown style={markdownStyles}>
              {material.textContent}
            </Markdown>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.primaryBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: { fontSize: 16, color: '#374151', fontFamily: "Author-Regular", lineHeight: 26 },
  heading1: { fontSize: 26, fontFamily: "Author-Bold", color: colors.primaryBlack, marginTop: 10, marginBottom: 16 },
  heading2: { fontSize: 22, fontFamily: "Author-SemiBold", color: colors.primaryBlack, marginTop: 24, marginBottom: 12 },
  heading3: { fontSize: 19, fontFamily: "Author-Medium", color: colors.primaryBlack, marginTop: 20, marginBottom: 8 },
  paragraph: { marginBottom: 16 },
  list_item: { marginBottom: 10, paddingLeft: 4 },
  strong: { fontFamily: "Author-Bold", color: colors.primaryBlack },
  em: { fontStyle: 'italic', color: colors.primary },
  bullet_list: { marginBottom: 16 },
  ordered_list: { marginBottom: 16 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Author-Bold", color: colors.primaryBlack },
  scrollContent: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, marginTop: 100 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6B7280", fontFamily: "Author-Medium" },
  errorText: { fontSize: 16, color: "#6B7280", fontFamily: "Author-Medium" },
  contentContainer: { padding: 16, paddingBottom: 60 },
  
  // Flashcards
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginLeft: 4 },
  sectionHeaderText: { fontSize: 13, fontFamily: "Author-Bold", color: colors.primary, letterSpacing: 1 },
  flashcardWrapper: { height: 220, marginBottom: 20, position: "relative" },
  flashcard: {
    position: "absolute", width: "100%", height: "100%", backgroundColor: "#fff",
    borderRadius: 24, padding: 24, justifyContent: "center", alignItems: "center",
    backfaceVisibility: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#F1F5F9",
  },
  flashcardBack: { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" },
  flashcardLabel: { position: "absolute", top: 20, fontSize: 12, fontFamily: "Author-Bold", color: "#94A3B8", letterSpacing: 1 },
  flashcardMainText: { fontSize: 18, fontFamily: "Author-SemiBold", color: colors.primaryBlack, textAlign: "center", lineHeight: 28 },
  flashcardFooter: { position: "absolute", bottom: 20, fontSize: 12, fontFamily: "Author-Medium", color: "#94A3B8" },

  // Audio View
  audioViewContainer: { padding: 16, flex: 1 },
  materialHeaderCard: { alignItems: "center", marginBottom: 24, marginTop: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  materialTitle: { fontSize: 24, fontFamily: "Author-Bold", color: colors.primaryBlack, marginBottom: 4 },
  materialSub: { fontSize: 15, fontFamily: "Author-Regular", color: "#64748B", textAlign: "center" },
  playerCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 40, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 3 },
  mainPlayButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  playStatusText: { marginTop: 24, fontSize: 14, fontFamily: "Author-Bold", color: colors.primary, letterSpacing: 2 },
  transcriptCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  infoRow: { flexDirection: "row", gap: 12, backgroundColor: "#F0F9FF", padding: 16, borderRadius: 16, marginBottom: 24, alignItems: "center" },
  infoText: { flex: 1, fontSize: 14, fontFamily: "Author-Medium", color: "#0369A1", lineHeight: 20 },
  transcriptLabel: { fontSize: 12, fontFamily: "Author-Bold", color: "#94A3B8", letterSpacing: 1, marginBottom: 12 },
  transcriptText: { fontSize: 16, fontFamily: "Author-Regular", color: colors.primaryBlack, lineHeight: 28 },

  // Definitions
  definitionCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  defTerm: { fontSize: 18, fontFamily: "Author-Bold", color: colors.primary, marginBottom: 8 },
  defDefinition: { fontSize: 15, fontFamily: "Author-Regular", color: "#475569", lineHeight: 24 },

  // Mind Map
  mindMapCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  mindMapNodeContainer: { paddingVertical: 8, position: "relative" },
  mindMapLine: { position: "absolute", width: 1, backgroundColor: "#E2E8F0" },
  mindMapItemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mindMapBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CBD5E1" },
  mindMapRootBullet: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  mindMapLabel: { fontSize: 16, fontFamily: "Author-Medium", color: "#475569" },
  mindMapRootLabel: { fontSize: 20, fontFamily: "Author-Bold", color: colors.primaryBlack },

  // Markdown Card
  markdownCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
});
