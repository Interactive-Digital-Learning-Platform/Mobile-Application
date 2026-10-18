import { ComponentType } from "react";
import { ScrollView, Text, View } from "react-native";
import { EquipmentVisualProps } from "@/types/lab";
import EquipmentShelfItem from "@/components/lab/equipment/EquipmentShelfItem";

type ShelfEquipment = { key: string; label: string; Visual: ComponentType<EquipmentVisualProps> };

// Top equipment shelf — the full Chemistry (or Physics) catalog for this experiment's subject,
// horizontally scrollable. It deliberately does NOT filter to "correct" equipment: the student
// still has to reason about what they need (equipment selection was a preparation step, not a gate).
export default function LabEquipmentShelf({
  items,
  resolveBenchPosition,
  onDropped,
  onHoverChange,
}: {
  items: ShelfEquipment[];
  resolveBenchPosition: (x: number, y: number) => Promise<{ x: number; y: number } | null>;
  onDropped: (equipmentType: string, position: { x: number; y: number }) => void;
  onHoverChange: (over: boolean) => void;
}) {
  return (
    <View className="py-2.5 bg-white border-b border-slate-100">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-4 mb-2">
        Equipment · drag an item onto the bench
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {items.map((e) => (
          <EquipmentShelfItem
            key={e.key}
            equipmentType={e.key}
            label={e.label}
            Visual={e.Visual}
            resolveBenchPosition={resolveBenchPosition}
            onDroppedOnBench={onDropped}
            onHoverChange={onHoverChange}
          />
        ))}
      </ScrollView>
    </View>
  );
}
