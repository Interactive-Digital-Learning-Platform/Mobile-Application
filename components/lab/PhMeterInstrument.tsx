import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { EquipmentInstanceType, LastMeasurementType } from "@/types";
import { useDraggableBenchItem } from "@/hooks/use-draggable-bench-item";
import PhMeterArt from "./equipment/PhMeterArt";

const ART_SIZE = 84; // 1.2x PhMeterArt's own viewBox height (70) — see probeOffset in labEquipment.ts
const MEASURE_DEBOUNCE_MS = 150; // avoids a false trigger on a quick pass-through of the liquid
const MEASURING_DURATION_MS = 1000;

type ProbeState = "idle" | "in_liquid" | "measuring" | "complete";

type Props = {
  id: string;
  label: string;
  instance: EquipmentInstanceType;
  equipment: EquipmentInstanceType[];
  probeOffset: { x: number; y: number };
  resolveLiquidRegion: (x: number, y: number) => Promise<string | null>;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onInspect?: () => void;
  probeMeasure: (probeId: string, targetId: string, onOutcome?: (measurement: LastMeasurementType) => void) => void;
  probeDetach: (probeId: string) => void;
};

const phLabel = (value: number) => (value < 6.5 ? "Acidic" : value > 7.5 ? "Basic" : "Neutral");

export default function PhMeterInstrument({
  id,
  label,
  instance,
  equipment,
  probeOffset,
  resolveLiquidRegion,
  onMove,
  onInspect,
  probeMeasure,
  probeDetach,
}: Props) {
  const bodyRef = useRef<View>(null);
  const activeTargetIdRef = useRef<string | null>(instance.probeTargetId ?? null);
  const inLiquidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measuringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [probeState, setProbeState] = useState<ProbeState>(instance.lastMeasurement?.value != null ? "complete" : "idle");

  const clearTimers = () => {
    if (inLiquidTimerRef.current) clearTimeout(inLiquidTimerRef.current);
    if (measuringTimerRef.current) clearTimeout(measuringTimerRef.current);
    inLiquidTimerRef.current = null;
    measuringTimerRef.current = null;
  };

  useEffect(() => clearTimers, []);

  const beginMeasuring = (targetId: string) => {
    setProbeState("measuring");
    measuringTimerRef.current = setTimeout(() => {
      probeMeasure(id, targetId, () => setProbeState("complete"));
    }, MEASURING_DURATION_MS);
  };

  const checkProbeCollision = () => {
    bodyRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      const tipX = pageX + probeOffset.x;
      const tipY = pageY + probeOffset.y;
      resolveLiquidRegion(tipX, tipY).then((targetId) => {
        if (targetId === activeTargetIdRef.current) return;
        activeTargetIdRef.current = targetId;
        clearTimers();

        if (targetId) {
          setProbeState("in_liquid");
          inLiquidTimerRef.current = setTimeout(() => beginMeasuring(targetId), MEASURE_DEBOUNCE_MS);
        } else {
          setProbeState("idle");
          if (instance.probeTargetId) probeDetach(id);
        }
      });
    });
  };

  const { panGesture, animatedStyle } = useDraggableBenchItem({
    id,
    position: instance.position,
    onMove,
    onDragChange: checkProbeCollision,
  });

  const longPress = Gesture.LongPress().onStart(() => {
    if (onInspect) runOnJS(onInspect)();
  });
  const gesture = Gesture.Race(panGesture, longPress);

  // Re-measure if the target's contents change (a reaction firing, another chemical poured in)
  // while the probe is still resting in the liquid.
  const target = equipment.find((e) => e.instanceId === activeTargetIdRef.current);
  const contentsKey = target ? target.contents.map((c) => `${c.chemical}:${c.volume ?? c.mass ?? 0}`).join(",") : "";
  const prevContentsKeyRef = useRef(contentsKey);
  useEffect(() => {
    if (probeState === "complete" && activeTargetIdRef.current && contentsKey !== prevContentsKeyRef.current) {
      beginMeasuring(activeTargetIdRef.current);
    }
    prevContentsKeyRef.current = contentsKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentsKey]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (probeState === "measuring") {
      pulse.value = withRepeat(withTiming(0.3, { duration: 400 }), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [probeState, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const value = instance.lastMeasurement?.value;
  const displayText =
    probeState === "measuring" ? "MEASURING..." : probeState === "complete" && value != null ? `pH ${value.toFixed(1)}` : "--.--";

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ position: "absolute", width: 130, height: ART_SIZE + 24, alignItems: "center" }, animatedStyle]}>
        <View ref={bodyRef} style={{ width: (ART_SIZE * 40) / 70, height: ART_SIZE }}>
          <PhMeterArt size={ART_SIZE} color={colors.primaryBlack} ledState={probeState} pulseValue={pulse} />
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", top: 12, left: 4, right: 6, alignItems: "center" }, pulseStyle]}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.85)",
                borderRadius: 4,
                paddingHorizontal: 3,
                paddingVertical: 1,
              }}
            >
              <Text
                className="font-amedium"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: colors.primaryBlack, fontSize: 10 }}
              >
                {displayText}
              </Text>
            </View>
          </Animated.View>
        </View>
        <Text className="font-amedium text-xs mt-1" style={{ color: colors.primaryBlack }}>
          {label}
        </Text>
        {probeState === "complete" && value != null && (
          <Text className="font-aregular text-[10px]" style={{ color: "#979797" }}>
            {phLabel(value)}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
