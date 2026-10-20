import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/ui/AppText";
import { useIsFocused } from "@react-navigation/native";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react-native";
import { useNotesAsset } from "@/hooks/use-notes-asset";
import { podcastTime, useNotesPlayback } from "@/hooks/use-notes-playback";
import { useNotesTranscript } from "@/hooks/use-notes-transcript";
import { colors } from "@/constants/colors";
import PodcastArtwork from "./PodcastArtwork";
import PodcastTranscript from "./PodcastTranscript";

function Recording({
  uri,
  retry,
  onPlayingChange,
  onPositionChange,
}: {
  uri: string;
  retry: () => void;
  onPlayingChange: (playing: boolean) => void;
  onPositionChange: (state: { position: number; started: boolean }) => void;
}) {
  const focused = useIsFocused();
  const audio = useNotesPlayback(uri, focused);
  const [trackWidth, setTrackWidth] = useState(0);
  const playing = audio.playing && !audio.waiting && !audio.error && focused;
  useEffect(() => {
    onPlayingChange(playing);
    return () => onPlayingChange(false);
  }, [playing, onPlayingChange]);
  const started =
    (audio.hasPlayed || audio.position > 0) && audio.ready && !audio.error;
  useEffect(() => {
    onPositionChange({ position: audio.position, started });
  }, [audio.position, started, onPositionChange]);
  useEffect(
    () => () => onPositionChange({ position: 0, started: false }),
    [onPositionChange],
  );
  const actionLabel = audio.playing
    ? "Pause"
    : audio.ended
      ? "Replay"
      : audio.hasPlayed || audio.position > 0
        ? "Resume"
        : "Play";
  return (
    <View style={s.player}>
      <Text style={s.status}>
        {audio.error
          ? "Playback needs a retry"
          : audio.waiting
            ? "Getting your audio ready…"
            : audio.ended
              ? "Recap complete · listen again anytime"
              : audio.playing
                ? "Now playing"
                : audio.hasPlayed
                  ? "Paused · resume when you’re ready"
                  : "Ready when you are"}
      </Text>
      {audio.error ? (
        <View style={s.feedback}>
          <Text accessibilityRole="alert" style={s.feedbackText}>
            We couldn’t play this recording. Try loading it again. You can still
            read an available transcript below.
          </Text>
          <Pressable accessibilityRole="button" onPress={retry} style={s.retry}>
            <RotateCcw size={16} color="#9A3412" />
            <Text style={s.retryText}>Reload audio</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={s.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back 15 seconds"
              disabled={!audio.ready || audio.busy || audio.waiting}
              onPress={() => {
                void audio.seek(audio.position - 15);
              }}
              style={[
                s.skip,
                (!audio.ready || audio.busy || audio.waiting) && s.disabled,
              ]}
            >
              <RotateCcw size={26} color="#334155" />
              <Text style={s.skipText}>15 sec</Text>
            </Pressable>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${actionLabel} podcast`}
              disabled={audio.busy || (!audio.playing && audio.waiting)}
              onPress={() => {
                void audio.toggle();
              }}
              activeOpacity={0.8}
              style={[
                s.play,
                (audio.busy || (!audio.playing && audio.waiting)) && s.disabled,
              ]}
            >
              {audio.busy || (!audio.playing && audio.waiting) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : audio.playing ? (
                <Pause size={32} color="#FFFFFF" fill="#FFFFFF" />
              ) : audio.ended ? (
                <RotateCcw size={32} color="#FFFFFF" />
              ) : (
                <Play
                  size={33}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  style={{ marginLeft: 4 }}
                />
              )}
              <Text style={s.playLabel}>
                {audio.busy
                  ? "Please wait"
                  : !audio.playing && audio.waiting
                    ? "Loading…"
                    : actionLabel}
              </Text>
            </TouchableOpacity>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go forward 15 seconds"
              disabled={!audio.ready || audio.busy || audio.waiting}
              onPress={() => {
                void audio.seek(audio.position + 15);
              }}
              style={[
                s.skip,
                (!audio.ready || audio.busy || audio.waiting) && s.disabled,
              ]}
            >
              <RotateCw size={26} color="#334155" />
              <Text style={s.skipText}>15 sec</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Podcast playback position"
            accessibilityHint="Tap to jump to a point in the recording"
            accessibilityValue={{
              min: 0,
              max: Math.round(audio.duration),
              now: Math.floor(audio.position),
              text: `${podcastTime(audio.position)} of ${podcastTime(audio.duration)}`,
            }}
            accessibilityActions={[
              { name: "increment", label: "Forward 15 seconds" },
              { name: "decrement", label: "Back 15 seconds" },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "increment")
                void audio.seek(audio.position + 15);
              if (event.nativeEvent.actionName === "decrement")
                void audio.seek(audio.position - 15);
            }}
            disabled={!audio.ready || audio.busy || audio.waiting}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            onPress={(event) => {
              if (trackWidth)
                void audio.seek(
                  (event.nativeEvent.locationX / trackWidth) * audio.duration,
                );
            }}
            style={s.seekArea}
          >
            <View pointerEvents="none" style={s.track}>
              <View style={[s.fill, { width: `${audio.progress * 100}%` }]} />
            </View>
            <View
              pointerEvents="none"
              style={[s.thumb, { left: `${audio.progress * 100}%` }]}
            />
          </Pressable>
          <View style={s.timeRow}>
            <Text style={s.time}>{podcastTime(audio.position)}</Text>
            <Text style={s.time}>
              {audio.ready
                ? `−${podcastTime(audio.duration - audio.position)} left`
                : "Loading duration"}
            </Text>
          </View>
          <Text style={s.seekHint}>Tap the timeline to jump to a part</Text>
          <View style={s.speedRow}>
            <Text style={s.speedLabel}>Listen at your pace</Text>
            <View style={s.speedOptions}>
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <Pressable
                  key={rate}
                  accessibilityRole="button"
                  accessibilityLabel={`${rate} times playback speed`}
                  accessibilityState={{
                    selected: Math.abs(audio.rate - rate) < 0.01,
                    disabled: !audio.ready || audio.busy,
                  }}
                  disabled={!audio.ready || audio.busy}
                  onPress={() => {
                    void audio.changeRate(rate);
                  }}
                  style={[
                    s.speed,
                    Math.abs(audio.rate - rate) < 0.01 && s.speedActive,
                    !audio.ready && s.disabled,
                  ]}
                >
                  <Text
                    style={[
                      s.speedText,
                      Math.abs(audio.rate - rate) < 0.01 && s.speedActiveText,
                    ]}
                  >
                    {rate}×
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default function StudyPodcast({
  audioUrl,
  textContent,
  transcriptCues,
}: {
  audioUrl: string;
  textContent?: string;
  transcriptCues?: unknown;
}) {
  const scriptOnly = /\.txt$/i.test(audioUrl);
  const { uri, error, retry } = useNotesAsset(
    scriptOnly ? undefined : audioUrl,
  );
  const [showTranscript, setShowTranscript] = useState(scriptOnly);
  const [playing, setPlaying] = useState(false);
  const [readPosition, setReadPosition] = useState({
    position: 0,
    started: false,
  });
  const {
    transcript,
    loading: transcriptLoading,
    error: transcriptError,
    retry: retryTranscript,
  } = useNotesTranscript(audioUrl, textContent);
  const paragraphs = useMemo(
    () =>
      (transcript || "")
        .trim()
        .split(/\n\s*\n/)
        .filter(Boolean),
    [transcript],
  );
  return (
    <View style={s.container}>
      <View style={s.hero}>
        <View style={s.badge}>
          <Headphones size={17} color="#9A3412" />
          <Text style={s.badgeText}>Your study podcast</Text>
        </View>
        <Text accessibilityRole="header" style={s.title}>
          A little listening. A clearer lesson.
        </Text>
        <PodcastArtwork playing={playing} />
        <Text style={s.subtitle}>
          Revisit the key ideas, pause to think, and go at your own pace.
        </Text>
      </View>
      {scriptOnly ? (
        <View style={s.feedback}>
          <Text style={s.feedbackTitle}>Your reading version is ready</Text>
          <Text style={s.feedbackText}>
            A recording isn’t available for this version. You can use the lesson
            script below.
          </Text>
        </View>
      ) : uri ? (
        <Recording
          key={uri}
          uri={uri}
          retry={retry}
          onPlayingChange={setPlaying}
          onPositionChange={setReadPosition}
        />
      ) : (
        <View style={s.player}>
          {error ? (
            <>
              <Text accessibilityRole="alert" style={s.feedbackText}>
                The recording couldn’t load. Check your connection and try
                again.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={s.retry}
              >
                <RotateCcw size={16} color="#9A3412" />
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={s.feedbackText}>
                Loading your private recording…
              </Text>
            </>
          )}
        </View>
      )}
      <View style={s.transcript}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showTranscript }}
          accessibilityLabel={
            showTranscript ? "Hide lesson transcript" : "Read lesson transcript"
          }
          onPress={() => setShowTranscript((previous) => !previous)}
          style={s.transcriptHeader}
        >
          <View style={s.transcriptHeading}>
            <BookOpen size={19} color="#9A3412" />
            <Text style={s.transcriptTitle}>
              {scriptOnly ? "Lesson script" : "Read along"}
            </Text>
          </View>
          {showTranscript ? (
            <ChevronUp size={19} color="#64748B" />
          ) : (
            <ChevronDown size={19} color="#64748B" />
          )}
        </Pressable>
        {showTranscript && (
          <View style={s.transcriptBody}>
            {transcriptLoading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={s.feedbackText}>Loading the lesson script…</Text>
              </View>
            ) : transcriptError ? (
              <>
                <Text accessibilityRole="alert" style={s.feedbackText}>
                  The transcript couldn’t load. Check your connection and try
                  again.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={retryTranscript}
                  style={s.retry}
                >
                  <Text style={s.retryText}>Retry transcript</Text>
                </Pressable>
              </>
            ) : paragraphs.length ? (
              <PodcastTranscript
                text={transcript || ""}
                timings={transcriptCues}
                position={readPosition.position}
                started={readPosition.started}
                recording={!scriptOnly}
              />
            ) : (
              <Text style={s.feedbackText}>
                This older recording has no saved transcript. An updated version
                can include one.
              </Text>
            )}
          </View>
        )}
      </View>
      <View style={s.tip}>
        <Text style={s.tipTitle}>Pause, then explain it</Text>
        <Text style={s.tipText}>
          After an important idea, pause and say what it means in your own
          words. Rewind if you need another listen.
        </Text>
      </View>
      {!scriptOnly && (
        <Text style={s.footer}>
          Playback pauses when you leave this screen or put the app in the
          background.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  hero: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 15,
    alignItems: "center",
  },
  badge: { flexDirection: "row", alignItems: "center", gap: 7 },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    color: "#27364B",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#7C431D",
    textAlign: "center",
  },
  player: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  status: {
    color: "#526176",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginVertical: 8,
  },
  play: {
    width: 88,
    height: 88,
    borderRadius: 44,
    flexShrink: 0,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  skip: {
    minWidth: 48,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  skipText: { fontSize: 10, color: "#526176", fontWeight: "600" },
  disabled: { opacity: 0.4 },
  seekArea: { height: 44, justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFEDD5",
    overflow: "hidden",
  },
  fill: { height: 6, backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -12,
  },
  time: { fontSize: 12, color: "#526176", fontVariant: ["tabular-nums"] },
  seekHint: { fontSize: 11, color: "#64748B", textAlign: "center" },
  speedRow: { gap: 10, marginTop: 8, alignItems: "center" },
  speedLabel: { fontSize: 12, color: "#526176" },
  speedOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
  },
  speed: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  speedActive: { backgroundColor: "#FFEDD5" },
  speedText: { color: "#526176", fontSize: 13, fontWeight: "600" },
  speedActiveText: { color: "#9A3412" },
  feedback: {
    gap: 10,
    padding: 16,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
  },
  feedbackTitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#9A3412",
    fontWeight: "700",
  },
  feedbackText: { fontSize: 13, lineHeight: 21, color: "#526176" },
  retry: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
  },
  retryText: { color: "#9A3412", fontSize: 13, fontWeight: "600" },
  transcript: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    minHeight: 58,
  },
  transcriptHeading: { flexDirection: "row", gap: 9, alignItems: "center" },
  transcriptTitle: { fontSize: 15, fontWeight: "700", color: "#27364B" },
  transcriptBody: { paddingHorizontal: 18, paddingBottom: 18, gap: 16 },
  paragraph: { fontSize: 15, lineHeight: 26, color: "#334155" },
  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  tip: { padding: 16, backgroundColor: "#FFF7ED", borderRadius: 16, gap: 5 },
  tipTitle: { color: "#9A3412", fontSize: 13, fontWeight: "700" },
  tipText: { color: "#7C431D", fontSize: 13, lineHeight: 21 },
  footer: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
