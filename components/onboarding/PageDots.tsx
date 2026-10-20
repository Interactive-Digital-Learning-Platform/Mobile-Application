import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

const DOT = 8;
const ACTIVE_DOT = 24;

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  // The active dot stretches into an orange pill; neighbours shrink back as the page scrolls.
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [DOT, ACTIVE_DOT, DOT], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, range, ["#FFCCA8", "#FC6E20", "#FFCCA8"]),
  }));
  return <Animated.View style={[{ height: DOT, borderRadius: DOT / 2 }, style]} />;
}

export default function PageDots({ count, width, scrollX }: { count: number; width: number; scrollX: SharedValue<number> }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} width={width} scrollX={scrollX} />
      ))}
    </View>
  );
}
