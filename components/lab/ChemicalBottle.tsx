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
};

export default function ChemicalBottle({ chemical, resolveDropTarget, onDropped }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleDrop = async (x: number, y: number) => {
    const targetId = await resolveDropTarget(x, y);
    if (targetId) onDropped(chemical, targetId);
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
