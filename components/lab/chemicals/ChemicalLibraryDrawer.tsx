import { useEffect } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { CLOSED_OFFSET, DRAWER_HEIGHT, OPEN_OFFSET, PEEK_HEIGHT } from "@/constants/lab/chemicals.constants";
import { ChemicalLibraryDrawerProps } from "@/types/lab";
import ChemicalBottle from "./ChemicalBottle";

export default function ChemicalLibraryDrawer({
  chemicals,
  isOpen,
  onToggle,
  search,
  onSearchChange,
  resolveDropTarget,
  onDropped,
}: ChemicalLibraryDrawerProps) {
  const translateY = useSharedValue(CLOSED_OFFSET);

  useEffect(() => {
    translateY.value = withTiming(isOpen ? OPEN_OFFSET : CLOSED_OFFSET, { duration: 250 });
  }, [isOpen, translateY]);

  const handleTap = Gesture.Tap().onEnd(() => {
    runOnJS(onToggle)(!isOpen);
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: -PEEK_HEIGHT,
          left: 0,
          right: 0,
          height: DRAWER_HEIGHT + PEEK_HEIGHT,
          backgroundColor: "white",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={handleTap}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderColorLight }} />
          <Text className="font-amedium text-sm mt-1" style={{ color: colors.primaryBlack }}>
            Chemical Library
          </Text>
        </View>
      </GestureDetector>

      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          className="border rounded-full px-4 py-2 font-aregular"
          style={{ borderColor: colors.borderColorLight }}
          placeholder="Search chemicals..."
          value={search}
          onChangeText={onSearchChange}
        />
      </View>

      <FlatList
        data={chemicals}
        keyExtractor={(item) => item._id}
        numColumns={4}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <ChemicalBottle chemical={item} resolveDropTarget={resolveDropTarget} onDropped={onDropped} />
        )}
      />
    </Animated.View>
  );
}
