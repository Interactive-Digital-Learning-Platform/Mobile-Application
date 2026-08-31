import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { BiologyInfoSheetProps } from "@/types/lab";

// Doubles as both the tap-to-learn panel for a single component (opened with `selectedComponentId`
// set, pre-expanded) and the "Explore" list of every component in the visualization — one Modal,
// no separate list/detail screens (there's no sheet library in the app; matches LabTutorChat's
// Modal convention).
export default function BiologyInfoSheet({ visible, components, selectedComponentId, onClose }: BiologyInfoSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(selectedComponentId);

  useEffect(() => {
    if (visible) setExpandedId(selectedComponentId);
  }, [visible, selectedComponentId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-5" style={{ maxHeight: "70%" }} onPress={(e) => e.stopPropagation()}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-800">Explore this process</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={ICON_COLORS.slate600} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {components.map((component) => {
              const isOpen = expandedId === component.componentId;
              return (
                <Pressable
                  key={component.componentId}
                  onPress={() => setExpandedId(isOpen ? null : component.componentId)}
                  className="border-b border-slate-100 py-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-slate-800 text-base">{component.label}</Text>
                    {isOpen ? <ChevronUp size={18} color={ICON_COLORS.slate400} /> : <ChevronDown size={18} color={ICON_COLORS.slate400} />}
                  </View>
                  {isOpen && <Text className="text-slate-500 text-sm mt-2 leading-5">{component.shortInfo}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
