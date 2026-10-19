import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  Info,
  Target,
  Sparkles,
  BookOpen,
  PencilLine,
} from "lucide-react-native";

import {
  notesAssetsClient,
} from "@/api/notesClients";
import { materialsApi } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
import Markdown, { MarkdownIt } from "react-native-markdown-display";
import StudyVisual, { StudyVisualData } from "@/components/notes/StudyVisual";
import StudyFlashcards from "@/components/notes/StudyFlashcards";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useNotesAsset } from "@/hooks/use-notes-asset";
import { notesErrorMessage } from "@/utils/noteErrors";
import { useNotesMaterials } from "@/hooks/use-notes-materials";
import { parseStudyGuide, studyHeadingKey, NOTE_MARKDOWN_OPTIONS } from "@/utils/noteStudyGuide";

const { width: SCREEN_W } = Dimensions.get("window");
const studyMarkdown = MarkdownIt(NOTE_MARKDOWN_OPTIONS);

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
  const { uri, error, retry } = useNotesAsset(isScript ? undefined : audioUrl);

  const player = useAudioPlayer(uri ? { uri } : undefined);
  const status = useAudioPlayerStatus(player);
  const [playbackError, setPlaybackError] = useState(false);

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
    try {
      setPlaybackError(false);
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    } catch { setPlaybackError(true); }
  };

  if (isScript) {
    return (
      <View style={styles.transcriptCard}>
        <View style={styles.infoRow}>
          <Info size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Audio isn’t available for this lesson yet. You can read the lesson below.
          </Text>
        </View>
        <Text style={styles.transcriptLabel}>LESSON TRANSCRIPT</Text>
        <Text style={styles.transcriptText}>
          {fallbackScript ?? "Loading script…"}
        </Text>
      </View>
    );
  }

  if (!uri) return <View style={styles.playerCard}>
    {error ? <><Text style={styles.infoText}>Could not load your audio lesson.</Text><TouchableOpacity accessibilityRole="button" onPress={retry} style={{ padding: 14 }}><Text style={{ color: "#9A3412" }}>Try again</Text></TouchableOpacity></> : <><ActivityIndicator color={colors.primary} /><Text style={styles.infoText}>Loading your audio lesson…</Text></>}
  </View>;

  return (
    <View style={styles.playerCard}>
      {playbackError && <Text accessibilityRole="alert" style={styles.infoText}>{"We couldn't play this audio. Please try again, or return to Notes."}</Text>}
      {/* Play/Pause button */}
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause audio lesson" : "Play audio lesson"}>
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

const StructuredNotesViewer = ({
  textContent,
  visuals = [],
  targetGapId,
  targetConcept,
}: {
  textContent: string;
  visuals?: StudyVisualData[];
  targetGapId?: string;
  targetConcept?: string;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [sectionLayouts, setSectionLayouts] = useState<Record<number, number>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const sections = React.useMemo(() => parseStudyGuide(textContent), [textContent]);

  // Determine which section to jump to if target params exist
  const targetSectionIndex = React.useMemo(() => {
    if (!targetGapId && !targetConcept) return -1;
    const lowerConcept = (targetConcept || "").toLowerCase();
    const lowerGapId = (targetGapId || "").toLowerCase();

    let matchIdx = lowerGapId ? sections.findIndex(s => s.rawBody.toLowerCase().includes(lowerGapId)) : -1;
    if (matchIdx < 0 && lowerConcept) matchIdx = sections.findIndex(s => !s.isAnswer && s.heading.toLowerCase().includes(lowerConcept));
    if (matchIdx < 0 && lowerConcept) matchIdx = sections.findIndex(s => !s.isAnswer && s.body.toLowerCase().includes(lowerConcept));

    // 2. Fallback to first remediated gap section
    if (matchIdx === -1) {
      matchIdx = sections.findIndex((s) => s.isRemediatedGap);
    }

    return matchIdx;
  }, [sections, targetGapId, targetConcept]);

  const targetY = sectionLayouts[targetSectionIndex];
  useEffect(() => {
    if (targetSectionIndex < 0 || targetY === undefined) return;
    setHighlightedIndex(targetSectionIndex);
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, targetY - 16), animated: true }), 350);
    return () => clearTimeout(timer);
  }, [targetSectionIndex, targetY]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <View style={styles.snPageWrap}>
        <View style={styles.snReadingGuide}>
          <BookOpen size={16} color={colors.primary} />
          <Text style={styles.snGuideText}>Read the ideas · explore the diagrams · check your recall</Text>
        </View>

        <View style={styles.snPaper}>
          <View style={styles.snPaperMargin} />

          {(targetConcept || targetGapId) && (
            <View style={styles.gapJumpBanner}>
              <Target size={19} color="#A95E12" />
              <View style={{ flex: 1 }}>
                <Text style={styles.gapJumpTitle}>Your study focus</Text>
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
                  setSectionLayouts(prev => prev[idx] === y ? prev : { ...prev, [idx]: y });
                }}
                style={[
                  styles.snSection,
                  idx > 0 && styles.snSectionDivider,
                  (sec.isRemediatedGap || sec.noteCoverage === "partial" || sec.noteCoverage === "missing") && styles.snSectionGap,
                  isTargeted && styles.snSectionTargeted,
                ]}
              >
                {(sec.isFromNotes || sec.isRemediatedGap || isTargeted || sec.noteCoverage) && (
                  <View style={styles.snSectionMeta}>
                    {sec.noteCoverage && <View style={styles.snMetaItem}>
                      <Target size={13} color={sec.noteCoverage === "present" ? "#287A58" : "#A95E12"} />
                      <Text style={[styles.snMetaText, { color: sec.noteCoverage === "present" ? "#287A58" : "#A95E12" }]}>
                        {{ present: "Covered in your upload", partial: "Partial in your upload · build on this", missing: "Missing from your upload · study this section", unchecked: "Not checked in your upload" }[sec.noteCoverage]}
                      </Text>
                    </View>}
                    {sec.isFromNotes && (
                      <View style={styles.snMetaItem}>
                        <PencilLine size={13} color="#287A58" />
                        <Text style={[styles.snMetaText, { color: "#287A58" }]}>From your notes</Text>
                      </View>
                    )}
                    {sec.isRemediatedGap && (
                      <View style={styles.snMetaItem}>
                        <Target size={13} color="#A95E12" />
                        <Text style={[styles.snMetaText, { color: "#A95E12" }]}>Extra support</Text>
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
                {sec.isAnswer && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: revealedAnswers.has(sec.id) }} onPress={() => setRevealedAnswers(previous => { const next = new Set(previous); if (next.has(sec.id)) next.delete(sec.id); else next.add(sec.id); return next; })} style={{ paddingVertical: 14 }}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>{revealedAnswers.has(sec.id) ? "Hide answers" : "Show self-check answers"}</Text>
                </TouchableOpacity>}
                {(!sec.isAnswer || revealedAnswers.has(sec.id)) && <>
                  <Markdown markdownit={studyMarkdown} style={structuredMarkdownStyles}>{sec.body}</Markdown>
                  {visuals.filter(visual => studyHeadingKey(visual.afterHeading) === studyHeadingKey(sec.heading) && sections.findIndex(section => studyHeadingKey(section.heading) === studyHeadingKey(visual.afterHeading)) === idx).map((visual, visualIndex) => (
                    <StudyVisual key={visualIndex} visual={visual} />
                  ))}
                </>}
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
  return <NoteMaterialScreen key={`${id}/${type}`} id={id} type={type} targetGapId={targetGapId} targetConcept={targetConcept} />;
}

function NoteMaterialScreen({ id, type, targetGapId, targetConcept }: {
  id: string; type: string; targetGapId?: string; targetConcept?: string;
}) {
  const router = useRouter();

  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [fallbackScript, setFallbackScript] = useState<string | null>(null);
  const canUpdate = type === "structured_notes" || type === "flashcards";
  const updates = useNotesMaterials(id, canUpdate);
  const updateStatus = updates.overview?.states.find(item => item.type === type)?.status;
  const isUpdating = !!updates.requestingType || updateStatus === "queued" || updateStatus === "generating";
  const wasUpdating = useRef(false);
  useEffect(() => {
    if (wasUpdating.current && updateStatus === "ready" && !updates.requestingType && updates.state === "idle") {
      wasUpdating.current = false;
      setReloadKey(value => value + 1);
    }
    if (updateStatus === "queued" || updateStatus === "generating") wasUpdating.current = true;
    if (updateStatus === "failed") wasUpdating.current = false;
  }, [id, type, updateStatus, updates.overview, updates.requestingType, updates.state]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const fetchMaterial = async () => {
      try {
        const response = await materialsApi.getMaterialByType(id, type, controller.signal);
        if (!response.success) throw new Error("Material unavailable");
        if (controller.signal.aborted) return;
        setMaterial(response.data);
        const audioUrl: string = response.data?.audioUrl ?? "";
        if (type === "audio" && audioUrl.endsWith(".txt")) {
          const scriptRes = await notesAssetsClient.get(audioUrl, { signal: controller.signal });
          if (typeof scriptRes.data !== "string") throw new Error("Transcript unavailable");
          if (!controller.signal.aborted) setFallbackScript(scriptRes.data);
        }
      } catch (error) {
        if (!controller.signal.aborted) { setLoadError(notesErrorMessage(error)); setFallbackScript("We couldn't load the lesson transcript. Please retry loading content."); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchMaterial();
    return () => controller.abort();
  }, [id, type, reloadKey]);

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
    if (loading && !material) {
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
          <Text accessibilityRole="alert" style={styles.errorText}>{loadError || "We couldn't load this study material. Please try again in a moment."}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey(value => value + 1)} style={{ padding: 16 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Try again</Text></TouchableOpacity>
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
          <StudyFlashcards key={material._id + (material.generatedAt ?? "")} flashcards={material.flashcards} />
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
          visuals={material.visuals}
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
            <Markdown markdownit={studyMarkdown} style={markdownStyles}>{material.textContent}</Markdown>
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
          onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/notes/[id]", params: { id } })}
          style={styles.backButton}
        >
          <ChevronLeft size={26} color={colors.primaryBlack} />
        </TouchableOpacity>
        {canUpdate && material && <TouchableOpacity accessibilityRole="button" disabled={isUpdating || !updates.overview} onPress={() => { wasUpdating.current = true; void updates.generate(type); }} style={{ padding: 10, marginLeft: "auto", opacity: isUpdating || !updates.overview ? 0.5 : 1 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{isUpdating ? "Creating update…" : "Update version"}</Text>
        </TouchableOpacity>}
      </View>
      {canUpdate && (isUpdating || updates.requestError || updateStatus === "failed" || updates.state === "error" || updates.state === "paused") && <View style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#FFF7ED" }}>
        <Text style={{ color: "#9A3412", fontSize: 12, lineHeight: 18 }}>{updates.requestError || (updateStatus === "failed" ? "The update couldn't finish. Your saved version is still available; tap Update version to retry." : updates.state === "error" || updates.state === "paused" ? "Progress checks paused. You can check again below." : "Creating your updated material. You can keep reading or return to Notes.")}</Text>
        {(updates.state === "error" || updates.state === "paused") && <TouchableOpacity accessibilityRole="button" onPress={updates.refresh} style={{ paddingVertical: 10 }}><Text style={{ color: "#9A3412", fontWeight: "700", fontSize: 12 }}>Check progress</Text></TouchableOpacity>}
      </View>}

      {material && loadError && <View style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#FFF7ED" }}>
        <Text style={{ color: "#9A3412", fontSize: 12 }}>Could not load the updated content. Your saved version is still available.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey(value => value + 1)} style={{ paddingVertical: 10 }}><Text style={{ color: "#9A3412", fontWeight: "700" }}>Retry loading content</Text></TouchableOpacity>
      </View>}

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
    flexDirection: "row",
    alignItems: "center",
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
  snGuideText: { fontSize: 12, fontWeight: "600", lineHeight: 18, flex: 1 },
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
