import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { useChemicals } from "@/hooks/use-chemicals";
import { useSubmitChemicalSelection } from "@/hooks/use-lab-session";
import { ChemicalType, SelectionResultType } from "@/types";

export default function ChemicalSelection() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const [search, setSearch] = useState("");
  const { data: chemicals, isLoading, isError, refetch } = useChemicals({ search });
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SelectionResultType | null>(null);

  const submitMutation = useSubmitChemicalSelection(sessionId);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    submitMutation.mutate(selected, {
      onSuccess: (data) => {
        setResult(data);
        if (data.complete) {
          setTimeout(() => {
            router.replace(`/(tabs)/lab/chemistry/${experimentId}/workspace?sessionId=${sessionId}` as never);
          }, 900);
        }
      },
    });
  };

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <View className="px-4 pt-4">
        <Text className="font-aregular text-[#979797] mb-3">
          Select the chemicals you&apos;ll need for this practical.
        </Text>
        <TextInput
          className="border rounded-full px-4 py-2 font-aregular mb-3"
          style={{ borderColor: colors.borderColorLight }}
          placeholder="Search chemicals..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-lg font-amedium text-center" style={{ color: colors.primaryBlack }}>
            Couldn&apos;t reach the server
          </Text>
          <Pressable onPress={() => refetch()} className="mt-4 px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
            <Text className="text-white font-amedium">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={chemicals}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }: { item: ChemicalType }) => {
            const isSelected = selected.includes(item._id);
            const isConfirmedCorrect = result?.correct.includes(item._id);
            return (
              <Pressable
                onPress={() => toggle(item._id)}
                className="flex-1 flex-row items-center gap-2 px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: isSelected ? colors.primary : "white",
                  borderColor: isConfirmedCorrect ? "#4CAF50" : isSelected ? colors.primary : colors.borderColorLight,
                  borderWidth: isConfirmedCorrect ? 2 : 1,
                }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: item.color, borderWidth: 1, borderColor: "#00000022" }} />
                <Text className="font-amedium flex-1" style={{ color: isSelected ? "white" : colors.primaryBlack }} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {result && !result.complete && (
        <View className="mx-4 mt-3 p-4 rounded-xl bg-amber-50">
          <Text className="font-amedium text-amber-900">
            {result.missingCount > 0
              ? `You're missing ${result.missingCount} chemical(s).`
              : "You've selected some chemicals this experiment doesn't need."}
          </Text>
          <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>
        </View>
      )}

      {result?.complete && (
        <View className="mx-4 mt-3 p-4 rounded-xl bg-green-50">
          <Text className="font-amedium text-green-900">Correct chemicals selected! Entering the workspace...</Text>
        </View>
      )}

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
