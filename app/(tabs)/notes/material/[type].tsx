import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Play, Pause } from "lucide-react-native";
import { materialsApi } from "@/services/api";
import { colors } from "@/constants/colors";
import Markdown from 'react-native-markdown-display';
import { Audio } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

export default function MaterialViewer() {
  const { id, type } = useLocalSearchParams<{ id: string, type: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await materialsApi.getMaterialByType(id, type);
        if (response.success) {
          setMaterial(response.data);
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
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
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
        const fullUrl = `${API_URL}${url}`;
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

  // Render a recursive mind map node
  const renderMindMapNode = (node: any, depth = 0) => {
    return (
      <View key={node.label} style={[styles.mindMapNodeContainer, { marginLeft: depth * 20 }]}>
        <View style={styles.mindMapBullet} />
        <Text style={[styles.mindMapLabel, depth === 0 && styles.mindMapRootLabel]}>
          {node.label}
        </Text>
        {node.children?.map((child: any) => renderMindMapNode(child, depth + 1))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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

    // Handle audio material
    if (type === 'audio' && material.audioUrl) {
      // If it's the fallback script txt file
      if (material.audioUrl.endsWith('.txt')) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>ElevenLabs API key missing in backend.</Text>
            <Text style={[styles.plainText, { marginTop: 20 }]}>
              The script was generated but could not be converted to audio.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.audioContainer}>
          <View style={styles.audioCard}>
            <Text style={styles.audioTitle}>Audio Explanation</Text>
            <Text style={styles.audioSub}>Listen to a podcast-style summary of this topic.</Text>
            
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={() => playAudio(material.audioUrl)}
            >
              {isPlaying ? (
                <Pause size={48} color="#fff" />
              ) : (
                <Play size={48} color="#fff" style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
            <Text style={styles.playStatusText}>{isPlaying ? "Playing..." : "Tap to Play"}</Text>
          </View>
        </View>
      );
    }

    // Handle mind map material
    if (type === 'mindmap' && material.mindMap) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.mindMapWrapper}>
            {renderMindMapNode(material.mindMap)}
          </View>
        </View>
      );
    }

    // Handle Flashcards
    if (type === 'flashcards' && material.flashcards) {
      return (
        <View style={styles.contentContainer}>
          {material.flashcards.map((card: any, index: number) => (
            <View key={index} style={styles.flashcardContainer}>
              <Text style={styles.flashcardQ}>Q: {card.front}</Text>
              <View style={styles.flashcardDivider} />
              <Text style={styles.flashcardA}>A: {card.back}</Text>
            </View>
          ))}
        </View>
      );
    }

    // Handle Definitions
    if (type === 'definitions' && material.definitions) {
      return (
        <View style={styles.contentContainer}>
          {material.definitions.map((def: any, index: number) => (
            <View key={index} style={styles.defContainer}>
              <Text style={styles.defTerm}>{def.term}</Text>
              <Text style={styles.defText}>{def.definition}</Text>
            </View>
          ))}
        </View>
      );
    }

    // Fallback to markdown content for structured notes, summary, points
    if (material.textContent) {
      return (
        <View style={styles.contentContainer}>
          <Markdown style={markdownStyles}>
            {material.textContent}
          </Markdown>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Format not supported yet.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: { fontSize: 16, color: '#374151', fontFamily: "Author-Regular", lineHeight: 26 },
  heading1: { fontSize: 24, fontFamily: "Author-Bold", color: colors.primaryBlack, marginTop: 24, marginBottom: 16 },
  heading2: { fontSize: 20, fontFamily: "Author-SemiBold", color: colors.primaryBlack, marginTop: 20, marginBottom: 12 },
  heading3: { fontSize: 18, fontFamily: "Author-Medium", color: colors.primaryBlack, marginTop: 16, marginBottom: 8 },
  paragraph: { marginBottom: 16 },
  list_item: { marginBottom: 8 },
  strong: { fontFamily: "Author-Bold", color: colors.primaryBlack },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontFamily: "Author-SemiBold", color: colors.primaryBlack },
  scrollContent: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, marginTop: 100 },
  errorText: { fontSize: 16, color: "#6b7280", fontFamily: "Author-Medium" },
  contentContainer: { padding: 20, paddingBottom: 60 },
  plainText: { fontSize: 16, color: colors.primaryBlack, fontFamily: "Author-Regular", lineHeight: 26 },
  
  // Flashcards
  flashcardContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  flashcardQ: { fontSize: 16, fontFamily: "Author-SemiBold", color: colors.primaryBlack, marginBottom: 12 },
  flashcardDivider: { height: 1, backgroundColor: "#e5e7eb", marginBottom: 12 },
  flashcardA: { fontSize: 15, fontFamily: "Author-Regular", color: "#4b5563", lineHeight: 22 },

  // Definitions
  defContainer: { marginBottom: 24 },
  defTerm: { fontSize: 18, fontFamily: "Author-Bold", color: colors.primary, marginBottom: 4 },
  defText: { fontSize: 16, fontFamily: "Author-Regular", color: "#4b5563", lineHeight: 24 },

  // Audio
  audioContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, marginTop: 40 },
  audioCard: {
    width: "100%", backgroundColor: "#f9fafb", borderRadius: 24, padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  audioTitle: { fontSize: 22, fontFamily: "Author-Bold", color: colors.primaryBlack, marginBottom: 8 },
  audioSub: { fontSize: 15, fontFamily: "Author-Regular", color: "#6b7280", textAlign: "center", marginBottom: 32 },
  playButton: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  playStatusText: { marginTop: 24, fontSize: 16, fontFamily: "Author-Medium", color: colors.primaryBlack },

  // Mind map
  mindMapWrapper: { backgroundColor: "#f9fafb", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  mindMapNodeContainer: { paddingVertical: 6, position: "relative" },
  mindMapBullet: { position: "absolute", left: -14, top: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  mindMapLabel: { fontSize: 16, fontFamily: "Author-Regular", color: "#4b5563", lineHeight: 24 },
  mindMapRootLabel: { fontSize: 18, fontFamily: "Author-Bold", color: colors.primaryBlack },
});
