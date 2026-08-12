import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface StatTileProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgClass: string;
  label: string;
  value: string | number;
}

export default function StatTile({
  icon: Icon, iconColor, iconBgClass, label, value,
}: StatTileProps) {
  return (
    <View className="flex-1 bg-white rounded-[18px] border border-slate-100 items-center py-3.5">
      <View className={`w-10 h-10 rounded-full items-center justify-center ${iconBgClass}`}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <Text className="text-slate-800 font-black text-base mt-1.5">{value}</Text>
      <Text
        className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-0.5"
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
