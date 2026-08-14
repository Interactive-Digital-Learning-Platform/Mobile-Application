import { Gesture } from "react-native-gesture-handler";
import { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Args = {
  id: string;
  position: { x: number; y: number };
  onMove: (id: string, position: { x: number; y: number }) => void;
  // Fired via runOnJS, throttled to ~120ms, on every drag tick — used by probe-role equipment
  // (e.g. the pH meter) to re-check collision against liquid regions while dragging. Omit for
  // equipment that only needs to reposition itself (the common case).
  onDragChange?: () => void;
};

// Shared "draggable bench item body" behavior, extracted from EquipmentContainer so probe-role
// instruments (PhMeterInstrument) don't duplicate the same translateX/Y + pan-gesture plumbing.
// Callers still compose their own tap/longPress gestures locally via Gesture.Race(panGesture, ...)
// — this hook only owns the pan/reposition piece, matching how EquipmentShelfItem/ChemicalBottle
// already compose gestures inline rather than sharing a wrapper component.
export const useDraggableBenchItem = ({ id, position, onMove, onDragChange }: Args) => {
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);
  const lastCheckTs = useSharedValue(0);
  // Lift-and-shadow feedback while dragging — matches the scale-up already used by the shelf
  // spawners (EquipmentShelfItem/ChemicalBottle), which this hook's callers previously lacked.
  const dragScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragScale.value = withSpring(1.06);
    })
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
      if (onDragChange) {
        const now = Date.now();
        if (now - lastCheckTs.value > 120) {
          lastCheckTs.value = now;
          runOnJS(onDragChange)();
        }
      }
    })
    .onEnd(() => {
      dragScale.value = withSpring(1);
      runOnJS(onMove)(id, { x: translateX.value, y: translateY.value });
      if (onDragChange) runOnJS(onDragChange)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: dragScale.value }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: interpolate(dragScale.value, [1, 1.06], [0, 0.2]),
    elevation: interpolate(dragScale.value, [1, 1.06], [0, 6]),
  }));

  return { translateX, translateY, panGesture, animatedStyle };
};
