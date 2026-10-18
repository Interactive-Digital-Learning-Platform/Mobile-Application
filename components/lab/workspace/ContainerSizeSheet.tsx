import { Text, TouchableOpacity, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

// Shown right after a resizable container (test tube, beaker, flask, measuring cylinder) is
// dropped on the bench — the student picks the vessel's capacity before it's placed.
export default function ContainerSizeSheet({
  label,
  options,
  onPick,
  onCancel,
}: {
  label: string;
  options: number[];
  onPick: (capacity: number) => void;
  onCancel: () => void;
}) {
  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(160)}
      className="absolute left-3 right-3 bottom-3 bg-white rounded-2xl p-4 border border-slate-200"
      style={{ shadowColor: "#0F172A", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
    >
      <Text className="text-[13px] font-bold text-slate-800">Choose a {label.toLowerCase()} size</Text>
      <Text className="text-[11px] text-slate-400 mt-0.5 mb-3">Pick the capacity that suits the amount you&apos;ll be working with.</Text>

      <View className="flex-row flex-wrap gap-2">
        {options.map((ml) => (
          <TouchableOpacity
            key={ml}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
            activeOpacity={0.8}
            onPress={() => onPick(ml)}
          >
            <Text className="text-[13px] font-bold text-slate-700">{ml} mL</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity className="mt-3 self-start" onPress={onCancel} activeOpacity={0.7}>
        <Text className="text-[12px] font-semibold text-slate-400">Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
