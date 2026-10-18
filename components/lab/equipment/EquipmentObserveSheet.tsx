import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { EquipmentCatalogItem } from "@/constants/lab/equipment.constants";
import { EQUIPMENT_OBSERVE_DETAIL } from "@/constants/lab/equipment-observe.constants";
import SheetHandle from "@/components/ui/SheetHandle";

// "Observe" panel for the equipment-selection screen — a plain catalog description shown before
// the student has even picked equipment, distinct from EquipmentInspectPanel's live bench-instance
// data (temperature, contents) which only exists once an instance is actually on the bench.
//
// Educational restriction: this must never state or hint whether the item is needed for the
// current practical — the copy here (and in equipment-observe.constants.ts) is deliberately
// practical-agnostic.
export default function EquipmentObserveSheet({ item, onClose }: { item: EquipmentCatalogItem | null; onClose: () => void }) {
  if (!item) return null;
  const Visual = item.Visual;
  const detail = EQUIPMENT_OBSERVE_DETAIL[item.key];

  return (
    <Modal transparent animationType="slide" visible={!!item} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-white rounded-t-3xl pt-3 pb-5 px-5" style={{ maxHeight: "85%" }}>
          <SheetHandle />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View className="items-center pt-1 pb-3">
              <View className="w-28 h-28 rounded-2xl bg-slate-50 items-center justify-center">
                <Visual size={88} color={ICON_COLORS.slate600} />
              </View>
              <Text className="text-lg font-black text-slate-800 mt-3">{item.label}</Text>
            </View>

            <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">What is it?</Text>
            <Text className="text-[13px] text-slate-600 leading-5">{detail?.whatIsIt ?? item.description}</Text>

            {!!detail?.commonUses?.length && (
              <>
                <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-4 mb-1.5">Common uses</Text>
                <View className="gap-1.5">
                  {detail.commonUses.map((use) => (
                    <View key={use} className="flex-row gap-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                      <Text className="text-[13px] text-slate-600 leading-5 flex-1">{use}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!detail?.thinkPrompt && (
              <View className="flex-row gap-2 mt-4 p-3 rounded-2xl bg-primary/5">
                <Lightbulb size={16} color={ICON_COLORS.primary500} strokeWidth={2} />
                <View className="flex-1">
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-primary mb-0.5">Think</Text>
                  <Text className="text-[13px] text-slate-600 leading-5">{detail.thinkPrompt}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            className="mt-4 py-3 rounded-xl items-center bg-slate-100"
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text className="text-slate-700 text-sm font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
