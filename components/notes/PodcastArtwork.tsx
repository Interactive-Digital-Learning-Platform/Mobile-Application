import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { Headphones } from "lucide-react-native";
import { colors } from "@/constants/colors";

/** Decorative playback motion; these bars do not represent measured audio samples. */
export default function PodcastArtwork({ playing }: { playing: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReducedMotion(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    const app = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  const moving = playing && foreground && !reducedMotion;
  useEffect(() => {
    pulse.setValue(0);
    if (!moving) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [moving, pulse]);

  const bars = (heights: number[], side: string) =>
    heights.map((height, i) => (
      <Animated.View
        key={`${side}-${i}`}
        style={[
          s.wave,
          {
            height,
            opacity: 0.4 + (i % 4) * 0.15,
            transform: [
              {
                scaleY: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [1, 0.45] : [0.6, 1.15],
                }),
              },
            ],
          },
        ]}
      />
    ));
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={s.art}
    >
      {bars([14, 26, 37, 22, 44, 30], "left")}
      <Animated.View
        style={[
          s.headphones,
          {
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.07],
                }),
              },
              {
                rotate: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-3deg", "3deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Headphones size={37} color={colors.primary} />
      </Animated.View>
      {bars([30, 44, 22, 37, 26, 14], "right")}
    </View>
  );
}

const s = StyleSheet.create({
  art: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 92,
  },
  wave: { width: 4, backgroundColor: colors.primary, borderRadius: 3 },
  headphones: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
