import { Modal, ScrollView, Text, View } from "react-native";
import { ChemicalInspectPanelProps } from "@/types/lab";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1">
    <Text className="font-aregular text-muted">{label}</Text>
    <Text className="font-amedium text-ink">{value}</Text>
  </View>
);

// Tap-to-inspect panel for any chemical on the shelf or inside a container — all data is already
// in memory from the chemicals fetched for the workspace, so this needs no extra network round trip.
export default function ChemicalInspectPanel({ chemical, onClose }: ChemicalInspectPanelProps) {
  if (!chemical) return null;

  return (
    <Modal transparent animationType="slide" visible={!!chemical} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5" style={{ maxHeight: "75%" }}>
          <SheetHandle />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center gap-3 mb-3">
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: chemical.color,
                  borderWidth: 1,
                  borderColor: "#00000022",
                }}
              />
              <View>
                <Text className="text-xl font-amedium text-ink">{chemical.name}</Text>
                <Text className="font-aregular text-muted">
                  {chemical.symbol}
                  {chemical.formula ? ` • ${chemical.formula}` : ""}
                </Text>
              </View>
            </View>

            {chemical.atomicNumber != null && <Row label="Atomic Number" value={String(chemical.atomicNumber)} />}
            {chemical.atomicMass != null && <Row label="Atomic Mass" value={`${chemical.atomicMass} u`} />}
            {chemical.electronConfiguration && <Row label="Electron Configuration" value={chemical.electronConfiguration} />}
            {chemical.valency != null && <Row label="Valency" value={String(chemical.valency)} />}
            <Row label="State" value={chemical.state} />
            <Row label="Category" value={chemical.category} />
            {chemical.concentration && <Row label="Concentration" value={chemical.concentration} />}

            <Text className="font-amedium mt-4 mb-1 text-ink">Safety</Text>
            <Text className="font-aregular text-muted" style={{ textTransform: "capitalize" }}>
              {chemical.safetyClassification}
            </Text>
            {chemical.hazardInfo.map((h, i) => (
              <Text key={i} className="font-aregular text-muted">
                • {h}
              </Text>
            ))}

            {chemical.commonUses.length > 0 && (
              <>
                <Text className="font-amedium mt-4 mb-1 text-ink">Common Uses</Text>
                {chemical.commonUses.map((u, i) => (
                  <Text key={i} className="font-aregular text-muted">
                    • {u}
                  </Text>
                ))}
              </>
            )}
          </ScrollView>
          <View className="mt-4">
            <Button label="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
