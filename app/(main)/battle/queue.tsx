import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { X } from "lucide-react-native";
import { getSubjectIcon, ICON_COLORS } from "@/constants/quizStyles";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
import {
  battleKeys,
  useBattleProfileQuery,
  useCancelQueueMutation,
  useForfeitMatchMutation,
  useJoinQueueMutation,
  useQueueStatusQuery,
} from "@/hooks/use-battle";
import { useBattleMatchContext } from "@/hooks/use-battle-match";
import { useUserMeQuery } from "@/hooks/use-quiz";
import ForfeitModal from "@/components/quiz-componets/ForfeitModal";
import VersusIntro from "@/components/quiz-componets/VersusIntro";

export default function BattleQueueScreen() {
  const router = useRouter();
  const { subject: subjectParam } = useLocalSearchParams<{ subject: string }>();
  const { matchState, readyUserIds, myUserId, sendReady, connectionStatus, setActiveMatchId } =
    useBattleMatchContext();
  // Confirmed via device testing: router.replace({pathname: "/(main)/battle/queue",
  // params: {subject}}) from battle-results.tsx's "Next Match" button (unlike
  // every OTHER params-carrying replace/push in this flow) arrives here with
  // subject undefined, even though battle-results.tsx itself displays the
  // correct value right before the tap. Rather than depend on nailing down
  // that Expo Router quirk, fall back to the subject already sitting in the
  // shared match connection (see BattleMatchProvider in _layout.tsx) -- a
  // "Next Match" is by definition a rematch of the just-finished match's own
  // subject, and that connection still holds its matchState (from the just-
  // finished match) at the moment this screen first mounts.
  //
  // Captured into state rather than read live on every render: this same
  // screen resets the shared connection's matchState back to null a moment
  // after mount (see the setActiveMatchId(matchId) effect below, which fires
  // with matchId=null before any real match is found) -- once resolved,
  // `subject` must NOT go blank again just because that fallback source
  // disappeared. The effect below still lets a late-arriving subjectParam
  // (e.g. if it resolves a render after mount) override the fallback.
  const [subject, setSubject] = useState<string | undefined>(
    () => subjectParam ?? matchState?.subject ?? undefined
  );
  useEffect(() => {
    if (subjectParam && subjectParam !== subject) setSubject(subjectParam);
  }, [subjectParam, subject]);
  const SubjectIcon = getSubjectIcon(subject);
  const queryClient = useQueryClient();

  const { mutate: joinQueue } = useJoinQueueMutation();
  const { mutate: cancelQueue, isPending: isCancelling } = useCancelQueueMutation();
  const joinTriggeredRef = useRef(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  // battleKeys.queueStatus is a single global cache key, not scoped per
  // subject/session, and is never invalidated once matched (see
  // useJoinQueueMutation) -- it still holds {status:"matched", match_id:
  // <this now-completed match>} for as long as this same subject is requeued
  // into (e.g. "Next Match" on battle-results.tsx). React Query returns that
  // stale cached `data` on this screen's very FIRST render, before the mount
  // effect below has had a chance to clear it -- staleQueueStatusCleared
  // gates `status` to `undefined` until that happens, so nothing on this
  // mount ever acts on a dead match's id (previously harmless, since a fresh
  // useBattleMatch(oldMatchId) mount just self-corrected a moment later --
  // now that the connection is a long-lived one shared via BattleMatchProvider,
  // publishing that stale id into it would resurrect the dead match's
  // terminal state instead of starting clean).
  const [staleQueueStatusCleared, setStaleQueueStatusCleared] = useState(false);

  // Tracks whether we still hold an active queue slot that needs cancelling
  // if this screen unmounts without the user pressing Cancel explicitly
  // (e.g. swipe-back, hardware back, or navigating away another way).
  const holdingQueueSlotRef = useRef(false);

  useEffect(() => {
    if (!subject || joinTriggeredRef.current) return;
    joinTriggeredRef.current = true;
    queryClient.removeQueries({ queryKey: battleKeys.queueStatus, exact: true });
    setStaleQueueStatusCleared(true);
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
        const detail = error instanceof Error ? error.message : null;
        // This specific 409 almost always means a *previous* match never
        // got a chance to finish server-side (app closed/crashed mid-match,
        // connection dropped) rather than something wrong with THIS join --
        // the backend self-heals it automatically within a few minutes (see
        // Quiz-Battle-Service's stale-match reaper), so say that instead of
        // leaving the player thinking they're permanently stuck.
        const isStaleActiveBattle = detail === "You're already in an active battle.";
        Toast.show({
          type: "error",
          text1: isStaleActiveBattle ? "Finishing up your last battle" : "Couldn't join the queue",
          text2: isStaleActiveBattle
            ? "A previous match is still wrapping up. Try again in a couple of minutes."
            : detail ?? "Check your connection and try again.",
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

  const { data: rawStatus } = useQueueStatusQuery(pollingEnabled);
  const status = staleQueueStatusCleared ? rawStatus : undefined;
  const { data: profile } = useBattleProfileQuery();
  const mySubjectProfile = profile?.subjects.find((s) => s.subject === subject);

  // Once matched, the match's own WS connection is opened right here (not
  // only after navigating to match-session) so the "Ready" step can happen
  // on this same screen -- matchId stays null (no connection attempted)
  // until a real match_id shows up in the queue status. The subject check
  // guards against the same stale-cache hazard the mount effect's
  // removeQueries() targets above: a "matched" response for a DIFFERENT
  // subject can only be stale leftover data from a previous session.
  const isMatched = status?.status === "matched";
  const matchId =
    status?.status === "matched" && status.subject === subject ? status.match_id ?? null : null;
  // Publishes this screen's own matchId (derived from queue-status polling
  // above) into the shared connection hosted by _layout.tsx -- see
  // use-battle-match.tsx's BattleMatchProvider for why the connection lives
  // there rather than being opened separately by this screen.
  useEffect(() => {
    setActiveMatchId(matchId);
  }, [matchId, setActiveMatchId]);
  const { mutate: forfeitMatch, isPending: isLeavingMatch } = useForfeitMatchMutation();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const matchStartedNavigatedRef = useRef(false);
  // Distinguishes "I cancelled" (handleLeaveMatchConfirm navigates away
  // immediately, no need to react to the match_cancelled echo that comes
  // back over my own socket) from "the opponent cancelled" (this screen
  // should auto-requeue instead) -- both sides see the same event.
  const selfCancelledRef = useRef(false);

  const navigation = useNavigation();
  const pendingLeaveActionRef = useRef<any>(null);
  const [leavingConfirmed, setLeavingConfirmed] = useState(false);

  // Backing out of a matched-but-not-started screen via the hardware back
  // button or an iOS swipe-back gesture bypasses handleLeaveMatchConfirm
  // entirely -- no in-app button press means no forfeit call, leaving the
  // match stuck "waiting" server-side forever: the opponent never gets
  // notified and neither player can queue into a new match while the old
  // one still looks active to the backend. Intercept any removal attempt
  // for as long as we're matched and the match hasn't already started
  // (readyUserIds reaching 2 is our own signal to router.replace() away to
  // match-session below -- excluding that keeps this guard from blocking
  // that legitimate, in-app navigation) and route it through the same
  // confirm-then-forfeit flow as the explicit "Cancel Match" button.
  usePreventRemove(isMatched && readyUserIds.size < 2 && !leavingConfirmed, (e) => {
    pendingLeaveActionRef.current = e.data.action;
    setShowLeaveConfirm(true);
  });

  const myReady = myUserId != null && readyUserIds.has(myUserId);

  // No manual "I'm Ready" button and no visible countdown -- the match
  // starts as soon as the opponent is found, so readying up happens the
  // instant the socket is open, invisibly. `readyRetryTick` exists only to
  // retry a failed send (e.g. a brief reconnect) roughly once a second,
  // without any UI reflecting it.
  const readySentRef = useRef(false);
  const [readyRetryTick, setReadyRetryTick] = useState(0);

  useEffect(() => {
    readySentRef.current = false;
    setReadyRetryTick(0);
    matchStartedNavigatedRef.current = false;
  }, [matchId]);

  useEffect(() => {
    if (!isMatched || myReady || readySentRef.current || connectionStatus !== "open") return;
    const sent = sendReady();
    if (sent) {
      readySentRef.current = true;
      return;
    }
    const timer = setTimeout(() => setReadyRetryTick((n) => n + 1), 1000);
    return () => clearTimeout(timer);
  }, [isMatched, myReady, connectionStatus, sendReady, readyRetryTick]);

  // Not "matched" -> we're no longer holding a queue slot, so an unmount
  // from here on shouldn't cancel a queue entry that doesn't exist anymore.
  useEffect(() => {
    if (status?.status === "matched") {
      holdingQueueSlotRef.current = false;
    }
  }, [status?.status]);

  // VersusIntro plays for a fixed 5s regardless of how fast the backend
  // readies/generates behind it (that work already started the instant both
  // sides readied above, running in parallel) -- no popup or countdown of
  // any kind covers the rest of that wait if it runs long, VersusIntro's own
  // reveal just stays on screen until the match is ready. Only once this
  // elapses AND both players have actually confirmed ready (readying up is
  // automatic and near-instant, but this still shouldn't fire on a stale
  // one-sided ready) does leaving VersusIntro even get considered.
  const [versusIntroDone, setVersusIntroDone] = useState(false);
  useEffect(() => {
    setVersusIntroDone(false);
    if (matchId === null) return;
    const timer = setTimeout(() => setVersusIntroDone(true), 5000);
    return () => clearTimeout(timer);
  }, [matchId]);
  const bothReady = readyUserIds.size >= 2;
  const readyToLeaveVersusIntro = versusIntroDone && bothReady;
  const matchStatus = matchState?.status;

  // Hands off once VersusIntro's own reveal is done and both sides are
  // ready: straight to match-session.tsx if question generation already
  // finished (status left "waiting") -- the real question is just already
  // live by the time this screen changes -- otherwise to the dedicated
  // "preparing" screen, which owns waiting out the rest of that gap (see
  // app/(main)/battle/preparing.tsx) and hands off to match-session.tsx
  // itself once ready.
  useEffect(() => {
    if (matchId === null || !readyToLeaveVersusIntro || matchStartedNavigatedRef.current) return;
    matchStartedNavigatedRef.current = true;
    if (matchStatus != null && matchStatus !== "waiting") {
      router.replace({
        pathname: "/(main)/battle/match-session",
        params: { matchId: String(matchId) },
      } as any);
    } else {
      router.replace({
        pathname: "/(main)/battle/preparing",
        params: { matchId: String(matchId), subject: subject ?? "" },
      } as any);
    }
  }, [matchId, readyToLeaveVersusIntro, matchStatus, subject, router]);

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

  // Once matched, matchmaking is already done (holdingQueueSlotRef was
  // cleared above) -- a real BattleMatch row exists, so backing out here
  // sends a forfeit same as the header X in match-session.tsx. The backend
  // treats forfeiting a still-"waiting" match (matched but not yet both-
  // ready) as voiding it rather than scoring a win, since no question has
  // ever been shown to either player.
  //
  // This uses the REST forfeit endpoint, awaited, rather than the match
  // WS's fire-and-forget `sendForfeit` -- firing that and immediately
  // calling router.back() (as this used to) unmounts useBattleMatch and
  // closes the socket with no guarantee the server ever received the
  // frame, silently dropping the cancellation and leaving both players'
  // server-side state stuck on the dead match (opponent never notified,
  // neither side able to queue again). A plain request/response has no
  // such race: we only navigate away once the server has confirmed it.
  const handleLeaveMatchConfirm = () => {
    if (matchId === null || isLeavingMatch) return;
    setShowLeaveConfirm(false);
    // Unblocks usePreventRemove above *before* the navigation below fires,
    // so the leave we're about to perform (either replaying a gesture/back-
    // button's originally-intercepted action, or our own router.back())
    // doesn't immediately re-trigger the same guard.
    setLeavingConfirmed(true);
    selfCancelledRef.current = true;
    forfeitMatch(matchId, {
      onSuccess: () => {
        // battleKeys.queueStatus is a single GLOBAL cache key, not scoped to
        // this screen instance -- it still holds {status:"matched", this
        // now-cancelled match_id}. Left alone, a fresh queue.tsx mounted
        // later (tapping "Find Match" again) would read this stale entry on
        // its very FIRST render, before its own mount effect gets a chance
        // to clear it, briefly resolving matchId back to this dead match --
        // which pulls in its "cancelled" matchState and fires the "opponent
        // left, auto-requeue" effect at the exact same time as the new
        // mount's own join call. Two concurrent joinQueue calls race, one
        // 409s, and that screen's onError sends the player right back out --
        // exactly the "can't start a match after cancelling" symptom this
        // avoids by clearing the cache now, at the source, instead of
        // leaving the next mount to clean up after the fact.
        queryClient.removeQueries({ queryKey: battleKeys.queueStatus, exact: true });
        if (pendingLeaveActionRef.current) {
          navigation.dispatch(pendingLeaveActionRef.current);
          pendingLeaveActionRef.current = null;
        } else {
          router.back();
        }
      },
      onError: (error) => {
        selfCancelledRef.current = false;
        setLeavingConfirmed(false);
        pendingLeaveActionRef.current = null;
        Toast.show({
          type: "error",
          text1: "Couldn't cancel match",
          text2: error instanceof Error ? error.message : "Check your connection and try again.",
        });
      },
    });
  };

  // The OPPONENT's screen sees this fire when I cancel above (both sockets
  // get the same match_cancelled event) -- auto-requeue for a new match
  // instead of dead-ending, since nothing about their own search failed.
  //
  // Deliberately does NOT call queryClient.removeQueries() here (unlike the
  // mount effect above) and does NOT flip holdingQueueSlotRef until
  // joinQueue's own onSuccess: pollingEnabled is already true at this point
  // (left on from when we originally matched), so battleKeys.queueStatus is
  // actively observed -- removing it would make React Query refetch
  // immediately, landing on GET /battle/queue/status right after the
  // backend clears our match state but before joinQueue below re-adds us,
  // which comes back "idle". If holdingQueueSlotRef were already true at
  // that moment, the "removed from queue by the server" effect further
  // below would misread that transient blip as a real kick and send this
  // player home too -- exactly the bug this ordering avoids. joinQueue's
  // own onSuccess overwrites the stale "matched" cache directly, so no
  // manual cache-clear is needed.
  useEffect(() => {
    if (matchState?.status !== "cancelled" || selfCancelledRef.current || !subject) return;
    Toast.show({
      type: "info",
      text1: "Opponent left",
      text2: "Looking for a new match…",
    });
    joinQueue(subject, {
      onSuccess: () => {
        holdingQueueSlotRef.current = true;
        setPollingEnabled(true);
      },
      onError: (error) => {
        Toast.show({
          type: "error",
          text1: "Couldn't rejoin the queue",
          text2: error instanceof Error ? error.message : "Check your connection and try again.",
        });
        router.back();
      },
    });
  }, [matchState?.status, subject, joinQueue, router]);

  const opponent = status?.opponent;
  const { data: me } = useUserMeQuery();

  // Straight to VersusIntro the instant a match is found -- no separate
  // "Opponent Found!" screen and no visible ready-up countdown, since
  // readying now happens automatically the moment the socket opens (see
  // above). No Cancel Match button here either: usePreventRemove still
  // guards this screen until both sides are ready, so a back gesture in
  // this narrow window still has somewhere to resolve to (the same
  // ForfeitModal), it's just not offered as an on-screen affordance anymore.
  if (isMatched) {
    return (
      <View style={{ flex: 1 }}>
        <VersusIntro
          me={{
            username: me?.username ?? "You",
            rating: mySubjectProfile?.rating ?? null,
            league: mySubjectProfile?.league ?? null,
          }}
          opponent={{
            username: opponent?.username ?? (opponent ? `Player #${opponent.user_id}` : "Opponent"),
            rating: opponent?.rating ?? null,
            league: opponent?.league ?? null,
          }}
        />

        <ForfeitModal
          visible={showLeaveConfirm}
          onCancel={() => {
            setShowLeaveConfirm(false);
            pendingLeaveActionRef.current = null;
          }}
          onConfirm={handleLeaveMatchConfirm}
          title="Cancel This Match?"
          message="Your opponent will be notified and matched with someone else. No rating changes."
          confirmLabel="Yes, Cancel Match"
          cancelLabel="Stay In Match"
        />
      </View>
    );
  }

  return (
    <LinearGradient colors={[ICON_COLORS.primary500, "#FF8F30"]} style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <View className="flex-1 items-center justify-center px-8">
            <Animated.View
              style={pulseStyle}
              className="w-28 h-28 rounded-full bg-white/15 items-center justify-center mb-6"
            >
              <SubjectIcon size={44} color={ICON_COLORS.white} strokeWidth={1.8} />
            </Animated.View>

            <Text className="text-white text-2xl font-black mb-1">Finding a Match…</Text>
            <Text className="text-white/70 text-sm text-center mb-3">{subject}</Text>

            <View className="flex-row items-center gap-2 bg-white/15 px-4 py-2 rounded-2xl mb-6">
              <LeagueBadge league={mySubjectProfile?.league} />
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
        </View>

        <ForfeitModal
          visible={showLeaveConfirm}
          onCancel={() => {
            setShowLeaveConfirm(false);
            pendingLeaveActionRef.current = null;
          }}
          onConfirm={handleLeaveMatchConfirm}
          title="Cancel This Match?"
          message="Your opponent will be notified and matched with someone else. No rating changes."
          confirmLabel="Yes, Cancel Match"
          cancelLabel="Stay In Match"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
