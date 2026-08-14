import { useEffect, useRef } from "react";
import { Animated as RNAnimated, StyleSheet, View } from "react-native";

function Piece({ delay, x }: { delay: number; x: number }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const rotate = useRef(new RNAnimated.Value(0)).current;

  const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899", "#F97316"];
  const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size   = Math.random() * 8 + 6;
  const isRect = Math.random() > 0.5;

  useEffect(() => {
    RNAnimated.sequence([
      RNAnimated.delay(delay),
      RNAnimated.parallel([
        RNAnimated.timing(opacity,     { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(translateY,  { toValue: Math.random() * 550 + 250, duration: 1800, useNativeDriver: true }),
        RNAnimated.timing(rotate,      { toValue: Math.random() * 20 - 10, duration: 1800, useNativeDriver: true }),
      ]),
      RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const rotateInterp = rotate.interpolate({ inputRange: [-10, 10], outputRange: ["-360deg", "360deg"] });

  return (
    <RNAnimated.View
      style={[
        {
          position: "absolute",
          top: -20,
          left: x,
          width: size,
          height: isRect ? size * 0.4 : size,
          backgroundColor: color,
          borderRadius: isRect ? 2 : size / 2,
          opacity,
          transform: [{ translateY }, { rotate: rotateInterp }],
        },
      ]}
    />
  );
}

interface ConfettiViewProps {
  count?: number;
}

export default function ConfettiView({ count = 60 }: ConfettiViewProps) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 380,
    delay: Math.random() * 1200,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(p => (
        <Piece key={p.id} x={p.x} delay={p.delay} />
      ))}
    </View>
  );
}
