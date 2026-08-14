import { ComponentType, forwardRef, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { ChemicalType, EquipmentContentType } from "@/types";
import { useDraggableBenchItem } from "@/hooks/use-draggable-bench-item";
import { EquipmentVisualProps } from "./equipment/types";
import BubbleEffect from "./effects/BubbleEffect";
import SteamEffect from "./effects/SteamEffect";
import PourAnimation from "./effects/PourAnimation";

// Bench render size for every container-role instance. `BOX` is the art's footprint; the liquid
// hitbox below scales its height by fillLevel so it roughly tracks the SVG-rendered liquid.
const BOX = 88;
const VISUAL_SIZE = 58;
const MAX_LIQUID_HEIGHT_PCT = 60;

type Props = {
  id: string;
  label: string;
  Visual: ComponentType<EquipmentVisualProps>;
  position: { x: number; y: number };
  chemicals: ChemicalType[];
  contents: EquipmentContentType[];
  capacity?: number;
  heated: boolean;
  isHeatSource: boolean;
  temperature?: number;
  // True while a chemical bottle is being dragged over this specific instance — drives the
  // dashed hover highlight. Purely a visual read of drag progress, set by the workspace screen;
  // doesn't affect drop hit-testing itself (see useDropTargetRegistry).
  isDropTarget?: boolean;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onPress?: () => void;
  onInspect?: () => void;
  // Registers this instance's liquid sub-rect (not the whole equipment body) so probe-role
  // equipment (e.g. the pH meter) can hit-test against poured liquid specifically — see
  // useDropTargetRegistry / PhMeterInstrument. Only called while hasLiquid is true.
  registerLiquidRegion?: (id: string) => (node: View | null) => void;
};

const EquipmentContainer = forwardRef<View, Props>(
  (
    {
      id,
      label,
      Visual,
      position,
      chemicals,
      contents,
      capacity,
      heated,
      isHeatSource,
      temperature,
      isDropTarget,
      onMove,
      onPress,
      onInspect,
      registerLiquidRegion,
    },
    ref
  ) => {
    const { panGesture, animatedStyle } = useDraggableBenchItem({ id, position, onMove });

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

    const liquidColor = chemicals[chemicals.length - 1]?.color || "transparent";
    const hasLiquid = chemicals.length > 0;

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

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          ref={ref}
          style={[
            {
              position: "absolute",
              width: BOX + 38,
              height: BOX + 46,
              alignItems: "center",
            },
            animatedStyle,
          ]}
        >
          <View
            style={{
              width: BOX,
              height: BOX,
              overflow: "hidden",
              justifyContent: "flex-end",
            }}
          >
            <View
              pointerEvents="none"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
            >
              {/* Visual renders its own liquid fill internally, clipped to its actual silhouette
                  (see e.g. BeakerArt) — this is the fix for liquid overflowing a generic
                  rectangle instead of sitting inside the vessel's real shape. */}
              <Visual size={VISUAL_SIZE} color={colors.primaryBlack} liquidColor={liquidColor} fillLevel={fillLevel} on={heated} temperature={temperature} />
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
                style={{ position: "absolute", width: "100%", height: `${fillLevel * MAX_LIQUID_HEIGHT_PCT}%`, bottom: 0 }}
              >
                <BubbleEffect active={heated} />
              </View>
            )}
            {heated && <SteamEffect />}
            {isPouring && <PourAnimation color={liquidColor} onFinish={() => setIsPouring(false)} />}
          </View>
          <Text className="font-amedium text-xs mt-1" style={{ color: colors.primaryBlack }}>
            {label}
          </Text>
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
