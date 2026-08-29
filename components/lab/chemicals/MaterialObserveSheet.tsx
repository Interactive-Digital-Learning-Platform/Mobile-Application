import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChemicalType } from "@/types/lab";
import MaterialArtwork, { displaySymbol } from "@/components/lab/chemicals/MaterialArtwork";
import SheetHandle from "@/components/ui/SheetHandle";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1.5 border-b border-slate-100">
    <Text className="text-[13px] text-slate-400">{label}</Text>
    <Text className="text-[13px] font-semibold text-slate-700 text-right flex-1 ml-4" numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const Section = ({ title }: { title: string }) => (
  <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-4 mb-1.5">{title}</Text>
);

// Grade 10/11 electron-behaviour note, derived from curated valency + category (not invented).
const bondingNote = (c: ChemicalType): string | null => {
  if (c.chemicalType !== "element" || c.valency == null || c.valency === 0) return null;
  const n = `${c.valency} electron${c.valency > 1 ? "s" : ""}`;
  if (c.category === "metal") return `${c.name} tends to lose ${n} when it forms compounds.`;
  if (c.category === "non-metal" || c.category === "gas") return `${c.name} tends to gain or share ${n} when it forms compounds.`;
  return null;
};

// "Observe" sheet for the chemical-selection screen. Educational orientation only — it must never
// state or hint whether the material is required for the current practical.
export default function MaterialObserveSheet({ chemical, onClose }: { chemical: ChemicalType | null; onClose: () => void }) {
  if (!chemical) return null;
  const isElement = chemical.chemicalType === "element";
  const note = bondingNote(chemical);

  return (
    <Modal transparent animationType="slide" visible={!!chemical} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-white rounded-t-3xl pt-3 pb-5 px-5" style={{ maxHeight: "88%" }}>
          <SheetHandle />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View className="items-center pt-1 pb-3">
              <View className="w-32 h-32 rounded-2xl bg-slate-50 items-center justify-center">
                <MaterialArtwork chemical={chemical} size={104} />
              </View>
              <Text className="text-lg font-black text-slate-800 mt-3">{chemical.name}</Text>
              <Text className="text-[13px] font-semibold text-slate-400 mt-0.5">
                {displaySymbol(chemical)}
                {!isElement && chemical.formula && chemical.formula !== chemical.symbol ? ` · ${chemical.formula}` : ""}
              </Text>
              <View className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-100">
                <Text className="text-[11px] font-bold text-slate-500 capitalize">{isElement ? "Element" : "Laboratory compound"}</Text>
              </View>
            </View>

            <Section title={isElement ? "Element data" : "Substance data"} />
            {isElement && chemical.atomicNumber != null && <Row label="Atomic number" value={String(chemical.atomicNumber)} />}
            {isElement && chemical.atomicMass != null && <Row label="Relative atomic mass" value={String(chemical.atomicMass)} />}
            {!isElement && chemical.formula && <Row label="Formula" value={chemical.formula} />}
            <Row label="State at room temp." value={chemical.state} />
            <Row label="Category" value={chemical.category} />
            {isElement && chemical.electronConfiguration && (
              <Row label="Electron arrangement" value={chemical.electronConfiguration.split(",").join(", ")} />
            )}
            {chemical.concentration && <Row label="Concentration" value={chemical.concentration} />}
            <Row label="Safety" value={chemical.safetyClassification} />

            {chemical.hazardInfo.length > 0 && (
              <>
                <Section title="Safety notes" />
                <View className="gap-1.5">
                  {chemical.hazardInfo.map((h) => (
                    <View key={h} className="flex-row gap-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                      <Text className="text-[13px] text-slate-600 leading-5 flex-1">{h}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {chemical.commonUses.length > 0 && (
              <>
                <Section title="Common uses" />
                <View className="gap-1.5">
                  {chemical.commonUses.map((u) => (
                    <View key={u} className="flex-row gap-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                      <Text className="text-[13px] text-slate-600 leading-5 flex-1">{u}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {note && (
              <View className="flex-row gap-2 mt-4 p-3 rounded-2xl bg-primary/5">
                <Lightbulb size={16} color={ICON_COLORS.primary500} strokeWidth={2} />
                <View className="flex-1">
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-primary mb-0.5">Grade 10–11 note</Text>
                  <Text className="text-[13px] text-slate-600 leading-5">{note}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity className="mt-4 py-3 rounded-xl items-center bg-slate-100" activeOpacity={0.8} onPress={onClose}>
            <Text className="text-slate-700 text-sm font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
