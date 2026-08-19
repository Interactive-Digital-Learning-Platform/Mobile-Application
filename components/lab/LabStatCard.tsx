import { Text, View } from "react-native";
import Card from "@/components/ui/Card";
import { LabStatCardProps } from "@/types/lab";

export default function LabStatCard({ label, value, subValue, icon: Icon, color = "#FC6E20" }: LabStatCardProps) {
  return (
    <Card padding="md" className="flex-1">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-amedium text-muted text-xs" numberOfLines={1}>
          {label}
        </Text>
        {Icon && (
          <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: `${color}22` }}>
            <Icon size={14} color={color} />
          </View>
        )}
      </View>
      <Text className="text-2xl font-abold text-ink" numberOfLines={1}>
        {value}
      </Text>
      {subValue && (
        <Text className="font-aregular text-muted text-xs mt-0.5" numberOfLines={1}>
          {subValue}
        </Text>
      )}
    </Card>
  );
}
