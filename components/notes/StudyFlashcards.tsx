import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface Card { front: string; back: string; hint?: string; explanation?: string; kind?: string; sourceQuote?: string }

function RecallCard({ card, onRevealedChange }: { card: Card; onRevealedChange?: (revealed: boolean) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState(false);
  const [source, setSource] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;
  const flipping = useRef(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    rotation.stopAnimation(); rotation.setValue(0); flipping.current = false;
    setRevealed(false); setHint(false); setSource(false);
    return () => rotation.stopAnimation();
  }, [card, rotation]);
  const flip = () => {
    if (flipping.current) return;
    const next = !revealed;
    const showSide = () => { setRevealed(next); onRevealedChange?.(next); };
    if (reducedMotion) { showSide(); return; }
    flipping.current = true;
    // Change the visible side at the edge so neither face is mirrored.
    Animated.timing(rotation, { toValue: 1, duration: 140, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      rotation.setValue(-1); showSide();
      Animated.timing(rotation, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => { flipping.current = false; });
    });
  };
  return (
    <Animated.View style={[s.card, revealed && s.answerCard, { transform: [{ perspective: 1000 }, { rotateY: rotation.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-90deg", "0deg", "90deg"] }) }] }]}>
      <Pressable accessibilityRole="button" accessibilityHint={revealed ? "Flip back to the question" : "Flip to reveal the answer"} onPress={flip} style={s.flipSurface}>
        <Text style={s.eyebrow}>{revealed ? "Answer" : ({ recall: "Recall", explain: "Explain why", apply: "Apply it", compare: "Compare" } as Record<string, string>)[card.kind ?? ""] ?? "Recall"}</Text>
        <ScrollView style={s.cardContent} nestedScrollEnabled>
          {revealed ? <><Text style={s.answerText}>{card.back}</Text>{card.explanation && <Text style={s.detail}>{card.explanation}</Text>}{source && <Text style={s.detail}>{card.sourceQuote}</Text>}</> : <><Text style={s.question}>{card.front}</Text>{hint && <Text style={s.detail}>{card.hint}</Text>}</>}
        </ScrollView>
        <View style={s.flipCue}><RotateCcw size={15} color="#9A3412" /><Text style={s.flipLabel}>{revealed ? "Tap to see question" : "Tap card to see answer"}</Text></View>
      </Pressable>
      {!revealed && card.hint && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: hint }} onPress={() => setHint(!hint)} style={s.hintButton}><Lightbulb size={16} color="#9A5B13" /><Text style={s.hintLabel}>{hint ? "Hide hint" : "Need a hint?"}</Text></TouchableOpacity>}
      {revealed && card.sourceQuote && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: source }} style={s.linkButton} onPress={() => setSource(!source)}><Text style={s.link}>{source ? "Hide source excerpt" : "Check source excerpt"}</Text></TouchableOpacity>}
    </Animated.View>
  );
}

export default function StudyFlashcards({ flashcards }: { flashcards: Card[] }) {
  const [order, setOrder] = useState(() => flashcards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [remembered, setRemembered] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [round, setRound] = useState(0);
  const index = order[position];
  const remaining = flashcards.map((_, i) => i).filter(i => !remembered.has(i));
  const rate = (knew: boolean) => {
    if (!revealed) return;
    setRemembered(previous => { const next = new Set(previous); if (knew) next.add(index); else next.delete(index); return next; });
    setRevealed(false);
    if (position + 1 < order.length) setPosition(position + 1); else setFinished(true);
  };
  const start = (indices: number[], reset = false) => {
    setOrder(indices); setPosition(0); setFinished(false); setRevealed(false); setRound(round + 1);
    if (reset) setRemembered(new Set());
  };
  if (!flashcards.length) return <Text>No flashcards available yet.</Text>;
  return (
    <View style={s.container}>
      <Text style={s.title}>A little practice, a stronger memory</Text>
      <Text style={s.detail}>Try answering out loud before revealing the answer. Your ratings are for this session.</Text>
      <View style={s.metaRow}><Text style={s.progress}>{remembered.size} / {flashcards.length} remembered</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setRevealed(false); setBrowse(!browse); }} style={s.linkButton}><Text style={s.link}>{browse ? "Back to practice" : "Browse cards"}</Text></TouchableOpacity></View>
      <View style={s.track}><View style={[s.fill, { width: `${remembered.size / flashcards.length * 100}%` }]} /></View>
      {browse ? flashcards.map((card, i) => <RecallCard key={i} card={card} />) : finished ? (
        <View style={s.card}>
          <Text style={s.question}>Round complete</Text>
          <Text style={s.detail}>{remaining.length ? `${remaining.length} ${remaining.length === 1 ? "card is" : "cards are"} ready for more practice. You can revisit ${remaining.length === 1 ? "it" : "them"} now.` : "You remembered every answer this session. Try again later to check what sticks."}</Text>
          {!!remaining.length && <TouchableOpacity accessibilityRole="button" style={s.primary} onPress={() => start(remaining)}><Text style={s.primaryText}>Practise {remaining.length} again</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" style={s.linkButton} onPress={() => start(flashcards.map((_, i) => i), true)}><Text style={s.link}>Restart the full deck</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={s.counter}>Card {position + 1} of {order.length}{round > 0 ? " · practice round" : ""}</Text>
          <RecallCard key={`${round}-${position}`} card={flashcards[index]} onRevealedChange={setRevealed} />
          {revealed && <View style={s.ratingRow}>
            <TouchableOpacity accessibilityRole="button" style={s.again} onPress={() => rate(false)}><RotateCcw size={16} color="#9A3412" /><Text style={s.againText}>Practise again</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.remembered} onPress={() => rate(true)}><Text style={s.rememberedText}>I remembered</Text></TouchableOpacity>
          </View>}
          {!revealed && <Text style={s.instruction}>Reveal the answer to rate your recall.</Text>}
          <View style={s.metaRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous card" disabled={position === 0} style={[s.linkButton, position === 0 && { opacity: 0.35 }]} onPress={() => { setPosition(position - 1); setRevealed(false); }}><ChevronLeft size={18} color="#526176" /><Text style={s.link}>Previous</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.linkButton} onPress={() => { setRevealed(false); if (position + 1 < order.length) setPosition(position + 1); else setFinished(true); }}><Text style={s.link}>{position + 1 < order.length ? "Skip for now" : "Finish round"}</Text><ChevronRight size={18} color="#526176" /></TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 }, title: { fontSize: 21, fontWeight: "700", color: "#27364B" },
  detail: { fontSize: 14, color: "#526176", lineHeight: 22, marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  progress: { color: "#27364B", fontWeight: "600", fontSize: 13 },
  track: { backgroundColor: "#FFEDD5", height: 6, borderRadius: 3, overflow: "hidden" }, fill: { height: 6, backgroundColor: colors.primary },
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 22, borderWidth: 1, borderColor: "#FED7AA", gap: 16 },
  eyebrow: { color: "#9A3412", textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" },
  question: { fontSize: 21, fontWeight: "700", color: "#27364B", lineHeight: 30, marginVertical: 12 },
  answerCard: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }, answerText: { color: "#185C41", fontSize: 17, lineHeight: 27, marginTop: 8 },
  flipSurface: { minHeight: 220, gap: 12 }, cardContent: { maxHeight: 360 },
  flipCue: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: 12 }, flipLabel: { color: "#9A3412", fontSize: 12, fontWeight: "600" },
  hintButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 }, hintLabel: { color: "#9A5B13", fontSize: 13 },
  primary: { padding: 15, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", marginTop: 8 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  linkButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12 }, link: { color: "#526176", fontSize: 13, fontWeight: "600" },
  counter: { color: "#6B7280", fontSize: 12, marginTop: 8 }, ratingRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  again: { flex: 1, minWidth: 130, flexDirection: "row", gap: 7, justifyContent: "center", padding: 15, borderRadius: 14, backgroundColor: "#FFEDD5" }, againText: { color: "#9A3412", fontWeight: "600" },
  remembered: { flex: 1, minWidth: 130, alignItems: "center", padding: 15, borderRadius: 14, backgroundColor: "#DCFCE7" }, rememberedText: { color: "#166534", fontWeight: "600" },
  instruction: { fontSize: 12, color: "#6B7280", textAlign: "center" },
});
