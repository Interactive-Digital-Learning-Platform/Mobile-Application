import { forwardRef, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { BOX, MAX_LIQUID_HEIGHT_PCT, resolveContainerAppearance, VISUAL_SIZE } from "@/constants/lab/equipment.constants";
import { EquipmentContainerProps } from "@/types/lab";
import { useDraggableBenchItem } from "@/hooks/lab/use-draggable-bench-item";
import BubbleEffect from "../effects/BubbleEffect";
import SteamEffect from "../effects/SteamEffect";
import PourAnimation from "../effects/PourAnimation";
import WaveEffect from "../effects/WaveEffect";

const EquipmentContainer = forwardRef<View, EquipmentContainerProps>(
  (
    {
      id,
      label,
      Visual,
      scale = 1,
      isPouringOut = false,
      pourAngle = -22,
      isMeasuring = false,
      position,
      chemicals,
      contents,
      observableState,
      capacity,
      heated,
      isHeatSource,
      temperature,
      isDropTarget,
      onMove,
      onPress,
      onInspect,
      registerLiquidRegion,
      resolveDropTarget,
      onPour,
    },
    ref
  ) => {
    const hasLiquid = chemicals.length > 0;
    const box = BOX * scale;
    const visual = VISUAL_SIZE * scale;
    // The art is centred in the square `box`, so effects (shadow, liquid hitbox, bubbles, steam)
    // that belong to the *vessel* must be anchored `bottomInset` up from the box floor and sized
    // to the vessel, not the box — otherwise a big box makes them spill out the sides / below.
    const bottomInset = (box - visual) / 2;
    // Vessel-width band the liquid + its effects (and the pH-probe hit-test) live in.
    const liquidW = visual * 0.5;

    // Only a container actually holding liquid can pour — an empty (or non-container) instance
    // dropped onto another just falls back to a normal reposition. Target validity (must be a
    // container-role instance) is checked upstream in workspace.tsx, which owns the equipment
    // catalog this component doesn't have; a rejected drop still returns true here (the source
    // still snaps back rather than landing on top of the target) and workspace.tsx no-ops it.
    const handleDrop = (targetId: string): boolean => {
      if (!hasLiquid || !onPour) return false;
      onPour(id, targetId);
      return true;
    };

    const { panGesture, animatedStyle } = useDraggableBenchItem({
      id,
      position,
      onMove,
      resolveDropTarget,
      onDrop: handleDrop,
    });

    const tap = Gesture.Tap().onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

    // A quick tap toggles heat (onPress) since that's the more frequent, functional action mid-
    // experiment; holding longer opens the inspect panel (auxiliary/reflective) instead of
    // competing for the same quick gesture.
    const longPress = Gesture.LongPress().onStart(() => {
      if (onInspect) runOnJS(onInspect)();
    });

    // Race, not Simultaneous: Pan requires movement to activate, so a stationary tap
    // resolves via the Tap gesture instead of being swallowed by the drag handler. LongPress
    // activates on hold (before release), so it wins the race over Tap when held long enough.
    const gesture = Gesture.Race(panGesture, tap, longPress);

    // Observable appearance is resolved from the backend's authoritative observableState (colour
    // after any reaction / indicator result), falling back to the last chemical's own appearance
    // for a legacy run. The component never derives colour from `chemicals` directly.
    const appearance = resolveContainerAppearance(observableState, chemicals);
    const liquidColor = appearance?.color || "transparent";
    const liquidOpacity = appearance?.opacity ?? 0.8;

    // Total poured quantity (volume + mass treated as one rough "amount" proxy — this is a visual
    // fill indicator, not a scientific measure) normalized against the vessel's nominal capacity.
    // A small floor keeps a just-poured drop visible instead of an invisible sliver.
    const totalQuantity = contents.reduce((sum, c) => sum + (c.volume ?? 0) + (c.mass ?? 0), 0);
    const fillLevel = hasLiquid && capacity ? Math.max(0.08, Math.min(1, totalQuantity / capacity)) : 0;

    const [isPouring, setIsPouring] = useState(false);
    const prevCount = useRef(chemicals.length);
    useEffect(() => {
      if (chemicals.length > prevCount.current) setIsPouring(true);
      prevCount.current = chemicals.length;
    }, [chemicals.length]);

    // Transient "the flask feels warm / cold" cue — shown for a few seconds after a reaction whose
    // observableState reports an energy change. The temperature itself stays on instance.temperature
    // (authoritative, read by the pH-meter/thermometer); this is just the momentary feedback.
    const tempChange = observableState?.temperatureChange ?? null;
    const [showTempCue, setShowTempCue] = useState(false);
    useEffect(() => {
      if (!tempChange || !observableState?.lastChangedAt) return;
      setShowTempCue(true);
      const t = setTimeout(() => setShowTempCue(false), 3800);
      return () => clearTimeout(t);
    }, [tempChange, observableState?.lastChangedAt]);

    // Brief "just landed" confirmation the moment an instance is first placed on the bench —
    // separate from isPouring, which only fires on a subsequent chemical drop into it.
    const [showPlacedGlow, setShowPlacedGlow] = useState(true);
    useEffect(() => {
      const t = setTimeout(() => setShowPlacedGlow(false), 500);
      return () => clearTimeout(t);
    }, []);

    const hoverPulse = useSharedValue(1);
    useEffect(() => {
      hoverPulse.value = isDropTarget ? withRepeat(withTiming(0.35, { duration: 500 }), -1, true) : withTiming(1, { duration: 150 });
    }, [isDropTarget, hoverPulse]);
    const hoverPulseStyle = useAnimatedStyle(() => ({ opacity: hoverPulse.value }));

    // Source-vessel tilt while pouring — rock toward the target, hold, then settle back upright.
    const tilt = useSharedValue(0);
    useEffect(() => {
      if (!isPouringOut) return;
      tilt.value = withSequence(
        withTiming(pourAngle, { duration: 190 }),
        withTiming(pourAngle, { duration: 360 }),
        withTiming(0, { duration: 260 })
      );
    }, [isPouringOut, pourAngle, tilt]);
    const tiltStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));

    // Pulsing ring while a probe is measuring this vessel — sky blue, distinct from the orange
    // "drop here" dashed ring and the emerald "just placed" glow.
    const measurePulse = useSharedValue(0);
    useEffect(() => {
      measurePulse.value = isMeasuring
        ? withRepeat(withTiming(1, { duration: 700 }), -1, true)
        : withTiming(0, { duration: 150 });
    }, [isMeasuring, measurePulse]);
    const measureRingStyle = useAnimatedStyle(() => ({ opacity: 0.35 + measurePulse.value * 0.55 }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          ref={ref}
          style={[
            {
              position: "absolute",
              width: box + 38,
              height: box + 46,
              alignItems: "center",
            },
            animatedStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                width: box,
                height: box,
                overflow: "hidden",
                justifyContent: "flex-end",
                transformOrigin: "50% 100%",
              },
              tiltStyle,
            ]}
          >
            {/* soft grounding shadow — under the vessel base, not the box floor */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: bottomInset - 2,
                left: (box - visual * 0.36) / 2,
                width: visual * 0.36,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#0f172a",
                opacity: 0.1,
              }}
            />
            <View
              pointerEvents="none"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
            >
              {/* Visual renders its own liquid fill internally, clipped to its actual silhouette
                  (see e.g. BeakerArt) — this is the fix for liquid overflowing a generic
                  rectangle instead of sitting inside the vessel's real shape. */}
              <Visual
                size={visual}
                color={colors.primaryBlack}
                liquidColor={liquidColor}
                liquidOpacity={liquidOpacity}
                precipitateColor={appearance?.precipitateColor}
                cloudiness={appearance?.cloudiness}
                fillLevel={fillLevel}
                on={heated}
                temperature={temperature}
              />
            </View>
            {isDropTarget && (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(100)}
                exiting={FadeOut.duration(150)}
                style={[
                  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary },
                  hoverPulseStyle,
                ]}
              />
            )}
            {isMeasuring && (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(120)}
                exiting={FadeOut.duration(200)}
                style={[
                  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, borderWidth: 2.5, borderColor: "#4F86C6", backgroundColor: "rgba(79,134,198,0.08)" },
                  measureRingStyle,
                ]}
              />
            )}
            {(showPlacedGlow || isPouring) && (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(120)}
                exiting={FadeOut.duration(400)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: "#10B981",
                  backgroundColor: "rgba(16,185,129,0.08)",
                }}
              />
            )}
            {hasLiquid && (
              // This region is an invisible hitbox, not a visual liquid layer (the SVG above owns
              // that) — it exists so probe-role equipment can hit-test "is the probe touching the
              // liquid" via the same View.measure()-based registry every other drop target uses,
              // and so BubbleEffect has a bottom-anchored area to rise within. Its height tracks
              // fillLevel the same way the SVG fill does, so it stays a reasonable approximation
              // of where the liquid actually sits even though it isn't shape-clipped itself.
              <View
                ref={registerLiquidRegion?.(id)}
                style={{
                  position: "absolute",
                  left: (box - liquidW) / 2,
                  width: liquidW,
                  height: Math.max(10, fillLevel * (MAX_LIQUID_HEIGHT_PCT / 100) * visual),
                  bottom: bottomInset + visual * 0.02,
                }}
              >
                {/* Bubbling = thermal (heated) OR a reaction that evolves a gas (observableState). */}
                <BubbleEffect active={heated || !!observableState?.gasProduced} />
                {/* A pour landing ripples the surface — a physical disturbance, not the thermal
                    bubbling above (which stays tied to `heated` regardless of whether anything
                    was just poured). */}
                {isPouring && <WaveEffect />}
              </View>
            )}
            {(heated || (showTempCue && tempChange === "exothermic")) && (
              <View
                pointerEvents="none"
                style={{ position: "absolute", left: (box - liquidW) / 2, width: liquidW, bottom: bottomInset + visual * 0.62, height: visual * 0.3 }}
              >
                <SteamEffect />
              </View>
            )}
            {isPouring && <PourAnimation color={liquidColor} onFinish={() => setIsPouring(false)} />}
          </Animated.View>
          {/* No permanent label — it clutters the bench. A small identity chip appears only while
              the item is a drop target, being poured into, or just placed; full contents live in
              the long-press inspect panel. */}
          {(isDropTarget || isPouring || showPlacedGlow) && (
            <Animated.View
              pointerEvents="none"
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(200)}
              className="mt-1 px-2 py-0.5 rounded-full bg-slate-800"
            >
              <Text className="text-white font-bold" style={{ fontSize: 10 }} numberOfLines={1}>
                {label}
                {hasLiquid ? ` · ${chemicals[chemicals.length - 1]?.name}` : ""}
              </Text>
            </Animated.View>
          )}
          {showTempCue && tempChange && (
            <Animated.View
              pointerEvents="none"
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(260)}
              className={`mt-1 px-2 py-0.5 rounded-full ${tempChange === "exothermic" ? "bg-orange-500" : "bg-sky-500"}`}
            >
              <Text className="text-white font-bold" style={{ fontSize: 10 }} numberOfLines={1}>
                {tempChange === "exothermic" ? "🔥 warms up" : "❄️ cools down"}
              </Text>
            </Animated.View>
          )}
          {isHeatSource && (
            <View
              style={{
                width: 40,
                height: 8,
                marginTop: 2,
                borderRadius: 4,
                backgroundColor: heated ? "#FF6B35" : "#D9D9D9",
              }}
            />
          )}
        </Animated.View>
      </GestureDetector>
    );
  }
);

EquipmentContainer.displayName = "EquipmentContainer";

export default EquipmentContainer;
