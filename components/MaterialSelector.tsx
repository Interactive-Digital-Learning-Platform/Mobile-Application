import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Check } from "lucide-react-native";

interface MaterialSelectorProps {
  allMaterials: string[];
  selectedMaterials: string[];
  onToggle: (material: string) => void;
  subjectColor: string;
}

export default function MaterialSelector({
  allMaterials,
  selectedMaterials,
  onToggle,
  subjectColor,
}: MaterialSelectorProps) {
  return (
    <View className="flex-1">
      <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-[#E3E1E1]">
        <Text className="text-xl font-asemibold text-[#0F172A] mb-2">
          Prepare Your Workbench
        </Text>
        <Text className="text-sm font-aregular text-[#6B7280] mb-4">
          Select the materials you need for this experiment from the lab storage.
        </Text>

        <View className="flex-row flex-wrap gap-3">
          {allMaterials.map((material) => {
            const isSelected = selectedMaterials.includes(material);
            return (
              <Pressable
                key={material}
                onPress={() => onToggle(material)}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl border ${
                  isSelected ? "border-transparent" : "border-[#E3E1E1] bg-white"
                }`}
                style={isSelected ? { backgroundColor: subjectColor } : {}}
              >
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center border ${
                    isSelected ? "border-white/40 bg-white/20" : "border-[#979797]"
                  }`}
                >
                  {isSelected && <Check size={12} color="white" />}
                </View>
                <Text
                  className={`text-sm font-amedium ${
                    isSelected ? "text-white" : "text-[#374151]"
                  }`}
                >
                  {material}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedMaterials.length > 0 && (
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <Text className="text-blue-800 text-xs font-asemibold mb-1 uppercase">
            Workbench Summary
          </Text>
          <Text className="text-blue-600 text-sm font-aregular">
            You have selected {selectedMaterials.length} item(s). Ensure you haven't missed any essential tools.
          </Text>
        </View>
      )}
    </View>
  );
}
