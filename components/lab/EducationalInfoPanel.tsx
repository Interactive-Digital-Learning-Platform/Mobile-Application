import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { ReactionResultType } from "@/types";

type Props = {
  result: ReactionResultType | null;
  onClose: () => void;
};

export default function EducationalInfoPanel({ result, onClose }: Props) {
  if (!result) return null;

  return (
    <Modal transparent animationType="slide" visible={!!result} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View className="bg-white rounded-t-3xl p-5" style={{ maxHeight: "75%" }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderColorLight, alignSelf: "center", marginBottom: 12 }} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {result.found ? (
              <>
                <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
                  {result.reaction.name}
                </Text>
                <Text className="text-lg font-aregular mt-2" style={{ color: colors.primary }}>
                  {result.reaction.balancedEquation}
                </Text>
                <Text className="font-amedium mt-4">Reaction Type</Text>
                <Text className="font-aregular text-[#979797]">{result.reaction.reactionType}</Text>

                <Text className="font-amedium mt-4">What Happened</Text>
                <Text className="font-aregular text-[#979797]">{result.reaction.educationalInfo.explanation}</Text>

                <Text className="font-amedium mt-4">Observable Changes</Text>
                {result.reaction.observableChanges.gasProduced && (
                  <Text className="font-aregular text-[#979797]">
                    • Gas produced: {result.reaction.observableChanges.gasName}
                  </Text>
                )}
                {result.reaction.observableChanges.precipitateFormed && (
                  <Text className="font-aregular text-[#979797]">
                    • Precipitate formed: {result.reaction.observableChanges.precipitateColor}
                  </Text>
                )}
                {result.reaction.observableChanges.heatProduced && (
                  <Text className="font-aregular text-[#979797]">
                    • Energy change: {result.reaction.observableChanges.energyChange}
                  </Text>
                )}

                {result.reaction.educationalInfo.bondType && (
                  <>
                    <Text className="font-amedium mt-4">Bond Type</Text>
                    <Text className="font-aregular text-[#979797]">{result.reaction.educationalInfo.bondType}</Text>
                  </>
                )}

                {result.reaction.safetyNotes.length > 0 && (
                  <>
                    <Text className="font-amedium mt-4">Safety Notes</Text>
                    {result.reaction.safetyNotes.map((note, i) => (
                      <Text key={i} className="font-aregular text-[#979797]">
                        • {note}
                      </Text>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
                  No Reaction
                </Text>
                <Text className="font-aregular text-[#979797] mt-2">
                  {result.hint || result.explanation}
                </Text>
              </>
            )}
          </ScrollView>
          <Pressable
            onPress={onClose}
            className="mt-4 py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primaryBlack }}
          >
            <Text className="text-white font-amedium">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
