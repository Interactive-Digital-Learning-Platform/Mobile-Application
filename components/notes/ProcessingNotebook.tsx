import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { Sparkles, Star } from "lucide-react-native";

const MESSAGES = ["One page at a time. You’ve got this!", "Big ideas can start with little notes.", "Curiosity is your superpower!", "Keep learning. Keep wondering."];

/** Decorative motion never represents analysis completion or estimated time. */
export default function ProcessingNotebook() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  const [taps, setTaps] = useState(0);
  const float = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const burstAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const moving = !reducedMotion && foreground;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    const app = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { mounted = false; motion.remove(); app.remove(); burstAnimation.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!moving) {
      float.setValue(0);
      burstAnimation.current?.stop();
      burst.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [moving, float, burst]);

  const cheer = () => {
    setTaps(value => value + 1);
    if (!moving) return;
    burstAnimation.current?.stop();
    burst.setValue(0);
    burstAnimation.current = Animated.timing(burst, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false });
    burstAnimation.current.start();
  };

  return (
    <View style={s.wrap}>
      <View style={s.scene}>
        <View style={s.halo} />
        <Animated.View pointerEvents="none" accessible={false} style={[s.spark, s.sparkLeft, { opacity: float.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }), transform: [{ rotate: float.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "12deg"] }) }] }]}><Star size={22} color="#FFF7ED" fill="#FED7AA" /></Animated.View>
        <Animated.View pointerEvents="none" accessible={false} style={[s.spark, s.sparkRight, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]}><Sparkles size={25} color="#FFF7ED" /></Animated.View>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [3, -7] }) }, { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "4deg"] }) }] }}>
          <TouchableOpacity onPress={cheer} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Cheer on your notebook" accessibilityHint="Shows a new encouraging message">
            <View style={s.notebook}>
              <View style={s.binding}>{[0, 1, 2, 3].map(i => <View key={i} style={s.ring} />)}</View>
              <View style={s.paper}>
                <View style={s.rule} /><View style={[s.rule, { width: 32 }]} />
                <View style={s.face}><View style={s.eye} /><View style={s.eye} /></View>
                <View style={s.smile} />
                <View style={s.cheekLeft} /><View style={s.cheekRight} />
              </View>
              <Star size={16} color="#FFFFFF" fill="#FFFFFF" style={s.coverStar} />
            </View>
          </TouchableOpacity>
        </Animated.View>
        {[-1, 0, 1].map((direction, i) => <Animated.View key={i} pointerEvents="none" accessible={false} style={[s.burst, { opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, direction * 85] }) }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [-20, -65 - (i % 2) * 22] }) }, { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] }]}><Star size={20} color="#FFFFFF" fill={i === 1 ? "#FFF7ED" : "#FED7AA"} /></Animated.View>)}
      </View>
      <Text style={s.hint} accessibilityLiveRegion="polite">{taps ? MESSAGES[(taps - 1) % MESSAGES.length] : "Tap your study buddy for a little cheer"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 8, width: "100%" },
  scene: { height: 128, width: 240, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 140, height: 128, borderRadius: 70, backgroundColor: "rgba(255, 255, 255, 0.22)" },
  spark: { position: "absolute" }, sparkLeft: { left: 20, top: 27 }, sparkRight: { right: 22, top: 65 },
  notebook: { width: 88, height: 108, borderRadius: 13, backgroundColor: "#EA580C", padding: 10, paddingLeft: 16, borderWidth: 2, borderColor: "#C2410C" },
  binding: { position: "absolute", left: -7, top: 13, gap: 12 }, ring: { width: 15, height: 6, borderRadius: 3, backgroundColor: "#FDBA74", borderWidth: 1, borderColor: "#9A3412" },
  paper: { height: 68, backgroundColor: "#FFFDF5", borderRadius: 7, padding: 9 }, rule: { height: 3, width: 23, borderRadius: 2, backgroundColor: "#FED7AA", marginBottom: 5 },
  face: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 5, marginTop: 3 }, eye: { width: 5, height: 7, borderRadius: 3, backgroundColor: "#713F12" },
  smile: { width: 14, height: 8, borderBottomWidth: 2, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: "#713F12", borderBottomLeftRadius: 9, borderBottomRightRadius: 9, alignSelf: "center", marginTop: 2 },
  cheekLeft: { position: "absolute", left: 6, bottom: 16, width: 8, height: 4, borderRadius: 4, backgroundColor: "#FDBAA5" }, cheekRight: { position: "absolute", right: 6, bottom: 16, width: 8, height: 4, borderRadius: 4, backgroundColor: "#FDBAA5" },
  coverStar: { alignSelf: "flex-end", marginTop: 4 }, burst: { position: "absolute", left: 110, top: 48 },
  hint: { fontSize: 11, lineHeight: 17, color: "#431407", textAlign: "center", marginTop: 4 },
});
