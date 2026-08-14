import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ChemicalType } from "@/types";

type Props = {
  chemical: ChemicalType;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropped: (chemical: ChemicalType, equipmentId: string) => void;
  onInspect?: (chemical: ChemicalType) => void;
  // Fired (throttled to ~120ms, matching useDraggableBenchItem's own throttle) with the
  // currently-hovered equipment id while dragging, and null once not over a valid target or on
  // drop — drives the dashed hover highlight on the corresponding EquipmentContainer.
  onHoverChange?: (targetId: string | null) => void;
};

export default function ChemicalBottle({ chemical, resolveDropTarget, onDropped, onInspect, onHoverChange }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastCheckTs = useSharedValue(0);

  const checkHover = (x: number, y: number) => {
    resolveDropTarget(x, y).then((id) => onHoverChange?.(id));
  };

  const handleDrop = async (x: number, y: number) => {
    const targetId = await resolveDropTarget(x, y);
    if (targetId) onDropped(chemical, targetId);
    onHoverChange?.(null);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.15);
    })
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
      if (onHoverChange) {
        const now = Date.now();
        if (now - lastCheckTs.value > 120) {
          lastCheckTs.value = now;
          runOnJS(checkHover)(e.absoluteX, e.absoluteY);
        }
      }
    })
    .onEnd((e) => {
      scale.value = withSpring(1);
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (onInspect) runOnJS(onInspect)(chemical);
  });

  // Race, not Simultaneous: Pan requires movement to activate, so a stationary tap resolves via
  // the Tap gesture instead of being swallowed by the drag handler (same pattern as EquipmentContainer).
  const gesture = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: translateX.value !== 0 || translateY.value !== 0 ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ alignItems: "center", width: 72 }, animatedStyle]}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: chemical.color,
            borderWidth: 1.5,
            borderColor: "#00000022",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text className="font-amedium text-xs">{chemical.symbol}</Text>
        </View>
        <Text className="font-aregular text-[10px] mt-1 text-center" numberOfLines={1}>
          {chemical.name}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
