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
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Info,
  RotateCcw,
  CheckCircle2,
  Target,
  Sparkles,
  BookOpen,
  Lightbulb,
  PencilLine,
  CircleHelp,
  Layers3,
  List,
  Trophy,
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

const Flashcard = ({ card, stacked = true }: { card: any; stacked?: boolean }) => {
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
      {stacked && (
        <>
          <View style={styles.flashcardStackBack} />
          <View style={styles.flashcardStackMiddle} />
        </>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isFlipped ? "Show question" : "Reveal answer"}
        activeOpacity={0.96}
        onPress={flip}
        style={styles.flashcardWrapper}
      >
        {/* Front */}
        <Animated.View
          style={[
            styles.flashcard,
            { transform: [{ rotateY: frontRot }], opacity: frontOp },
          ]}
        >
          <View style={styles.flashcardTopRow}>
            <View style={styles.flashcardQuestionIcon}>
              <CircleHelp size={16} color={colors.primary} />
            </View>
            <Text style={styles.flashcardBadge}>QUESTION</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={8}
            style={styles.flashcardText}
          >
            {card.front}
          </Text>
          <View style={styles.flashcardHintRow}>
            <RotateCcw size={13} color={colors.primary} />
            <Text style={styles.flashcardHint}>Tap to reveal the answer</Text>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.flashcard,
            styles.flashcardAnswerSide,
            { transform: [{ rotateY: backRot }], opacity: backOp },
          ]}
        >
          <View style={styles.flashcardTopRow}>
            <View style={styles.flashcardAnswerIcon}>
              <CheckCircle2 size={16} color="#15845B" />
            </View>
            <Text style={[styles.flashcardBadge, styles.flashcardAnswerBadge]}>ANSWER</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={9}
            style={styles.flashcardText}
          >
            {card.back}
          </Text>
          <View style={styles.flashcardHintRow}>
            <RotateCcw size={13} color="#5A987E" />
            <Text style={[styles.flashcardHint, styles.flashcardAnswerHint]}>
              Tap to return to the question
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FLASHCARD DECK — Interactive Deck & Step Dash Progress (Quiz Screenshot 5 Style)
// ═══════════════════════════════════════════════════════════════════════════

