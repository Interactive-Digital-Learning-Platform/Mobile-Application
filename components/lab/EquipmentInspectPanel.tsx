import { Alert, Modal, ScrollView, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { ChemicalType, EquipmentInstanceType } from "@/types";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/labEquipment";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  instance: EquipmentInstanceType | null;
  chemicalMap: Record<string, ChemicalType>;
  onClose: () => void;
  // Long-press-to-inspect doubles as "select this equipment" — removing it from here (rather
  // than a separate selection UI) reuses that existing gesture instead of adding a new one.
  onRemove?: (instanceId: string) => void;
};

// Long-press-to-inspect panel for a bench equipment instance — everything shown here already
// lives in the LabRun state fetched for the workspace, so no extra network call is needed.
export default function EquipmentInspectPanel({ instance, chemicalMap, onClose, onRemove }: Props) {
  if (!instance) return null;

  const handleRemove = () => {
    Alert.alert("Remove Equipment", "Remove this item from the bench? Anything inside it will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          onRemove?.(instance.instanceId);
          onClose();
        },
      },
    ]);
  };

  const label = LAB_EQUIPMENT_CATALOG.find((e) => e.key === instance.equipmentType)?.label || instance.equipmentType;

  return (
    <Modal transparent animationType="slide" visible={!!instance} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5" style={{ maxHeight: "75%" }}>
          <SheetHandle />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-xl font-amedium text-ink">{label}</Text>

            <View className="flex-row justify-between py-1 mt-3">
              <Text className="font-aregular text-muted">Temperature</Text>
              <Text className="font-amedium text-ink">
                {instance.temperature}°C{instance.isHeated ? " (heating)" : ""}
              </Text>
            </View>

            {instance.lastMeasurement?.value != null && (
              <View className="flex-row justify-between py-1">
                <Text className="font-aregular text-muted">Last Measurement</Text>
                <Text className="font-amedium text-ink">
                  {instance.lastMeasurement.measurementType === "ph" ? "pH " : ""}
                  {instance.lastMeasurement.value.toFixed(1)}
                </Text>
              </View>
            )}

            <Text className="font-amedium mt-4 mb-1 text-ink">Contents</Text>
            {instance.contents.length === 0 ? (
              <Text className="font-aregular text-muted">Empty</Text>
            ) : (
              instance.contents.map((c, i) => {
                const chem = chemicalMap[c.chemical];
                return (
                  <View key={i} className="flex-row items-center gap-2 py-1">
                    <View
                      style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: chem?.color || "#ccc" }}
                    />
                    <Text className="font-aregular flex-1 text-ink">{chem?.name || "Unknown"}</Text>
                    <Text className="font-aregular text-muted">
                      {c.volume != null ? `${c.volume} mL` : c.mass != null ? `${c.mass} g` : "—"}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
          <View className="flex-row gap-3 mt-4">
            {onRemove && (
              <View className="flex-1">
                <Button label="Remove" onPress={handleRemove} variant="danger" icon={Trash2} />
              </View>
            )}
            <View className="flex-1">
              <Button label="Close" onPress={onClose} variant="secondary" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
