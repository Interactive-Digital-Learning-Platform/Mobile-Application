import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { CheckCircle2, Swords, User, X } from "lucide-react-native";
import { getSubjectIcon, ICON_COLORS } from "@/constants/quizStyles";
import { getLeagueStyle } from "@/constants/battleStyles";
import {
  battleKeys,
  useBattleProfileQuery,
  useCancelQueueMutation,
  useJoinQueueMutation,
  useQueueStatusQuery,
} from "@/hooks/use-battle";
import { useBattleMatch } from "@/hooks/use-battle-match";

export default function BattleQueueScreen() {
  const router = useRouter();
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const SubjectIcon = getSubjectIcon(subject);
  const queryClient = useQueryClient();

  const { mutate: joinQueue } = useJoinQueueMutation();
  const { mutate: cancelQueue, isPending: isCancelling } = useCancelQueueMutation();
  const joinTriggeredRef = useRef(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // Tracks whether we still hold an active queue slot that needs cancelling
  // if this screen unmounts without the user pressing Cancel explicitly
  // (e.g. swipe-back, hardware back, or navigating away another way).
  const holdingQueueSlotRef = useRef(false);

  useEffect(() => {
    if (!subject || joinTriggeredRef.current) return;
    joinTriggeredRef.current = true;
    // battleKeys.queueStatus is a single global cache key, not scoped per
    // subject/session -- without clearing it, a fresh mount for a NEW
    // subject would still read back whatever "matched"/old-match_id data
    // was cached from the PREVIOUS session (React Query returns cached
    // `data` immediately even while the query is disabled), and the
    // "matched" effect below would immediately navigate to that old,
    // already-completed match instead of ever searching for a new one.
    queryClient.removeQueries({ queryKey: battleKeys.queueStatus, exact: true });
    joinQueue(subject, {
      onSuccess: () => {
        holdingQueueSlotRef.current = true;
        setPollingEnabled(true);
      },
      onError: (error) => {
        // battleClient's response interceptor (api/apiClients.ts) already
        // normalizes this into the backend's actual `detail` string (e.g.
        // "You're already in an active battle." for a 409) -- show that
        // instead of a generic message, since the specific reason is what
        // actually tells you what to do next.
        Toast.show({
          type: "error",
          text1: "Couldn't join the queue",
          text2: error instanceof Error ? error.message : "Check your connection and try again.",
        });
        router.back();
      },
    });
  }, [subject, joinQueue, router, queryClient]);

  useEffect(() => {
    return () => {
      if (holdingQueueSlotRef.current) {
        holdingQueueSlotRef.current = false;
        cancelQueue();
      }
    };
  }, [cancelQueue]);

  const { data: status } = useQueueStatusQuery(pollingEnabled);
  const { data: profile } = useBattleProfileQuery();
  const mySubjectProfile = profile?.subjects.find((s) => s.subject === subject);
  const myLeagueStyle = getLeagueStyle(mySubjectProfile?.league);

  // Once matched, the match's own WS connection is opened right here (not
  // only after navigating to match-session) so the "Ready" step can happen
  // on this same screen -- matchId stays null (no connection attempted)
  // until a real match_id shows up in the queue status. The subject check
  // guards against the same stale-cache hazard the mount effect's
  // removeQueries() targets above: a "matched" response for a DIFFERENT
  // subject can only be stale leftover data from a previous session.
  const matchId =
    status?.status === "matched" && status.subject === subject ? status.match_id ?? null : null;
  const { readyUserIds, myUserId, sendReady, connectionStatus } = useBattleMatch(matchId);
  const [readyPending, setReadyPending] = useState(false);
  const matchStartedNavigatedRef = useRef(false);

  const myReady = myUserId != null && readyUserIds.has(myUserId);

  useEffect(() => {
    setReadyPending(false);
    matchStartedNavigatedRef.current = false;
  }, [matchId]);

  // Not "matched" -> we're no longer holding a queue slot, so an unmount
  // from here on shouldn't cancel a queue entry that doesn't exist anymore.
  useEffect(() => {
    if (status?.status === "matched") {
      holdingQueueSlotRef.current = false;
    }
  }, [status?.status]);

  // Both players readying is the earliest signal the match is progressing
  // past "waiting" -- the backend only starts selecting this match's
  // questions once the second ready lands, so navigating here (rather than
  // waiting for the "countdown" status to actually flip) is what lets
  // match-session.tsx show a real "generating" loading step for that gap
  // instead of skipping straight past it.
  useEffect(() => {
    if (matchId !== null && readyUserIds.size >= 2 && !matchStartedNavigatedRef.current) {
      matchStartedNavigatedRef.current = true;
      router.replace({
        pathname: "/(main)/battle/match-session",
        params: { matchId: String(matchId) },
      } as any);
    }
  }, [matchId, readyUserIds, router]);

  const handleReady = () => {
    if (readyPending || myReady) return;
    setReadyPending(true);
    const sent = sendReady();
    if (!sent) {
      setReadyPending(false);
      Toast.show({
        type: "error",
        text1: "Couldn't ready up",
        text2: "Check your connection and try again.",
      });
    }
  };

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // A poll returning "idle" while we still believe we hold a queue slot
  // means the server dropped us from matchmaking on its own (e.g. a stale-
  // queue reaper) -- distinct from the user pressing Cancel themselves.
  useEffect(() => {
    if (status?.status === "idle" && holdingQueueSlotRef.current) {
      holdingQueueSlotRef.current = false;
      setPollingEnabled(false);
      Toast.show({
        type: "error",
        text1: "Matchmaking cancelled",
        text2: "You were removed from the queue. Please try again.",
      });
      router.back();
    }
  }, [status, router]);

  const handleCancel = () => {
    holdingQueueSlotRef.current = false;
    setPollingEnabled(false);
    cancelQueue(undefined, { onSettled: () => router.back() });
  };

  const isMatched = status?.status === "matched";
  const opponent = status?.opponent;
  const league = getLeagueStyle(opponent?.league);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-primary">
      <View className="flex-1 items-center justify-center px-8">
        {!isMatched ? (
          <>
            <Animated.View
              style={pulseStyle}
              className="w-28 h-28 rounded-full bg-white/15 items-center justify-center mb-6"
            >
              <SubjectIcon size={44} color={ICON_COLORS.white} strokeWidth={1.8} />
            </Animated.View>

            <Text className="text-white text-2xl font-black mb-1">Finding a Match…</Text>
            <Text className="text-white/70 text-sm text-center mb-3">{subject}</Text>

            <View className="flex-row items-center gap-2 bg-white/15 px-4 py-2 rounded-2xl mb-6">
              <View className={`px-2 py-0.5 rounded-full ${myLeagueStyle.bg}`}>
                <Text className={`text-[10px] font-bold ${myLeagueStyle.text}`}>
                  {mySubjectProfile?.league ?? "Unranked"}
                </Text>
              </View>
              <Text className="text-white text-sm font-black">
                {mySubjectProfile ? mySubjectProfile.rating : "New Player"}
              </Text>
            </View>

            {status?.waited_seconds !== undefined && status.waited_seconds !== null && (
              <View className="flex-row items-center gap-4 mb-8">
                <View className="bg-white/15 px-4 py-2 rounded-2xl items-center">
                  <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wide">Waiting</Text>
                  <Text className="text-white text-lg font-black">{Math.round(status.waited_seconds)}s</Text>
                </View>
                {status.current_rating_window != null && (
                  <View className="bg-white/15 px-4 py-2 rounded-2xl items-center">
                    <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wide">Rating Range</Text>
                    <Text className="text-white text-lg font-black">±{status.current_rating_window}</Text>
                  </View>
                )}
              </View>
            )}

            <ActivityIndicator size="small" color={ICON_COLORS.white} style={{ marginBottom: 24 }} />

            <TouchableOpacity
              className="flex-row items-center gap-2 bg-white/15 px-6 py-3.5 rounded-2xl"
              activeOpacity={0.8}
              disabled={isCancelling}
              onPress={handleCancel}
            >
              <X size={16} color={ICON_COLORS.white} strokeWidth={2.5} />
              <Text className="text-white font-bold text-sm">
                {isCancelling ? "Cancelling…" : "Cancel"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Animated.View entering={FadeIn.duration(300)} className="items-center w-full">
            <View className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-4">
              <Swords size={28} color={ICON_COLORS.white} strokeWidth={2} />
            </View>
            <Text className="text-white text-2xl font-black mb-1">Opponent Found!</Text>

            <View className="bg-white/15 rounded-2xl px-5 py-4 mt-4 w-full flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                <User size={22} color={ICON_COLORS.white} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>
                  {opponent?.username ?? `Player #${opponent?.user_id}`}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className={`px-2 py-0.5 rounded-full ${league.bg}`}>
                    <Text className={`text-[10px] font-bold ${league.text}`}>{opponent?.league}</Text>
                  </View>
                  <Text className="text-white/70 text-xs">Rating {opponent?.rating}</Text>
                </View>
              </View>
            </View>

            <Text className="text-white/70 text-sm text-center mt-6 mb-3">
              {myReady ? "Waiting for opponent to ready up…" : "Ready up to start the match"}
            </Text>

            <TouchableOpacity
              className={`w-full flex-row justify-center items-center gap-2 py-4 rounded-2xl ${
                myReady || readyPending ? "bg-white/15" : "bg-white"
              }`}
              activeOpacity={0.85}
              disabled={myReady || readyPending || connectionStatus !== "open"}
              onPress={handleReady}
            >
              {(myReady || readyPending) && (
                <CheckCircle2 size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
              )}
              <Text className={`font-black text-base ${myReady || readyPending ? "text-white" : "text-primary"}`}>
                {myReady || readyPending ? "Waiting for opponent…" : "I'm Ready"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
