import { Pressable, Text, View } from "react-native";
import { InteractiveBiologyElementProps } from "@/types/lab";

export default function InteractiveBiologyElement({
  xPct,
  yPct,
  label,
  active = false,
  showLabel = false,
  onPress,
}: InteractiveBiologyElementProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        alignItems: "center",
        transform: [{ translateX: -12 }, { translateY: -12 }],
      }}
    >
      <View
        className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
          active ? "bg-primary/20 border-primary" : "bg-white/70 border-slate-300"
        }`}
      >
        <View className={`w-2 h-2 rounded-full ${active ? "bg-primary" : "bg-slate-400"}`} />
      </View>
      {showLabel && (
        <View className="mt-1 bg-slate-900/80 rounded-full px-2 py-0.5">
          <Text className="text-white text-[10px] font-semibold">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