const FlashcardList = ({ flashcards }: { flashcards: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"deck" | "list">("deck");

  const currentCard = flashcards[currentIndex] || flashcards[0];
  const isCurrentDone = completed.has(currentIndex);

  const toggleDone = (index: number) => {
    const next = new Set(completed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCompleted(next);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const allDone = completed.size === flashcards.length;
  const masteryPercent = Math.round((completed.size / flashcards.length) * 100);
  const isLastCard = currentIndex === flashcards.length - 1;

  const handlePrimaryAction = () => {
    if (!isLastCard) {
      handleNext();
      return;
    }

    if (!isCurrentDone) toggleDone(currentIndex);
  };

  return (
    <View style={styles.flashcardListContainer}>
      <View style={styles.flashcardModePills}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.flashcardModeBtn, viewMode === "deck" && styles.flashcardModeBtnActive]}
          onPress={() => setViewMode("deck")}
          activeOpacity={0.8}
        >
          <Layers3 size={16} color={viewMode === "deck" ? colors.primary : "#7B8495"} />
          <Text
            style={[
              styles.flashcardModeBtnText,
              viewMode === "deck" && styles.flashcardModeBtnTextActive,
            ]}
          >
            Study deck
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.flashcardModeBtn, viewMode === "list" && styles.flashcardModeBtnActive]}
          onPress={() => setViewMode("list")}
          activeOpacity={0.8}
        >
          <List size={16} color={viewMode === "list" ? colors.primary : "#7B8495"} />
          <Text
            style={[
              styles.flashcardModeBtnText,
              viewMode === "list" && styles.flashcardModeBtnTextActive,
            ]}
          >
            Browse all
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.flashcardProgressPanel}>
        <View style={styles.flashcardProgressHeader}>
          <View>
            <Text style={styles.flashcardProgressEyebrow}>YOUR PROGRESS</Text>
            <Text style={styles.flashcardProgressTitle}>
              {completed.size} of {flashcards.length} mastered
            </Text>
          </View>
          <View style={styles.flashcardPercentBadge}>
            <Text style={styles.flashcardPercentText}>{masteryPercent}%</Text>
          </View>
        </View>
        <View style={styles.flashcardMasteryTrack}>
          <View style={[styles.flashcardMasteryFill, { width: `${masteryPercent}%` as any }]} />
        </View>
      </View>

      {/* Completion banner */}
      {allDone && (
        <View style={styles.completionBanner}>
          <View style={styles.completionIconWrap}>
            <Trophy size={19} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.completionTitle}>Deck mastered</Text>
            <Text style={styles.completionText}>You reviewed every flashcard.</Text>
          </View>
        </View>
      )}

      {viewMode === "deck" ? (
        <View style={styles.deckContainer}>
          {/* Subtitle / Counter Row */}
          <View style={styles.deckCounterRow}>
            <View>
              <Text style={styles.deckCounterLabel}>CURRENT CARD</Text>
              <Text style={styles.deckCounterText}>
                {currentIndex + 1} of {flashcards.length}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCurrentDone }}
              style={[styles.flashcardDoneBtn, isCurrentDone && styles.flashcardDoneBtnActive]}
              onPress={() => toggleDone(currentIndex)}
              activeOpacity={0.7}
            >
              <CheckCircle2 size={13} color={isCurrentDone ? "#16A34A" : "#94A3B8"} />
              <Text style={[styles.flashcardDoneBtnText, isCurrentDone && { color: "#16A34A" }]}>
                {isCurrentDone ? "Mastered" : "Mark Mastered"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepProgressRow}>
            {flashcards.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.stepDash,
                  idx === currentIndex ? styles.stepDashActive : styles.stepDashInactive,
                  completed.has(idx) && styles.stepDashCompleted,
                ]}
              />
            ))}
          </View>

          {/* Flashcard Component */}
          {currentCard && <Flashcard key={currentIndex} card={currentCard} />}

          {/* Previous / Next Controls (Quiz Screenshot 5 Style) */}
          <View style={styles.deckNavRow}>
            <TouchableOpacity
              style={[styles.deckNavBtnPrev, currentIndex === 0 && styles.deckNavBtnDisabled]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
              activeOpacity={0.8}
            >
              <ChevronLeft size={18} color={currentIndex === 0 ? "#CBD5E1" : "#475569"} />
              <Text style={[styles.deckNavBtnTextPrev, currentIndex === 0 && { color: "#CBD5E1" }]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deckNavBtnNext,
                isLastCard && styles.deckNavBtnNextLast,
                isLastCard && isCurrentDone && styles.deckNavBtnDisabled,
              ]}
              onPress={handlePrimaryAction}
              disabled={isLastCard && isCurrentDone}
              activeOpacity={0.85}
            >
              <Text style={styles.deckNavBtnTextNext}>
                {isLastCard ? (isCurrentDone ? "Reviewed" : "Mark mastered") : "Next card"}
              </Text>
              {isLastCard ? (
                <CheckCircle2 size={18} color="#ffffff" />
              ) : (
                <ChevronRight size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* All cards stacked vertically */
        <View style={styles.allCardsList}>
          {flashcards.map((card, i) => (
            <View key={i} style={styles.flashcardListItem}>
              {/* Card number + done toggle */}
              <View style={styles.flashcardListMeta}>
                <Text style={styles.flashcardListNum}>#{i + 1}</Text>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: completed.has(i) }}
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
                    {completed.has(i) ? "Mastered" : "Mark mastered"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Flashcard card={card} stacked={false} />
            </View>
          ))}
        </View>
      )}
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

const EMOJI_PATTERN =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu;

const removeEmojis = (value: string) => value.replace(EMOJI_PATTERN, "").trim();

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
        trimmed.includes("Identified Learning Gap");
      const isFromNotes = trimmed.includes("From Your Handwritten Notes");

      return {
        id: idx,
        heading: removeEmojis(firstLine.replace(/^[#\s]+/, "")),
        body: removeEmojis(trimmed),
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
      <View style={styles.snPageWrap}>
        <View style={styles.snReadingGuide}>
          <View style={styles.snGuideItem}>
            <PencilLine size={15} color="#287A58" />
            <Text style={[styles.snGuideText, { color: "#287A58" }]}>From your notes</Text>
          </View>
          <View style={styles.snGuideItem}>
            <Target size={15} color="#B76E18" />
            <Text style={[styles.snGuideText, { color: "#9A5B13" }]}>Learning gap</Text>
          </View>
          <View style={styles.snGuideItem}>
            <Lightbulb size={15} color="#38598A" />
            <Text style={[styles.snGuideText, { color: "#38598A" }]}>Theory</Text>
          </View>
        </View>

        <View style={styles.snPaper}>
          <View style={styles.snPaperMargin} />

          {(targetConcept || targetGapId) && (
            <View style={styles.gapJumpBanner}>
              <Target size={19} color="#A95E12" />
              <View style={{ flex: 1 }}>
                <Text style={styles.gapJumpTitle}>Focused learning gap</Text>
                <Text style={styles.gapJumpSub}>{targetConcept || targetGapId}</Text>
              </View>
            </View>
          )}

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
                  styles.snSection,
                  idx > 0 && styles.snSectionDivider,
                  sec.isRemediatedGap && styles.snSectionGap,
                  isTargeted && styles.snSectionTargeted,
                ]}
              >
                {(sec.isFromNotes || sec.isRemediatedGap || isTargeted) && (
                  <View style={styles.snSectionMeta}>
                    {sec.isFromNotes && (
                      <View style={styles.snMetaItem}>
                        <PencilLine size={13} color="#287A58" />
                        <Text style={[styles.snMetaText, { color: "#287A58" }]}>From your notes</Text>
                      </View>
                    )}
                    {sec.isRemediatedGap && (
                      <View style={styles.snMetaItem}>
                        <Target size={13} color="#A95E12" />
                        <Text style={[styles.snMetaText, { color: "#A95E12" }]}>Gap explained</Text>
                      </View>
                    )}
                    {isTargeted && (
                      <View style={styles.snMetaItem}>
                        <Sparkles size={13} color="#38598A" />
                        <Text style={[styles.snMetaText, { color: "#38598A" }]}>Your focus</Text>
                      </View>
                    )}
                  </View>
                )}
                <Markdown style={structuredMarkdownStyles}>{sec.body}</Markdown>
              </View>
            );
          })}

          <View style={styles.snPageEnd}>
            <BookOpen size={17} color="#8B765D" />
            <View style={styles.snPageEndRule} />
          </View>
        </View>
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
      <View style={styles.backButtonRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={26} color={colors.primaryBlack} />
        </TouchableOpacity>
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

const structuredMarkdownStyles = {
  body: {
    color: "#322E28",
    fontFamily: "serif",
    fontSize: 16,
    lineHeight: 27,
  },
  heading1: {
    color: "#223A55",
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 33,
    marginBottom: 14,
  },
  heading2: {
    color: "#294765",
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "700" as const,
    lineHeight: 28,
    marginBottom: 10,
  },
  heading3: {
    color: "#76552C",
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700" as const,
    lineHeight: 25,
    marginBottom: 8,
  },
  paragraph: { marginBottom: 12 },
  strong: { color: "#27231E", fontWeight: "700" as const },
  em: { color: "#5F4B32", fontStyle: "italic" as const },
  bullet_list: { marginBottom: 12 },
  ordered_list: { marginBottom: 12 },
  list_item: { marginBottom: 7, paddingLeft: 3 },
  blockquote: {
    backgroundColor: "#F1ECE2",
    borderLeftColor: "#8BA2B8",
    borderLeftWidth: 3,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  code_inline: {
    backgroundColor: "#ECE6DA",
    color: "#7A3D2B",
    fontFamily: "monospace",
    fontSize: 14,
    paddingHorizontal: 4,
  },
  hr: { backgroundColor: "#D8CDBB", height: 1, marginVertical: 18 },
  table: { borderColor: "#CFC3AF", borderWidth: 1, marginVertical: 12 },
  tr: { borderBottomColor: "#D9CEBC", borderBottomWidth: 1 },
  th: { backgroundColor: "#EAE2D4", padding: 8 },
  td: { padding: 8 },
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

  backButtonRow: {
    height: 52,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },

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

  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: `${colors.primary}10`,
    borderColor: `${colors.primary}35`,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  completionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  completionTitle: { fontSize: 14, fontWeight: "800", color: colors.primaryBlack, marginBottom: 2 },
  completionText: { fontSize: 12.5, fontWeight: "500", color: "#64748B" },

  flashcardScene: {
    width: "100%",
    height: 286,
    alignItems: "center",
    position: "relative",
  },
  flashcardStackBack: {
    position: "absolute",
    top: 18,
    width: "88%",
    height: 260,
    borderRadius: 26,
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  flashcardStackMiddle: {
    position: "absolute",
    top: 9,
    width: "94%",
    height: 265,
    borderRadius: 26,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  flashcardWrapper: {
    width: "100%",
    height: 268,
    position: "relative",
    zIndex: 3,
  },
  flashcard: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFCFA",
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 58,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
  },
  flashcardAnswerSide: {
    backgroundColor: "#F7FCF9",
    borderColor: "#BDE4D1",
    shadowColor: "#276B50",
  },
  flashcardTopRow: {
    position: "absolute",
    top: 20,
    left: 21,
    right: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flashcardQuestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  flashcardAnswerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DDF4E8",
    justifyContent: "center",
    alignItems: "center",
  },
  flashcardBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1.1,
  },
  flashcardAnswerBadge: { color: "#15845B" },
  flashcardText: {
    width: "100%",
    fontSize: 19,
    fontWeight: "700",
    color: "#252032",
    textAlign: "center",
    lineHeight: 29,
  },
  flashcardHintRow: {
    position: "absolute",
    bottom: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}12`,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  flashcardHint: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A512B",
  },
  flashcardAnswerHint: { color: "#3D7A62" },

  // ── Flashcard interactive deck & list ─────────────────────────────────────────
  flashcardListContainer: { gap: 16 },
  flashcardModePills: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#ECEEF3",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  flashcardModeBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 13,
  },
  flashcardModeBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 5,
    elevation: 2,
  },
  flashcardModeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B8495",
  },
  flashcardModeBtnTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  flashcardProgressPanel: {
    backgroundColor: `${colors.primary}08`,
    borderColor: `${colors.primary}25`,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 11,
  },
  flashcardProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flashcardProgressEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A05A34",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  flashcardProgressTitle: { fontSize: 14, fontWeight: "800", color: colors.primaryBlack },
  flashcardPercentBadge: {
    minWidth: 48,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
  },
  flashcardPercentText: { fontSize: 13, fontWeight: "800", color: colors.primary },
  flashcardMasteryTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: `${colors.primary}18`,
    overflow: "hidden",
  },
  flashcardMasteryFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },

  stepProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  stepDash: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  stepDashActive: {
    backgroundColor: colors.primary,
  },
  stepDashInactive: {
    backgroundColor: "#E2E8F0",
  },
  stepDashCompleted: {
    backgroundColor: "#16A34A",
  },

  deckContainer: {
    gap: 14,
    alignItems: "center",
  },
  deckCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 2,
  },
  deckCounterLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  deckCounterText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryBlack,
  },
  deckNavRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  deckNavBtnPrev: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECEEF3",
    paddingVertical: 14,
    borderRadius: 15,
  },
  deckNavBtnDisabled: {
    opacity: 0.5,
  },
  deckNavBtnTextPrev: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  deckNavBtnNext: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deckNavBtnNextLast: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
  },
  deckNavBtnTextNext: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  allCardsList: {
    gap: 20,
  },
  flashcardListItem: { gap: 9 },
  flashcardListMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  flashcardListNum: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  flashcardDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: "#ECEEF3",
    borderWidth: 1,
    borderColor: "transparent",
  },
  flashcardDoneBtnActive: { backgroundColor: "#E3F5EB", borderColor: "#BDE4D0" },
  flashcardDoneBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#687184",
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

  snPageWrap: {
    backgroundColor: "#ECE7DE",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 28,
  },
  snReadingGuide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  snGuideItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  snGuideText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.15 },
  snPaper: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFCF5",
    borderColor: "#D8CEBE",
    borderWidth: 1,
    borderRadius: 5,
    shadowColor: "#4A3B2A",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 4,
  },
  snPaperMargin: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 25,
    width: 1,
    backgroundColor: "#E7B6AC",
    zIndex: 1,
  },
  gapJumpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#FFF5D9",
    borderLeftColor: "#C77B25",
    borderLeftWidth: 3,
    marginLeft: 35,
    marginRight: 18,
    marginTop: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  gapJumpTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A4A0D",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gapJumpSub: {
    fontFamily: "serif",
    fontSize: 14,
    color: "#5D4227",
    lineHeight: 19,
  },
  snSection: {
    paddingLeft: 38,
    paddingRight: 20,
    paddingVertical: 22,
  },
  snSectionDivider: {
    borderTopColor: "#DDD3C3",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  snSectionGap: {
    backgroundColor: "#FFFAEC",
    borderLeftColor: "#D5933B",
    borderLeftWidth: 3,
  },
  snSectionTargeted: {
    backgroundColor: "#F2F7F8",
    borderLeftColor: "#557B91",
    borderLeftWidth: 3,
  },
  snSectionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 10,
  },
  snMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  snMetaText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  snPageEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingLeft: 38,
    paddingRight: 20,
    paddingBottom: 22,
  },
  snPageEndRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#CFC3B0",
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
