import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, Check, CheckCircle2, Hammer, Search } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useChemicals } from "@/hooks/lab/use-chemicals";
import { useSubmitChemicalSelection } from "@/hooks/lab/use-lab-session";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import CompoundBuilder from "@/components/lab/chemicals/CompoundBuilder";
import { ChemicalType, SelectionResultType } from "@/types/lab";
import Button from "@/components/ui/Button";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
}) => {
  const isCorrect = isConfirmedCorrect || isBuilt;
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="flex-1 flex-row items-center gap-2 px-3 py-2.5 rounded-2xl border"
      style={[
        {
          backgroundColor: isCorrect ? "#ECFDF5" : isSelected ? `${colors.primary}0D` : "white",
          borderColor: isCorrect ? "#10B981" : isSelected ? colors.primary : colors.borderColorLight,
          borderWidth: isCorrect || isSelected ? 1.5 : 1,
          shadowColor: isCorrect ? "#10B981" : "transparent",
          shadowOpacity: isCorrect ? 0.15 : 0,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        },
        style,
      ]}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: item.color, borderWidth: 1, borderColor: "#00000022" }} />
      <Text className="font-amedium flex-1" style={{ color: colors.primaryBlack }} numberOfLines={1}>
        {item.name}
      </Text>
      {item.isBuildableFromElements && (
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: isBuilt ? "#10B98133" : isSelected ? "#FC6E2022" : "#FC6E2022" }}
        >
          {isBuilt ? <Check size={13} color="#10B981" /> : <Hammer size={12} color={colors.primary} />}
        </View>
      )}
    </AnimatedPressable>
  );
};

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
            router.replace(`/(tabs)/lab/${experimentId}/workspace?sessionId=${sessionId}` as never);
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
        <Text className="font-aregular text-muted mb-3">
          Select the elements and compounds you&apos;ll need for this practical.
        </Text>
        <View className="flex-row items-center border rounded-full px-4 gap-2 mb-3" style={{ borderColor: colors.borderColorLight }}>
          <Search size={16} color="#979797" />
          <TextInput
            className="flex-1 py-2 font-aregular"
            placeholder="Search chemicals..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
          <View className="mt-4 self-stretch">
            <Button label="Retry" onPress={() => refetch()} variant="secondary" />
          </View>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {elements.length > 0 && (
            <View className="mb-5">
              <Text className="font-amedium text-base mb-2 text-ink">Elements</Text>
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
              <Text className="font-amedium text-base mb-2 text-ink">Compounds</Text>
              <View className="flex-row items-center gap-1 mb-2">
                <Text className="font-aregular text-xs text-muted">Compounds marked</Text>
                <Hammer size={11} color="#FC6E20" />
                <Text className="font-aregular text-xs text-muted">open the Compound Builder — tap to construct them.</Text>
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
        <View className="mx-4 mt-3 p-4 rounded-2xl bg-amber-50 flex-row gap-2">
          <AlertTriangle size={18} color="#B45309" />
          <View className="flex-1">
            <Text className="font-amedium text-amber-900">
              {result.missingCount > 0
                ? `You're missing ${result.missingCount} chemical(s).`
                : result.missingBuildsCount > 0
                  ? `You still need to build ${result.missingBuildsCount} more compound(s).`
                  : "You've selected some chemicals this experiment doesn't need."}
            </Text>
            <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>
          </View>
        </View>
      )}

      {result?.complete && (
        <View className="mx-4 mt-3 p-4 rounded-2xl bg-emerald-50 flex-row items-center gap-2">
          <CheckCircle2 size={18} color="#059669" />
          <Text className="font-amedium text-emerald-800">Correct chemicals selected! Entering the workspace...</Text>
        </View>
      )}

      <View className="p-4">
        <Button
          label={
            submitMutation.isPending
              ? "Checking..."
              : blockedOnBuildsOnly
                ? `Build ${outstandingBuilds} more compound${outstandingBuilds > 1 ? "s" : ""} to continue`
                : "Confirm Selection"
          }
          onPress={handleSubmit}
          disabled={selected.length === 0 || submitMutation.isPending || blockedOnBuildsOnly}
          size="lg"
        />
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
