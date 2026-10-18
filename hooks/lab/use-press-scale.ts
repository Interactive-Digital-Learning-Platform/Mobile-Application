import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

// Shared press-scale feedback for interactive elements too lightweight to warrant the full
// components/ui/Card or Button primitives (dense selection chips, etc.) — same spring config
// those primitives already use internally, extracted so bare Pressables can share it too.
export const usePressScale = (to = 0.97) => {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 15, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return { style, onPressIn, onPressOut };
};
