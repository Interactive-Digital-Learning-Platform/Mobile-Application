import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Play,
  Pause,
  BookOpen,
  Volume2,
  Info,
  RotateCcw,
  CheckCircle2,
  Target,
  AlertCircle,
  Sparkles,
} from "lucide-react-native";

import {
  getNotesResourceUrl,
  notesAssetsClient,
} from "@/api/apiClients";
import { materialsApi } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
import Markdown from "react-native-markdown-display";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const { width: SCREEN_W } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════════════
// FLASHCARD — Flip animation
// ═══════════════════════════════════════════════════════════════════════════

const Flashcard = ({ card }: { card: any }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flip = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const resetFlip = () => {
    if (!isFlipped) return;
    Animated.spring(flipAnim, {
      toValue: 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(false);
  };

  const frontRot = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRot = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });
  const frontOp = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOp = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  return (
    <View style={styles.flashcardScene}>
      <TouchableOpacity activeOpacity={0.95} onPress={flip} style={styles.flashcardWrapper}>
        {/* Front */}
        <Animated.View
          style={[
            styles.flashcard,
            { transform: [{ rotateY: frontRot }], opacity: frontOp },
          ]}
        >
          <Text style={styles.flashcardBadge}>❓ QUESTION</Text>
          <Text style={styles.flashcardText}>{card.front}</Text>
          <Text style={styles.flashcardHint}>Tap to reveal answer</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.flashcard,
            styles.flashcardAnswerSide,
            { transform: [{ rotateY: backRot }], opacity: backOp },
          ]}
        >
          <Text style={[styles.flashcardBadge, { color: "#16A34A" }]}>✓ ANSWER</Text>
          <Text style={styles.flashcardText}>{card.back}</Text>
          <Text style={styles.flashcardHint}>Tap to see question</Text>
        </Animated.View>
      </TouchableOpacity>

      {isFlipped && (
        <TouchableOpacity style={styles.resetBtn} onPress={resetFlip}>
          <RotateCcw size={14} color="#6B7280" />
          <Text style={styles.resetBtnText}>Flip back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FLASHCARD LIST — Vertical scroll through all cards
// ═══════════════════════════════════════════════════════════════════════════

const FlashcardList = ({ flashcards }: { flashcards: any[] }) => {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toggleDone = (index: number) => {
    const next = new Set(completed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCompleted(next);
  };

  const allDone = completed.size === flashcards.length;

  return (
    <View style={styles.flashcardListContainer}>
      {/* Summary row */}
      <View style={styles.flashcardListHeader}>
        <Text style={styles.flashcardListCount}>
          {flashcards.length} cards · tap to flip
        </Text>
        <View style={styles.flashcardDoneCount}>
          <CheckCircle2 size={14} color="#16A34A" />
          <Text style={styles.flashcardDoneText}>
            {completed.size} / {flashcards.length}
          </Text>
        </View>
      </View>

      {/* Completion banner */}
      {allDone && (
        <View style={styles.completionBanner}>
          <CheckCircle2 size={20} color="#16A34A" />
          <Text style={styles.completionText}>🎉 All flashcards reviewed!</Text>
        </View>
      )}

      {/* All cards stacked vertically */}
      {flashcards.map((card, i) => (
        <View key={i} style={styles.flashcardListItem}>
          {/* Card number + done toggle */}
          <View style={styles.flashcardListMeta}>
            <Text style={styles.flashcardListNum}>#{i + 1}</Text>
            <TouchableOpacity
              style={[
                styles.flashcardDoneBtn,
                completed.has(i) && styles.flashcardDoneBtnActive,
              ]}
              onPress={() => toggleDone(i)}
              activeOpacity={0.7}
            >
              <CheckCircle2
                size={14}
                color={completed.has(i) ? "#16A34A" : "#CBD5E1"}
              />
              <Text
                style={[
                  styles.flashcardDoneBtnText,
                  completed.has(i) && { color: "#16A34A" },
                ]}
              >
                {completed.has(i) ? "Done" : "Mark done"}
              </Text>
            </TouchableOpacity>
          </View>
          <Flashcard card={card} />
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MIND MAP — Visual branch diagram
// ═══════════════════════════════════════════════════════════════════════════

const BRANCH_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
];

const MindMapBranch = ({
  node,
  color,
  isRoot = false,
}: {
  node: any;
  color: string;
  isRoot?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <View style={styles.mmBranch}>
      {/* Node pill */}
      <TouchableOpacity
        activeOpacity={hasChildren ? 0.7 : 1}
        onPress={() => hasChildren && setExpanded(!expanded)}
        style={[
          styles.mmNodePill,
          isRoot
            ? [styles.mmRootPill, { backgroundColor: color }]
            : [styles.mmChildPill, { borderColor: color, backgroundColor: `${color}15` }],
        ]}
      >
        {hasChildren && !isRoot && (
          <View style={[styles.mmDot, { backgroundColor: color }]} />
        )}
        <Text
          style={[
            styles.mmNodeText,
            isRoot
              ? styles.mmRootText
              : [styles.mmChildText, { color }],
          ]}
          numberOfLines={3}
        >
          {node.label}
        </Text>
        {hasChildren && (
          <Text style={{ color: isRoot ? "rgba(255,255,255,0.7)" : color, fontSize: 12, marginLeft: 4 }}>
            {expanded ? "▲" : "▼"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Children */}
      {hasChildren && expanded && (
        <View style={[styles.mmChildrenWrap, { borderLeftColor: `${color}40` }]}>
          {node.children.map((child: any, i: number) => (
            <MindMapBranch
              key={i}
              node={child}
              color={color}
              isRoot={false}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const MindMapViewer = ({ mindMap }: { mindMap: any }) => {
  const hasChildren = mindMap.children && mindMap.children.length > 0;

  return (
    <View style={styles.mmContainer}>
      {/* Root node */}
      <View style={[styles.mmRootPill, { backgroundColor: colors.primary, alignSelf: "center", marginBottom: 16 }]}>
        <Text style={styles.mmRootText}>{mindMap.label}</Text>
      </View>

      {/* Branches */}
      {hasChildren && (
        <View style={styles.mmBranchesGrid}>
          {mindMap.children.map((child: any, i: number) => (
            <MindMapBranch
              key={i}
              node={child}
              color={BRANCH_COLORS[i % BRANCH_COLORS.length]}
              isRoot={false}
            />
          ))}
        </View>
      )}

      <Text style={styles.mmHint}>💡 Tap a branch to expand / collapse</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO PLAYER — using expo-audio
// ═══════════════════════════════════════════════════════════════════════════

const AudioPlayerView = ({
  audioUrl,
  fallbackScript,
}: {
  audioUrl: string;
  fallbackScript: string | null;
}) => {
  const isScript = audioUrl.endsWith(".txt");
  const fullUrl = getNotesResourceUrl(audioUrl);

  const player = useAudioPlayer(isScript ? undefined : { uri: fullUrl });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const duration = status.duration ?? 0;
  const position = status.currentTime ?? 0;
  const progress = duration > 0 ? position / duration : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  if (isScript) {
    return (
      <View style={styles.transcriptCard}>
        <View style={styles.infoRow}>
          <Info size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Audio generation requires a configured ElevenLabs key. Here is the lesson
            transcript instead.
          </Text>
        </View>
        <Text style={styles.transcriptLabel}>LESSON TRANSCRIPT</Text>
        <Text style={styles.transcriptText}>
          {fallbackScript ?? "Loading script…"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.playerCard}>
      {/* Play/Pause button */}
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.85}>
        {isPlaying ? (
          <Pause size={44} color="#fff" fill="#fff" />
        ) : (
          <Play size={44} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>

      <Text style={styles.playStatus}>{isPlaying ? "▶ NOW PLAYING" : "READY TO LISTEN"}</Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURED NOTES VIEWER — with gap annotations & auto-scroll anchors
// ═══════════════════════════════════════════════════════════════════════════

interface NoteSection {
  id: number;
  heading: string;
  body: string;
  isRemediatedGap: boolean;
  isFromNotes: boolean;
}

const StructuredNotesViewer = ({
  textContent,
  targetGapId,
  targetConcept,
}: {
  textContent: string;
  targetGapId?: string;
  targetConcept?: string;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [sectionLayouts, setSectionLayouts] = useState<Record<number, number>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Parse sections by ## or ### headings
  const sections: NoteSection[] = React.useMemo(() => {
    const rawChunks = textContent.split(/(?=\n##\s+|\n###\s+)/g);
    return rawChunks.map((chunk, idx) => {
      const trimmed = chunk.trim();
      const firstLine = trimmed.split("\n")[0] || "";
      const isRemediatedGap =
        trimmed.includes("Remediated Learning Gap") ||
        trimmed.includes("Identified Learning Gap") ||
        trimmed.includes("⚠️");
      const isFromNotes = trimmed.includes("From Your Handwritten Notes");

      return {
        id: idx,
        heading: firstLine.replace(/^[#\s]+/, ""),
        body: trimmed,
        isRemediatedGap,
        isFromNotes,
      };
    });
  }, [textContent]);

  // Determine which section to jump to if target params exist
  const targetSectionIndex = React.useMemo(() => {
    if (!targetGapId && !targetConcept) return -1;
    const lowerConcept = (targetConcept || "").toLowerCase();
    const lowerGapId = (targetGapId || "").toLowerCase();

    // 1. Try exact concept match
    let matchIdx = sections.findIndex((s) => {
      const lower = s.body.toLowerCase();
      return (
        (lowerConcept && lower.includes(lowerConcept)) ||
        (lowerGapId && lower.includes(lowerGapId))
      );
    });

    // 2. Fallback to first remediated gap section
    if (matchIdx === -1) {
      matchIdx = sections.findIndex((s) => s.isRemediatedGap);
    }

    return matchIdx;
  }, [sections, targetGapId, targetConcept]);

  // Auto-scroll when layout is ready
  useEffect(() => {
    if (targetSectionIndex >= 0 && sectionLayouts[targetSectionIndex] !== undefined) {
      const targetY = sectionLayouts[targetSectionIndex];
      setHighlightedIndex(targetSectionIndex);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, targetY - 16),
          animated: true,
        });
      }, 350);
    }
  }, [targetSectionIndex, sectionLayouts]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <View style={styles.contentPad}>
        {/* Direct Gap Jump Notice */}
        {(targetConcept || targetGapId) && (
          <View style={styles.gapJumpBanner}>
            <View style={styles.gapJumpIconWrap}>
              <Target size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gapJumpTitle}>Targeted Gap Remediation</Text>
              <Text style={styles.gapJumpSub}>
                Auto-focused on:{" "}
                <Text style={{ fontWeight: "700", color: "#B45309" }}>
                  {targetConcept || targetGapId}
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* Legend / Visual Guide Bar */}
        <View style={styles.snLegendRow}>
          <View style={[styles.snLegendTag, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Text style={[styles.snLegendTagText, { color: "#16A34A" }]}>📝 From Your Notes</Text>
          </View>
          <View style={[styles.snLegendTag, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
            <Text style={[styles.snLegendTagText, { color: "#D97706" }]}>⚠️ Remediated Gap</Text>
          </View>
          <View style={[styles.snLegendTag, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}>
            <Text style={[styles.snLegendTagText, { color: "#4F46E5" }]}>💡 Definitions & Theory</Text>
          </View>
        </View>

        {/* Section Cards */}
        {sections.map((sec, idx) => {
          const isTargeted = highlightedIndex === idx;

          return (
            <View
              key={sec.id}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionLayouts((prev) => ({ ...prev, [idx]: y }));
              }}
              style={[
                styles.snSectionCard,
                sec.isRemediatedGap && styles.snSectionCardGap,
                isTargeted && styles.snSectionCardTargeted,
              ]}
            >
              {sec.isRemediatedGap && (
                <View style={styles.snGapTagBadge}>
                  <Target size={12} color="#D97706" />
                  <Text style={styles.snGapTagBadgeText}>Remediated Gap</Text>
                </View>
              )}
              {isTargeted && (
                <View style={styles.snTargetedBadge}>
                  <Sparkles size={12} color="#fff" />
                  <Text style={styles.snTargetedBadgeText}>Jumped to this section</Text>
                </View>
              )}
              <Markdown style={markdownStyles}>{sec.body}</Markdown>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function MaterialViewer() {
  const { id, type, targetGapId, targetConcept } = useLocalSearchParams<{
    id: string;
    type: string;
    targetGapId?: string;
    targetConcept?: string;
  }>();
  const router = useRouter();

  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackScript, setFallbackScript] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await materialsApi.getMaterialByType(id, type);
        if (response.success) {
          setMaterial(response.data);
          // If it's an audio script fallback, fetch the text
          const audioUrl: string = response.data?.audioUrl ?? "";
          if (type === "audio" && audioUrl.endsWith(".txt")) {
            const scriptRes = await notesAssetsClient.get(audioUrl);
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

  const getTitle = () =>
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const getHeaderColor = () => {
    const map: Record<string, string> = {
      structured_notes: "#3B82F6",
      flashcards: "#8B5CF6",
      revision_summary: "#10B981",
      learning_points: "#EF4444",
      audio: "#F59E0B",
      definitions: "#6366F1",
      mindmap: "#EC4899",
    };
    return map[type] ?? colors.primary;
  };

  const headerColor = getHeaderColor();

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading study material…</Text>
        </View>
      );
    }
    if (!material) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Could not load this material.</Text>
        </View>
      );
    }

    // ── Audio ──────────────────────────────────────────────────────────────
    if (type === "audio" && material.audioUrl) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.materialHero}>
            <View style={[styles.heroIcon, { backgroundColor: `${headerColor}18` }]}>
              <Volume2 size={36} color={headerColor} />
            </View>
            <Text style={[styles.heroTitle, { color: headerColor }]}>Audio Lesson</Text>
            <Text style={styles.heroSub}>
              A spoken explanation tailored to your handwritten notes & gaps
            </Text>
          </View>
          <AudioPlayerView
            audioUrl={material.audioUrl}
            fallbackScript={fallbackScript}
          />
        </View>
      );
    }

    // ── Flashcards ─────────────────────────────────────────────────────────────────
    if (type === "flashcards" && material.flashcards?.length > 0) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.materialHero}>
            <Text style={styles.heroSub}>
              {material.flashcards.length} cards · scroll down · tap each to flip
            </Text>
          </View>
          <FlashcardList flashcards={material.flashcards} />
        </View>
      );
    }

    // ── Mind Map ───────────────────────────────────────────────────────────
    if (type === "mindmap" && material.mindMap) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.materialHero}>
            <Text style={styles.heroSub}>Visual concept map of the complete lesson</Text>
          </View>
          <MindMapViewer mindMap={material.mindMap} />
        </View>
      );
    }

    // ── Definitions ────────────────────────────────────────────────────────
    if (type === "definitions" && material.definitions?.length > 0) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.materialHero}>
            <Text style={styles.heroSub}>
              {material.definitions.length} key terms defined
            </Text>
          </View>
          {material.definitions.map((def: any, i: number) => (
            <View key={i} style={styles.definitionCard}>
              <View style={[styles.defIndex, { backgroundColor: `${headerColor}15` }]}>
                <Text style={[styles.defIndexText, { color: headerColor }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.defTerm, { color: headerColor }]}>{def.term}</Text>
                <Text style={styles.defDefinition}>{def.definition}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // ── Structured Notes (Specialized gap-annotated viewer) ─────────────────
    if (type === "structured_notes" && material.textContent) {
      return (
        <StructuredNotesViewer
          textContent={material.textContent}
          targetGapId={targetGapId}
          targetConcept={targetConcept}
        />
      );
    }

    // ── Other Markdown views (revision_summary, learning_points) ───────────
    if (material.textContent) {
      return (
        <View style={styles.contentPad}>
          <View style={styles.markdownCard}>
            <Markdown style={markdownStyles}>{material.textContent}</Markdown>
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
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: `${headerColor}20` }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={26} color={colors.primaryBlack} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: headerColor }]} />
          <Text style={styles.headerTitle}>{getTitle()}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* For structured_notes, StructuredNotesViewer manages its own scroll to support accurate section offsets */}
      {type === "structured_notes" ? (
        renderContent()
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {renderContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const markdownStyles = {
  body: { fontSize: 15, color: "#374151", fontWeight: "400" as const, lineHeight: 25 },
  heading1: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.primaryBlack,
    marginTop: 4,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1E293B",
    marginTop: 14,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },
  paragraph: { marginBottom: 10 },
  list_item: { marginBottom: 6, paddingLeft: 4 },
  strong: { fontWeight: "700" as const, color: colors.primaryBlack },
  em: { fontStyle: "italic" as const, color: colors.primary },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  code_inline: {
    backgroundColor: "#F1F5F9",
    color: "#BE185D",
    fontWeight: "600" as const,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: "#F8FAFC",
    borderLeftColor: "#3B82F6",
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1, backgroundColor: "#F8F9FB" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  loadingText: { marginTop: 14, fontSize: 15, color: "#6B7280", fontWeight: "500" },
  errorText: { fontSize: 15, color: "#94A3B8", fontWeight: "500", textAlign: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.primaryBlack },

  contentPad: { padding: 16 },

  // Material hero
  materialHero: { alignItems: "center", marginBottom: 20, marginTop: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  heroSub: { fontSize: 14, color: "#94A3B8", fontWeight: "400", textAlign: "center" },

  // ── Flashcards ──────────────────────────────────────────────────────────────

  swiperContainer: { alignItems: "center" },
  progressDots: { flexDirection: "row", gap: 5, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E2E8F0" },
  progressDotActive: { backgroundColor: colors.primary, width: 20 },
  progressDotDone: { backgroundColor: "#10B981" },
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 16,
  },
  completionText: { fontSize: 14, fontWeight: "600", color: "#16A34A" },

  flashcardScene: { width: "100%", alignItems: "center" },
  flashcardCounter: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 12,
  },
  flashcardWrapper: { width: "100%", height: 230, position: "relative" },
  flashcard: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  flashcardAnswerSide: { backgroundColor: "#FFFBF7", borderColor: "#FED7AA" },
  flashcardBadge: {
    position: "absolute",
    top: 18,
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  flashcardText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primaryBlack,
    textAlign: "center",
    lineHeight: 28,
  },
  flashcardHint: {
    position: "absolute",
    bottom: 18,
    fontSize: 12,
    fontWeight: "500",
    color: "#CBD5E1",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  resetBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  // ── Flashcard vertical list ──────────────────────────────────────────────────────────
  flashcardListContainer: { gap: 16 },
  flashcardListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  flashcardListCount: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  flashcardDoneCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  flashcardDoneText: { fontSize: 13, color: "#16A34A", fontWeight: "600" },
  flashcardListItem: { gap: 6 },
  flashcardListMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  flashcardListNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CBD5E1",
    letterSpacing: 0.5,
  },
  flashcardDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  flashcardDoneBtnActive: { backgroundColor: "#DCFCE7" },
  flashcardDoneBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // ── Mind Map ─────────────────────────────────────────────────────────────────

  mmContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  mmBranchesGrid: { gap: 10 },
  mmBranch: { gap: 4 },
  mmNodePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    maxWidth: SCREEN_W - 80,
  },
  mmRootPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mmRootText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  mmChildPill: {
    borderWidth: 1.5,
  },
  mmDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  mmNodeText: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  mmChildText: { fontSize: 14, fontWeight: "500" },
  mmChildrenWrap: {
    marginLeft: 20,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  mmHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
    marginTop: 16,
  },

  // ── Audio Player ─────────────────────────────────────────────────────────────

  playerCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  playBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  playStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 20,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  timeText: { fontSize: 12, fontWeight: "500", color: "#94A3B8" },

  transcriptCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0F9FF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#0369A1", lineHeight: 20 },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 10,
  },
  transcriptText: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.primaryBlack,
    lineHeight: 26,
  },

  // ── Definitions ──────────────────────────────────────────────────────────────

  definitionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  defIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  defIndexText: { fontSize: 14, fontWeight: "700" },
  defTerm: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  defDefinition: { fontSize: 14, fontWeight: "400", color: "#475569", lineHeight: 22 },

  // ── Structured Notes Specialized Styles ──────────────────────────────────────

  gapJumpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF3C7",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  gapJumpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
  },
  gapJumpTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  gapJumpSub: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500",
  },

  snLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  snLegendTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  snLegendTagText: {
    fontSize: 11,
    fontWeight: "700",
  },

  snSectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  snSectionCardGap: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFCF5",
  },
  snSectionCardTargeted: {
    borderColor: "#F59E0B",
    borderWidth: 2,
    backgroundColor: "#FFFDF8",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  snGapTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  snGapTagBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  snTargetedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  snTargetedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Markdown ─────────────────────────────────────────────────────────────────

  markdownCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
});
