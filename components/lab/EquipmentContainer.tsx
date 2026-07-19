import { forwardRef, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { ChemicalType } from "@/types";
import BubbleEffect from "./effects/BubbleEffect";
import SteamEffect from "./effects/SteamEffect";
import PourAnimation from "./effects/PourAnimation";

type Props = {
  id: string;
  label: string;
  position: { x: number; y: number };
  chemicals: ChemicalType[];
  heated: boolean;
  isBurner: boolean;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onPress?: () => void;
};

const EquipmentContainer = forwardRef<View, Props>(
  ({ id, label, position, chemicals, heated, isBurner, onMove, onPress }, ref) => {
    const translateX = useSharedValue(position.x);
    const translateY = useSharedValue(position.y);

    const pan = Gesture.Pan()
      .onChange((e) => {
        translateX.value += e.changeX;
        translateY.value += e.changeY;
      })
      .onEnd(() => {
        runOnJS(onMove)(id, { x: translateX.value, y: translateY.value });
      });

    const tap = Gesture.Tap().onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

    // Race, not Simultaneous: Pan requires movement to activate, so a stationary tap
    // resolves via the Tap gesture instead of being swallowed by the drag handler.
    const gesture = Gesture.Race(pan, tap);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));

    const liquidColor = chemicals[chemicals.length - 1]?.color || "transparent";
    const hasLiquid = chemicals.length > 0;

    const [isPouring, setIsPouring] = useState(false);
    const prevCount = useRef(chemicals.length);
    useEffect(() => {
      if (chemicals.length > prevCount.current) setIsPouring(true);
      prevCount.current = chemicals.length;
    }, [chemicals.length]);

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          ref={ref}
          style={[
            {
              position: "absolute",
              width: 110,
              height: 130,
              alignItems: "center",
            },
            animatedStyle,
          ]}
        >
          <View
            style={{
              width: 72,
              height: 84,
              borderWidth: 2,
              borderColor: colors.primaryBlack,
              borderTopWidth: 0,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              backgroundColor: "rgba(255,255,255,0.5)",
              overflow: "hidden",
              justifyContent: "flex-end",
            }}
          >
            {hasLiquid && (
              <View
                style={{
                  width: "100%",
                  height: "60%",
                  backgroundColor: liquidColor,
                  opacity: 0.75,
                }}
              />
            )}
            {hasLiquid && <BubbleEffect active={heated} />}
            {heated && <SteamEffect />}
            {isPouring && <PourAnimation color={liquidColor} onFinish={() => setIsPouring(false)} />}
          </View>
          <Text className="font-amedium text-xs mt-1" style={{ color: colors.primaryBlack }}>
            {label}
          </Text>
          {isBurner && (
            <View
              style={{
                width: 40,
                height: 8,
                marginTop: 2,
                borderRadius: 4,
                backgroundColor: heated ? "#FF6B35" : "#D9D9D9",
              }}
            />
          )}
        </Animated.View>
      </GestureDetector>
    );
  }
);

EquipmentContainer.displayName = "EquipmentContainer";

export default EquipmentContainer;
