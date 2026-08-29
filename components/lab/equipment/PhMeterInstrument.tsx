import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { BOX, benchScale } from "@/constants/lab/equipment.constants";
import { ART_SIZE, MEASURE_DEBOUNCE_MS, MEASURING_DURATION_MS } from "@/constants/lab/probes.constants";
import { PhMeterLedState, ProbeInstrumentProps } from "@/types/lab";
import { useDraggableBenchItem } from "@/hooks/lab/use-draggable-bench-item";
import PhMeterArt from "./PhMeterArt";

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
  onTargetChange,
}: ProbeInstrumentProps) {
  const bodyRef = useRef<View>(null);
  const activeTargetIdRef = useRef<string | null>(instance.probeTargetId ?? null);
  const inLiquidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measuringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [probeState, setProbeState] = useState<PhMeterLedState>(instance.lastMeasurement?.value != null ? "complete" : "idle");
  // Set when the probe tip lands in a container — springs the whole meter so the tip settles at a
  // consistent spot inside that vessel (the "snap into the liquid" feel), instead of the meter
  // hovering wherever the drag happened to end.
  const [dockRequest, setDockRequest] = useState<{ x: number; y: number; nonce: number } | null>(null);
  // Count-up readout: on completion the number sweeps from neutral to the measured value.
  const [sweepValue, setSweepValue] = useState<number | null>(null);

  const clearTimers = () => {
    if (inLiquidTimerRef.current) clearTimeout(inLiquidTimerRef.current);
    if (measuringTimerRef.current) clearTimeout(measuringTimerRef.current);
    inLiquidTimerRef.current = null;
    measuringTimerRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
      onTargetChange?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        onTargetChange?.(targetId);
        clearTimers();

        if (targetId) {
          setProbeState("in_liquid");
          // Snap the meter so the probe tip settles into this vessel.
          const t = equipment.find((e) => e.instanceId === targetId);
          if (t) {
            const s = benchScale(t.equipmentType);
            const bodyLeftInOuter = (130 - (ART_SIZE * 40) / 70) / 2;
            setDockRequest({
              x: t.position.x + (BOX * s + 38) / 2 - bodyLeftInOuter - probeOffset.x,
              // Aim the tip low, where the liquid now sits (see EquipmentContainer's bottomInset).
              y: t.position.y + BOX * s * 0.62 - probeOffset.y,
              nonce: Date.now(),
            });
          }
          inLiquidTimerRef.current = setTimeout(() => beginMeasuring(targetId), MEASURE_DEBOUNCE_MS);
        } else {
          setProbeState("idle");
          if (instance.probeTargetId) probeDetach(id);
        }
      });
    });
  };

  const { translateX, translateY, panGesture, animatedStyle } = useDraggableBenchItem({
    id,
    position: instance.position,
    onMove,
    onDragChange: checkProbeCollision,
  });

  // Apply a dock request (from checkProbeCollision) here, where the drag shared values are in
  // scope. Delayed + self-cancelling so it only fires once the drag has actually settled —
  // checkProbeCollision also runs mid-drag, and springing the position then would fight the finger.
  useEffect(() => {
    if (!dockRequest) return;
    const t = setTimeout(() => {
      translateX.value = withSpring(dockRequest.x, { damping: 18, stiffness: 170 });
      translateY.value = withSpring(dockRequest.y, { damping: 18, stiffness: 170 });
      onMove(id, { x: dockRequest.x, y: dockRequest.y });
    }, 160);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockRequest]);

  // Sweep the readout from neutral (7) to the measured value once the backend responds.
  useEffect(() => {
    const v = instance.lastMeasurement?.value;
    if (probeState !== "complete" || v == null) {
      setSweepValue(null);
      return;
    }
    const frames = 12;
    let frame = 0;
    setSweepValue(7);
    const iv = setInterval(() => {
      frame += 1;
      if (frame >= frames) {
        setSweepValue(v);
        clearInterval(iv);
      } else {
        setSweepValue(7 + (v - 7) * (frame / frames));
      }
    }, 30);
    return () => clearInterval(iv);
  }, [probeState, instance.lastMeasurement?.value]);

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
  const shownValue = sweepValue ?? value;
  const displayText =
    probeState === "measuring"
      ? "MEASURING..."
      : probeState === "complete" && shownValue != null
        ? `pH ${shownValue.toFixed(1)}`
        : "--.--";

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
