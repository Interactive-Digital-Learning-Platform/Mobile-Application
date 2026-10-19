import { Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { Trash2, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChemicalType, EquipmentInstanceType } from "@/types/lab";

type Props = {
  instance: EquipmentInstanceType;
  title: string;
  chemicalMap: Record<string, ChemicalType>;
  onCancel: () => void;
  onConfirm: () => void;
};

// In-app replacement for the native "Remove equipment" Alert. Rendered as an overlay inside the
// inspect panel's Modal (not a nested Modal) so it stacks reliably on both iOS and Android.
export default function RemoveEquipmentConfirm({ instance, title, chemicalMap, onCancel, onConfirm }: Props) {
  const contents = instance.contents;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      className="absolute inset-0 justify-center items-center px-8"
      style={{ backgroundColor: "rgba(15,23,42,0.55)" }}
    >
      <Pressable className="absolute inset-0" onPress={onCancel} />

      <Animated.View
        entering={ZoomIn.duration(180)}
        exiting={ZoomOut.duration(120)}
        className="w-full bg-white rounded-3xl p-5 border border-slate-200"
        style={{ shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <View className="items-center">
          <View className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 items-center justify-center">
            <Trash2 size={22} color={ICON_COLORS.rose600} strokeWidth={2} />
          </View>
          <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-3">Remove equipment</Text>
          <Text className="text-lg font-black text-slate-800 text-center mt-0.5" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-[13px] text-slate-500 text-center leading-5 mt-1">
            This item will be taken off your lab bench.
          </Text>
        </View>

        {contents.length > 0 && (
          <View className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl px-3.5 py-3">
            <View className="flex-row items-center gap-1.5">
              <TriangleAlert size={14} color={ICON_COLORS.amber600} strokeWidth={2.2} />
              <Text className="text-[12px] font-bold text-amber-700">Its contents will be lost</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {contents.map((c, i) => {
                const chem = chemicalMap[c.chemical];
                return (
                  <View key={i} className="flex-row items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-amber-100">
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chem?.color || "#cbd5e1" }} />
                    <Text className="text-[11px] font-semibold text-slate-600">{chem?.name || "Unknown"}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className="flex-row gap-2 mt-5">
          <TouchableOpacity className="flex-1 py-3 rounded-xl items-center bg-slate-100" activeOpacity={0.8} onPress={onCancel}>
            <Text className="text-slate-700 text-sm font-bold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-600"
            activeOpacity={0.85}
            onPress={onConfirm}
          >
            <Trash2 size={15} color={ICON_COLORS.white} strokeWidth={2} />
            <Text className="text-white text-sm font-bold">Remove</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
