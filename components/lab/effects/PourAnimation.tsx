import { useEffect } from "react";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type Props = { color: string; onFinish?: () => void };

// A brief falling-stream animation, mounted for ~600ms by the parent when a chemical is dropped.
export default function PourAnimation({ color, onFinish }: Props) {
  const height = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    height.value = withTiming(60, { duration: 350 });
    opacity.value = withTiming(0, { duration: 600 }, (finished) => {
      if (finished && onFinish) runOnJS(onFinish)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -60,
          left: "50%",
          width: 4,
          marginLeft: -2,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}
