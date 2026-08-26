import { Modal, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { EquipmentCatalogItem } from "@/constants/lab/equipment.constants";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

// "Observe" panel for the equipment-selection screen — a plain catalog description shown before
// the student has even picked equipment, distinct from EquipmentInspectPanel's live bench-instance
// data (temperature, contents) which only exists once an instance is actually on the bench.
export default function EquipmentObserveSheet({ item, onClose }: { item: EquipmentCatalogItem | null; onClose: () => void }) {
  if (!item) return null;
  const Visual = item.Visual;

  return (
    <Modal transparent animationType="slide" visible={!!item} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5">
          <SheetHandle />
          <View className="items-center py-2">
            <Visual size={72} color={colors.primaryBlack} />
            <Text className="text-xl font-amedium text-ink mt-3">{item.label}</Text>
            <Text className="font-aregular text-muted text-center mt-2">{item.description}</Text>
          </View>
          <View className="mt-4">
            <Button label="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
