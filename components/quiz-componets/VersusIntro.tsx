import { useEffect } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, Trophy } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ICON_COLORS } from "@/constants/quizStyles";
import { getLeagueStyle } from "@/constants/battleStyles";
import MatchStartPopup from "@/components/quiz-componets/MatchStartPopup";
import { League } from "@/types/battleModuleTypes";

export type VersusPlayerInfo = {
  username: string;
  rating: number | null;
  league: League | null | undefined;
};

// Both sides stay in the SAME hue (the app's existing orange primary) --
// only the shade changes, darker up top for the opponent and lighter down
// below for "me", each converging toward a mid shade at the divider. No
// second (blue) hue anywhere in this scene.
const MINE_LIGHT = ICON_COLORS.primary300;
const MINE_MID = ICON_COLORS.primary500;
const MINE_FOLD = ICON_COLORS.primary700;
const OPPONENT_MID = ICON_COLORS.primary700;
const OPPONENT_DARK = ICON_COLORS.primary800;
const OPPONENT_FOLD = "#5C260A"; // one notch darker than primary800, same hue family



// Folded-ribbon nameplate: two small diamonds peek out from behind the
// pill's bottom corners to read as tucked-under ribbon tails.
function NameRibbon({ name, accent, fold }: { name: string; accent: string; fold: string }) {
  return (
    <View className="items-center">
      <View
        className="absolute -bottom-2 left-2 w-5 h-5"
        style={{ backgroundColor: fold, transform: [{ rotate: "45deg" }] }}
      />
      <View
        className="absolute -bottom-2 right-2 w-5 h-5"
        style={{ backgroundColor: fold, transform: [{ rotate: "45deg" }] }}
      />
      <View
        className="rounded-[10px] px-6 py-3 border-b-4 max-w-[280px]"
        style={{ backgroundColor: accent, borderBottomColor: fold }}
      >
        <Text
          className="text-white font-black text-lg"
          numberOfLines={1}
          style={{
            textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
          }}
        >
          {name.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// A lucide Shield icon, sized up, filled with that side's own shade -- the
// avatar initial and rating sit centered on top of it, with the folded-
// ribbon nameplate stacked above.
function PlayerBox({
  player,
  accent,
  fold,
}: {
  player: VersusPlayerInfo;
  accent: string;
  fold: string;
}) {
  // Shield is tinted by the player's own league (Bronze/Silver/Gold/
  // Platinum/Diamond each carry their own color, see LEAGUE_STYLES) instead
  // of a fixed shade, so the rank actually reads at a glance here too, not
  // just as text underneath. `border` is a darker same-hue shade of that
  // same league color, for the shield's own outline.
  const { color: leagueColor, border: leagueBorder } = getLeagueStyle(player.league);

  return (
    <View className="items-center gap-8">
      <NameRibbon name={player.username} accent={accent} fold={fold} />
      <View className="items-center justify-center" style={{ width: 150, height: 150 }}>
        <Shield
          size={200}
          color={leagueBorder}
          fill={leagueColor}
          strokeWidth={1.2}
          style={{ position: "absolute" }}
        />
        <View className="items-center px-3">
          {/* A same-hue tint of the league color (tried both a darker and a
              lighter accent) never held up as *text* contrast -- some
              league colors just don't leave enough room in their own hue.
              A fixed dark backdrop sidesteps that: white-on-near-black is
              legible against every league color the shield could be
              tinted, not just some of them. */}
          
            <Trophy size={36} color={ICON_COLORS.white} strokeWidth={2.5} fill={ICON_COLORS.white} />
            <Text className="font-black text-xl text-white">
              {player.rating ?? "—"}
            </Text>
            {player.league && (
              <Text className="font-bold text-xs uppercase tracking-wide text-white">
                {player.league}
              </Text>
            )}
          
        </View>
      </View>
    </View>
  );
}

// Full-bleed "queued opponent found" scene: a hard horizontal split (a
// darker shade of the app's primary orange on top for the opponent, a
// lighter shade below for "me") with a large "VS" straddling the middle.
// Both halves are anchored at their own outer edge (top for the opponent,
// bottom for me) and scale up from zero height -- a "filling" reveal rather
// than a slide -- so they grow toward each other and meet exactly at the
// center. `children` renders as a bottom overlay (the existing
// ready-countdown/cancel-match controls).
export default function VersusIntro({
  me,
  opponent,
  children,
  showPreparingPopup,
}: {
  me: VersusPlayerInfo;
  opponent: VersusPlayerInfo;
  children?: React.ReactNode;
  // Blurred "Preparing Match" overlay, composed here rather than as a
  // sibling in the caller (queue.tsx) -- the caller still owns WHEN this
  // should show (both players ready, VersusIntro's own reveal already
  // finished, match still "waiting"), this just owns WHERE it renders.
  showPreparingPopup?: boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const halfHeight = windowHeight / 2;

  const fill = useSharedValue(0);
  const vLetter = useSharedValue(0);
  const sLetter = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    // Held back until the fill/box animation above has fully landed, then
    // "V" slides in from the left and "S" from the right, meeting in the
    // middle to form "VS" -- instead of sitting there the whole time
    // (which also used to get visually buried under the player boxes).
    vLetter.value = withDelay(900, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    sLetter.value = withDelay(900, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scaleY alone scales from the CENTER of the box, which would grow both
  // edges toward the middle at once -- pairing it with a translateY that
  // shrinks in lockstep keeps the far edge (screen top for the opponent,
  // screen bottom for me) pinned in place, so only the near edge (the one
  // facing the divider) actually appears to move as it fills in.
  const opponentFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (fill.value - 1) * (halfHeight / 2) },
      { scaleY: fill.value },
    ],
  }));
  const mineFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - fill.value) * (halfHeight / 2) },
      { scaleY: fill.value },
    ],
  }));

  // Driven by the exact same `fill` value as the two backgrounds above, so
  // each player's box fades and eases into place in lockstep with its own
  // half filling in, instead of just sitting there fully visible before the
  // color even arrives.
  const opponentBoxStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ translateY: (1 - fill.value) * -50 }],
  }));
  const meBoxStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ translateY: (1 - fill.value) * 50 }],
  }));

  const vLetterStyle = useAnimatedStyle(() => ({
    opacity: vLetter.value,
    transform: [{ translateX: (1 - vLetter.value) * -120 }],
  }));
  const sLetterStyle = useAnimatedStyle(() => ({
    opacity: sLetter.value,
    transform: [{ translateX: (1 - sLetter.value) * 120 }],
  }));

  return (
    <View className="flex-1 bg-primary-100">
      <View className="absolute inset-0">
        <Animated.View
          className="absolute top-0 left-0 right-0"
          style={[{ height: halfHeight }, opponentFillStyle]}
        >
          <LinearGradient colors={[OPPONENT_DARK, OPPONENT_MID]} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View
          className="absolute left-0 right-0"
          style={[{ top: halfHeight, height: halfHeight }, mineFillStyle]}
        >
          <LinearGradient colors={[MINE_MID, MINE_LIGHT]} style={{ flex: 1 }} />
        </Animated.View>
      </View>

      <View  className="flex-1">
        <View className="flex-1">
          <View className="flex-1 justify-center items-center px-6 ">
            <Animated.View style={opponentBoxStyle}>
              <PlayerBox player={opponent} accent={OPPONENT_MID} fold={OPPONENT_FOLD} />
            </Animated.View>
          </View>
          <View className="flex-1 justify-center items-center px-6 ">
            <Animated.View style={meBoxStyle}>
              <PlayerBox player={me} accent={MINE_MID} fold={MINE_FOLD} />
            </Animated.View>
          </View>
        </View>

        {/* Normal flow, not absolutely pinned to the bottom -- absolute
            positioning here used to let this float on top of (and cover)
            "me"'s shield whenever the box was tall enough to reach the
            bottom of the screen. As a plain sibling below the flex-1 halves
            row, it claims its own space instead and the halves shrink to
            make room, so it can never overlap either shield. */}
        {children != null && <View className="px-8 pb-6">{children}</View>}
      </View>

      {/* Rendered last (and above) so it's never buried under the player
          boxes -- it used to sit between the backgrounds and the
          SafeAreaView, which meant the SafeAreaView's own content painted
          over it. "V" and "S" are separate Animated.Text nodes (not one
          "VS" string) so each can slide in from its own side and meet in
          the middle. */}
      <View
        className="absolute left-0 right-0 flex-row justify-center items-center"
        style={{ top: "50%", marginTop: -65 }}
        pointerEvents="none"
      >
        <Animated.Text
          className="text-white font-black"
          style={[
            vLetterStyle,
            {
              fontSize: 100, letterSpacing: 1,
              textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 2,
            },
          ]}
        >
          V
        </Animated.Text>
        <Animated.Text
          className="text-white font-black"
          style={[
            sLetterStyle,
            {
              fontSize: 100, letterSpacing: 1,
              textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 2,
            },
          ]}
        >
          S
        </Animated.Text>
      </View>

      {showPreparingPopup && <MatchStartPopup />}
    </View>
  );
}
