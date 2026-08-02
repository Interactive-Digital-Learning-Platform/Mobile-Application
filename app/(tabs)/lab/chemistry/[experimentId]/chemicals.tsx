import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Hammer } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useChemicals } from "@/hooks/use-chemicals";
import { useSubmitChemicalSelection } from "@/hooks/use-lab-session";
import CompoundBuilder from "@/components/lab/CompoundBuilder";
import { ChemicalType, SelectionResultType } from "@/types";

// Compounds flagged isBuildableFromElements are constructed via the Compound Builder rather than
// selected directly — tapping one opens the builder instead of toggling a plain select chip.
const ChemicalChip = ({
  item,
  isSelected,
  isConfirmedCorrect,
  isBuilt,
  onPress,
}: {
  item: ChemicalType;
  isSelected: boolean;
  isConfirmedCorrect: boolean;
  isBuilt: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="flex-1 flex-row items-center gap-2 px-3 py-2 rounded-xl border"
    style={{
      backgroundColor: isBuilt ? "#E8F5E9" : isSelected ? colors.primary : "white",
      borderColor: isConfirmedCorrect || isBuilt ? "#4CAF50" : isSelected ? colors.primary : colors.borderColorLight,
      borderWidth: isConfirmedCorrect || isBuilt ? 2 : 1,
    }}
  >
    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: item.color, borderWidth: 1, borderColor: "#00000022" }} />
    <Text
      className="font-amedium flex-1"
      style={{ color: isBuilt ? "#2E7D32" : isSelected ? "white" : colors.primaryBlack }}
      numberOfLines={1}
    >
      {item.name}
    </Text>
    {item.isBuildableFromElements && (
      <View
        className="w-6 h-6 rounded-full items-center justify-center"
        style={{ backgroundColor: isBuilt ? "#4CAF5033" : isSelected ? "#FFFFFF33" : "#FC6E2022" }}
      >
        {isBuilt ? <Check size={13} color="#2E7D32" /> : <Hammer size={12} color={isSelected ? "white" : "#FC6E20"} />}
      </View>
    )}
  </Pressable>
);

const ChemicalGrid = ({
  items,
  selected,
  correct,
  builtIds,
  onToggle,
  onBuildTap,
}: {
  items: ChemicalType[];
  selected: string[];
  correct: string[];
  builtIds: string[];
  onToggle: (id: string) => void;
  onBuildTap: (item: ChemicalType) => void;
}) => (
  <View className="flex-row flex-wrap gap-[10px]">
    {items.map((item) => (
      <View key={item._id} style={{ width: "47%" }}>
        <ChemicalChip
          item={item}
          isSelected={selected.includes(item._id)}
          isConfirmedCorrect={correct.includes(item._id)}
          isBuilt={builtIds.includes(item._id)}
          onPress={() => (item.isBuildableFromElements ? onBuildTap(item) : onToggle(item._id))}
        />
      </View>
    ))}
  </View>
);

export default function ChemicalSelection() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const [search, setSearch] = useState("");
  const { data: chemicals, isLoading, isError, refetch } = useChemicals({ search });
  const [selected, setSelected] = useState<string[]>([]);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [builderTarget, setBuilderTarget] = useState<ChemicalType | null>(null);
  const [result, setResult] = useState<SelectionResultType | null>(null);

  const submitMutation = useSubmitChemicalSelection(sessionId);

  const elements = useMemo(() => (chemicals || []).filter((c) => c.chemicalType === "element"), [chemicals]);
  const compounds = useMemo(() => (chemicals || []).filter((c) => c.chemicalType === "compound"), [chemicals]);

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

  const handleBuilt = (compoundId: string) => {
    setBuiltIds((prev) => (prev.includes(compoundId) ? prev : [...prev, compoundId]));
    // Re-check completeness right away so a student who was only blocked on this build sees
    // entry unblock automatically, instead of having to tap "Confirm Selection" again themselves.
    if (selected.length > 0) handleSubmit();
  };

  // Once every selectable chemical is accounted for and only a build is outstanding, resubmitting
  // the same selection can't help — the button reflects that instead of inviting a dead click.
  const incompleteResult = result && !result.complete ? result : null;
  const blockedOnBuildsOnly = !!incompleteResult && incompleteResult.missingCount === 0 && incompleteResult.missingBuildsCount > 0;
  const outstandingBuilds = incompleteResult?.missingBuildsCount ?? 0;

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <View className="px-4 pt-4">
        <Text className="font-aregular text-[#979797] mb-3">
          Select the elements and compounds you&apos;ll need for this practical.
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
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {elements.length > 0 && (
            <View className="mb-5">
              <Text className="font-amedium text-base mb-2" style={{ color: colors.primaryBlack }}>
                Elements
              </Text>
              <ChemicalGrid
                items={elements}
                selected={selected}
                correct={result?.correct || []}
                builtIds={builtIds}
                onToggle={toggle}
                onBuildTap={setBuilderTarget}
              />
            </View>
          )}

          {compounds.length > 0 && (
            <View className="mb-5">
              <Text className="font-amedium text-base mb-2" style={{ color: colors.primaryBlack }}>
                Compounds
              </Text>
              <View className="flex-row items-center gap-1 mb-2">
                <Text className="font-aregular text-xs text-[#979797]">Compounds marked</Text>
                <Hammer size={11} color="#FC6E20" />
                <Text className="font-aregular text-xs text-[#979797]">open the Compound Builder — tap to construct them.</Text>
              </View>
              <ChemicalGrid
                items={compounds}
                selected={selected}
                correct={result?.correct || []}
                builtIds={builtIds}
                onToggle={toggle}
                onBuildTap={setBuilderTarget}
              />
            </View>
          )}

          <View className="h-4" />
        </ScrollView>
      )}

      {result && !result.complete && (
        <View className="mx-4 mt-3 p-4 rounded-xl bg-amber-50">
          <Text className="font-amedium text-amber-900">
            {result.missingCount > 0
              ? `You're missing ${result.missingCount} chemical(s).`
              : result.missingBuildsCount > 0
                ? `You still need to build ${result.missingBuildsCount} more compound(s).`
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
          disabled={selected.length === 0 || submitMutation.isPending || blockedOnBuildsOnly}
          className="py-3 rounded-xl items-center"
          style={{
            backgroundColor: colors.primaryBlack,
            opacity: selected.length === 0 || blockedOnBuildsOnly ? 0.5 : 1,
          }}
        >
          <Text className="text-white font-amedium text-lg">
            {submitMutation.isPending
              ? "Checking..."
              : blockedOnBuildsOnly
                ? `Build ${outstandingBuilds} more compound${outstandingBuilds > 1 ? "s" : ""} to continue`
                : "Confirm Selection"}
          </Text>
        </Pressable>
      </View>

      {builderTarget && (
        <CompoundBuilder
          experimentId={experimentId}
          sessionId={sessionId}
          compoundId={builderTarget._id}
          onClose={() => setBuilderTarget(null)}
          onBuilt={handleBuilt}
        />
      )}
    </SafeAreaView>
  );
}
