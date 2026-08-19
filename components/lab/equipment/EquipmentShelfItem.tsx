import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { EquipmentShelfItemProps } from "@/types/lab";

// Draggable "spawner" for the equipment shelf — dragging one of these onto the bench creates a
// brand new equipment instance there. Distinct from EquipmentContainer, which represents an
// equipment instance already placed on the bench (and is itself draggable to reposition).
export default function EquipmentShelfItem({ equipmentType, label, Visual, resolveBenchPosition, onDroppedOnBench, onHoverChange }: EquipmentShelfItemProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastCheckTs = useSharedValue(0);

  const checkHover = (x: number, y: number) => {
    resolveBenchPosition(x, y).then((pos) => onHoverChange?.(!!pos));
  };

  const handleDrop = async (x: number, y: number) => {
    const benchPosition = await resolveBenchPosition(x, y);
    if (benchPosition) onDroppedOnBench(equipmentType, benchPosition);
    onHoverChange?.(false);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const pan = Gesture.Pan()
    // Items sit in a horizontal ScrollView, and dropping one onto the bench below is a vertical
    // drag — so only activate on vertical movement, and explicitly release horizontal movement to
    // the ScrollView, otherwise every swipe-to-scroll attempt gets swallowed as a drag instead.
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: translateX.value !== 0 || translateY.value !== 0 ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>
        <View
          className="flex-row items-center gap-2 px-3 py-2 rounded-full border"
          style={{ borderColor: colors.borderColorLight }}
        >
          <Visual size={16} color={colors.primary} />
          <Text className="font-amedium text-xs" style={{ color: colors.primaryBlack }}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
