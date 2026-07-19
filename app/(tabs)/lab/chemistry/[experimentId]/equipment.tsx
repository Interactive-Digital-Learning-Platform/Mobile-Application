import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/labEquipment";
import { useExperiment } from "@/hooks/use-experiments";
import { useStartSession, useSubmitEquipmentSelection } from "@/hooks/use-lab-session";
import { SelectionResultType } from "@/types";

export default function EquipmentSelection() {
  const { experimentId } = useLocalSearchParams<{ experimentId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { mutate: startSession, data: session, isPending: startingSession, isError: sessionError } = useStartSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SelectionResultType | null>(null);

  const submitMutation = useSubmitEquipmentSelection(session?._id);

  useEffect(() => {
    if (experimentId) startSession(experimentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = () => {
    submitMutation.mutate(selected, {
      onSuccess: (data) => {
        setResult(data);
        if (data.complete) {
          setTimeout(() => {
            router.replace(`/(tabs)/lab/chemistry/${experimentId}/chemicals?sessionId=${session?._id}` as never);
          }, 900);
        }
      },
    });
  };

  if (experimentLoading || startingSession) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (experimentError || sessionError || !session) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center" style={{ color: colors.primaryBlack }}>
          Couldn&apos;t reach the server
        </Text>
        <Text className="font-aregular text-[#979797] text-center mt-2 mb-4">
          Check that the backend is running and reachable from this device.
        </Text>
        <Pressable onPress={() => startSession(experimentId)} className="px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
          <Text className="text-white font-amedium">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
          {experiment?.title}
        </Text>
        <Text className="font-aregular text-[#979797] mt-1 mb-4">
          Select the equipment you&apos;ll need for this practical before starting.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {LAB_EQUIPMENT_CATALOG.map((item) => {
            const isSelected = selected.includes(item.key);
            const isConfirmedCorrect = result?.correct.includes(item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => toggle(item.key)}
                className="px-4 py-2 rounded-full border"
                style={{
                  backgroundColor: isSelected ? colors.primary : "white",
                  borderColor: isConfirmedCorrect ? "#4CAF50" : isSelected ? colors.primary : colors.borderColorLight,
                  borderWidth: isConfirmedCorrect ? 2 : 1,
                }}
              >
                <Text className="font-amedium" style={{ color: isSelected ? "white" : colors.primaryBlack }}>
                  {isConfirmedCorrect ? "✓ " : ""}
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {result && !result.complete && (
          <View className="mt-5 p-4 rounded-xl bg-amber-50">
            <Text className="font-amedium text-amber-900">
              {result.missingCount > 0
                ? `You're missing ${result.missingCount} item(s).`
                : "You've selected some equipment this experiment doesn't need."}
            </Text>
            <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>
          </View>
        )}

        {result?.complete && (
          <View className="mt-5 p-4 rounded-xl bg-green-50">
            <Text className="font-amedium text-green-900">Correct equipment selected! Moving on...</Text>
          </View>
        )}
      </ScrollView>

      <View className="p-4">
        <Pressable
          onPress={handleSubmit}
          disabled={selected.length === 0 || submitMutation.isPending}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: colors.primaryBlack, opacity: selected.length === 0 ? 0.5 : 1 }}
        >
          <Text className="text-white font-amedium text-lg">
            {submitMutation.isPending ? "Checking..." : "Confirm Selection"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
