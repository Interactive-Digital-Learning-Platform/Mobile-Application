import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  activePodcastCue,
  podcastParagraphs,
  readPodcastCues,
} from "@/utils/notePodcastTranscript";

export default function PodcastTranscript({
  text,
  timings,
  position,
  started,
  recording,
}: {
  text: string;
  timings: unknown;
  position: number;
  started: boolean;
  recording: boolean;
}) {
  const cues = useMemo(() => readPodcastCues(timings, text), [timings, text]);
  const paragraphs = useMemo(() => podcastParagraphs(text), [text]);
  const [follow, setFollow] = useState(true);
  const [layouts, setLayouts] = useState<Record<number, number>>({});
  const scroll = useRef<ScrollView>(null);
  const active = started ? activePodcastCue(cues, position) : -1;
  const offset = active >= 0 ? cues[active].startOffset : -1;
  const paragraphIndex = paragraphs.findIndex(
    (part) => offset >= part.offset && offset < part.offset + part.text.length,
  );
  const y = layouts[paragraphIndex];
  useEffect(() => {
    if (follow && paragraphIndex >= 0 && y !== undefined)
      scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, [follow, paragraphIndex, y]);
  return (
    <View style={s.container}>
      {!!cues.length ? (
        <View style={s.toolbar}>
          <Text style={s.caption}>The highlighted word follows the voice.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: follow }}
            onPress={() => setFollow((value) => !value)}
            style={[s.follow, follow && s.followActive]}
          >
            <Text style={s.followText}>
              {follow ? "Following voice" : "Follow voice"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : recording ? (
        <Text style={s.caption}>
          This recording has no word timings. Use Update version to enable
          synced highlighting.
        </Text>
      ) : null}
      <ScrollView
        ref={scroll}
        nestedScrollEnabled
        style={s.scroll}
        contentContainerStyle={s.content}
        onScrollBeginDrag={() => setFollow(false)}
      >
        {paragraphs.map((part, index) => {
          let last = 0;
          const words: React.ReactNode[] = [];
          for (const match of part.text.matchAll(/\S+/gu)) {
            if (match.index > last)
              words.push(part.text.slice(last, match.index));
            const start = part.offset + match.index;
            words.push(
              <Text
                key={start}
                style={start === offset ? s.highlight : undefined}
              >
                {match[0]}
              </Text>,
            );
            last = match.index + match[0].length;
          }
          if (last < part.text.length) words.push(part.text.slice(last));
          return (
            <Text
              key={index}
              selectable
              style={s.paragraph}
              onLayout={(event) => {
                const top = event.nativeEvent.layout.y;
                setLayouts((previous) =>
                  previous[index] === top
                    ? previous
                    : { ...previous, [index]: top },
                );
              }}
            >
              {words}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  caption: { fontSize: 12, lineHeight: 19, color: "#64748B", flexShrink: 1 },
  follow: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  followActive: { backgroundColor: "#FFEDD5" },
  followText: { color: "#9A3412", fontSize: 12, fontWeight: "600" },
  scroll: { maxHeight: 320 },
  content: { gap: 16, paddingBottom: 12, paddingTop: 4 },
  paragraph: { color: "#334155", fontSize: 15, lineHeight: 28 },
  highlight: {
    backgroundColor: "#FDBA74",
    color: "#7C2D12",
  },
});
