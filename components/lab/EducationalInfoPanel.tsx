import { Modal, ScrollView, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { ReactionResultType } from "@/types";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  result: ReactionResultType | null;
  onClose: () => void;
};

export default function EducationalInfoPanel({ result, onClose }: Props) {
  if (!result) return null;

  return (
    <Modal transparent animationType="slide" visible={!!result} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5" style={{ maxHeight: "75%" }}>
          <SheetHandle />
          <ScrollView showsVerticalScrollIndicator={false}>
            {result.found ? (
              <>
                <Text className="text-xl font-amedium text-ink">{result.reaction.name}</Text>
                <Text className="text-lg font-aregular mt-2" style={{ color: colors.primary }}>
                  {result.reaction.balancedEquation}
                </Text>
                <Text className="font-amedium mt-4 text-ink">Reaction Type</Text>
                <Text className="font-aregular text-muted">{result.reaction.reactionType}</Text>

                <Text className="font-amedium mt-4 text-ink">What Happened</Text>
                <Text className="font-aregular text-muted">{result.reaction.educationalInfo.explanation}</Text>

                <Text className="font-amedium mt-4 text-ink">Observable Changes</Text>
                {result.reaction.observableChanges.gasProduced && (
                  <Text className="font-aregular text-muted">
                    • Gas produced: {result.reaction.observableChanges.gasName}
                  </Text>
                )}
                {result.reaction.observableChanges.precipitateFormed && (
                  <Text className="font-aregular text-muted">
                    • Precipitate formed: {result.reaction.observableChanges.precipitateColor}
                  </Text>
                )}
                {result.reaction.observableChanges.heatProduced && (
                  <Text className="font-aregular text-muted">
                    • Energy change: {result.reaction.observableChanges.energyChange}
                  </Text>
                )}

                {result.reaction.educationalInfo.bondType && (
                  <>
                    <Text className="font-amedium mt-4 text-ink">Bond Type</Text>
                    <Text className="font-aregular text-muted">{result.reaction.educationalInfo.bondType}</Text>
                  </>
                )}

                {result.reaction.safetyNotes.length > 0 && (
                  <>
                    <Text className="font-amedium mt-4 text-ink">Safety Notes</Text>
                    {result.reaction.safetyNotes.map((note, i) => (
                      <Text key={i} className="font-aregular text-muted">
                        • {note}
                      </Text>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <Text className="text-xl font-amedium text-ink">No Reaction</Text>
                <Text className="font-aregular text-muted mt-2">{result.hint || result.explanation}</Text>
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
