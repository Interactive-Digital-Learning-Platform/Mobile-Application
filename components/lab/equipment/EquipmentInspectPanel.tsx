import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { EquipmentInspectPanelProps } from "@/types/lab";
import SheetHandle from "@/components/ui/SheetHandle";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1.5 border-b border-slate-100">
    <Text className="text-[13px] text-slate-400">{label}</Text>
    <Text className="text-[13px] font-semibold text-slate-700 text-right flex-1 ml-4">{value}</Text>
  </View>
);

// Long-press-to-inspect panel for a bench equipment instance — everything shown here already
// lives in the LabRun state fetched for the workspace, so no extra network call is needed and
// nothing is computed/invented client-side.
export default function EquipmentInspectPanel({ instance, chemicalMap, friendlyName, onClose, onRemove }: EquipmentInspectPanelProps) {
  if (!instance) return null;

  const handleRemove = () => {
    Alert.alert("Remove equipment", "Remove this item from the bench? Anything inside it will be lost.", [
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

  const title =
    friendlyName || LAB_EQUIPMENT_CATALOG.find((e) => e.key === instance.equipmentType)?.label || instance.equipmentType;

  const totalVolume = instance.contents.reduce((s, c) => s + (c.volume ?? 0), 0);
  const totalMass = instance.contents.reduce((s, c) => s + (c.mass ?? 0), 0);
  const ph = instance.lastMeasurement?.measurementType === "ph" ? instance.lastMeasurement.value : null;

  return (
    <Modal transparent animationType="slide" visible={!!instance} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-white rounded-t-3xl pt-3 pb-5 px-5" style={{ maxHeight: "78%" }}>
          <SheetHandle />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text className="text-lg font-black text-slate-800">{title}</Text>

            <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-4 mb-1.5">State</Text>
            {instance.capacity != null && <Row label="Capacity" value={`${instance.capacity} mL`} />}
            <Row label="Temperature" value={`${instance.temperature}°C${instance.isHeated ? " · heating" : ""}`} />
            {totalVolume > 0 && <Row label="Volume" value={`${totalVolume} mL`} />}
            {totalMass > 0 && <Row label="Mass" value={`${totalMass} g`} />}
            {ph != null && <Row label="pH" value={ph.toFixed(1)} />}

            <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-4 mb-1.5">Contents</Text>
            {instance.contents.length === 0 ? (
              <Text className="text-[13px] text-slate-400 py-1">Empty</Text>
            ) : (
              instance.contents.map((c, i) => {
                const chem = chemicalMap[c.chemical];
                return (
                  <View key={i} className="flex-row items-center gap-2 py-1.5 border-b border-slate-100">
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: chem?.color || "#cbd5e1" }} />
                    <Text className="text-[13px] text-slate-700 flex-1">{chem?.name || "Unknown"}</Text>
                    <Text className="text-[12px] font-semibold text-slate-400">
                      {c.volume != null ? `${c.volume} mL` : c.mass != null ? `${c.mass} g` : "—"}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View className="flex-row gap-2 mt-4">
            {onRemove && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl border border-rose-200"
                activeOpacity={0.8}
                onPress={handleRemove}
              >
                <Trash2 size={15} color="#E11D48" strokeWidth={2} />
                <Text className="text-rose-600 text-sm font-bold">Remove</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity className="flex-1 py-3 rounded-xl items-center bg-slate-100" activeOpacity={0.8} onPress={onClose}>
              <Text className="text-slate-700 text-sm font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
