import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, CheckCircle2, ChevronLeft, Hammer, Info, Lightbulb, Search } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useExperiment } from "@/hooks/lab/use-experiments";
import { useChemicals } from "@/hooks/lab/use-chemicals";
import { useSubmitChemicalSelection } from "@/hooks/lab/use-lab-session";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import CompoundBuilder from "@/components/lab/chemicals/CompoundBuilder";
import MaterialArtwork, { displaySymbol } from "@/components/lab/chemicals/MaterialArtwork";
import MaterialObserveSheet from "@/components/lab/chemicals/MaterialObserveSheet";
import { ChemicalType, SelectionResultType } from "@/types/lab";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SUCCESS = "#10B981";
const SUCCESS_DARK = "#047857";
const FILTERS = ["All", "Elements", "Compounds", "Buildable"] as const;
type Filter = (typeof FILTERS)[number];

const selectionHaptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const SelectDot = ({ selected }: { selected: boolean }) => (
  <View style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
    {selected ? (
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: SUCCESS, alignItems: "center", justifyContent: "center" }}>
        <Check size={14} color="#fff" strokeWidth={3} />
      </View>
    ) : (
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1" }} />
    )}
  </View>
);

const ObserveButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={(e) => {
      e.stopPropagation();
      onPress();
    }}
    hitSlop={{ top: 8, bottom: 10, left: 14, right: 14 }}
    className="flex-row items-center justify-center gap-1 mt-2 py-1"
  >
    <Info size={13} color={ICON_COLORS.slate500} strokeWidth={2} />
    <Text className="text-[11px] font-bold text-slate-500">Observe</Text>
  </Pressable>
);

const cardStyle = (selected: boolean) => ({
  width: "48%" as const,
  borderRadius: 18,
  borderWidth: selected ? 2 : 1,
  borderColor: selected ? SUCCESS : "#E2E8F0",
  backgroundColor: selected ? "#ECFDF5" : "#FFFFFF",
  paddingTop: 12,
  paddingBottom: 8,
  paddingHorizontal: 8,
  ...(selected
    ? { shadowColor: SUCCESS, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }
    : {}),
});

const ElementCard = ({
  item,
  selected,
  onToggle,
  onObserve,
}: {
  item: ChemicalType;
  selected: boolean;
  onToggle: () => void;
  onObserve: () => void;
}) => {
  const { style, onPressIn, onPressOut } = usePressScale(0.96);
  return (
    <AnimatedPressable
      onPress={onToggle}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.name}
      style={[cardStyle(selected), style]}
    >
      <SelectDot selected={selected} />
      <View style={{ height: 108, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        <MaterialArtwork chemical={item} size={102} />
      </View>
      <Text className="text-[13px] font-bold text-center text-slate-800 mt-2" numberOfLines={2} style={{ minHeight: 32, lineHeight: 16 }}>
        {item.name}
      </Text>
      <Text className="text-[11px] font-semibold text-center text-slate-400 mt-0.5">
        {displaySymbol(item)}
        {item.atomicNumber != null ? ` · No. ${item.atomicNumber}` : ""}
      </Text>
      <ObserveButton onPress={onObserve} />
    </AnimatedPressable>
  );
};

const SAFETY_TONE: Record<string, { bg: string; text: string }> = {
  corrosive: { bg: "bg-rose-100", text: "text-rose-700" },
  hazardous: { bg: "bg-rose-100", text: "text-rose-700" },
  toxic: { bg: "bg-rose-100", text: "text-rose-700" },
  flammable: { bg: "bg-amber-100", text: "text-amber-700" },
  caution: { bg: "bg-amber-100", text: "text-amber-700" },
};

const CompoundCard = ({
  item,
  selected,
  built,
  onPress,
  onObserve,
}: {
  item: ChemicalType;
  selected: boolean;
  built: boolean;
  onPress: () => void;
  onObserve: () => void;
}) => {
  const { style, onPressIn, onPressOut } = usePressScale(0.96);
  const safety = SAFETY_TONE[item.safetyClassification];
  const isBuildable = !!item.isBuildableFromElements;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole={isBuildable ? "button" : "checkbox"}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.name}
      style={[{ ...cardStyle(selected || built), backgroundColor: selected || built ? "#ECFDF5" : "#F8FAFC" }, style]}
    >
      <SelectDot selected={selected || built} />
      <View style={{ height: 72, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        <MaterialArtwork chemical={item} size={62} />
      </View>
      <Text className="text-[13px] font-bold text-center text-slate-800 mt-2" numberOfLines={2} style={{ minHeight: 32, lineHeight: 16 }}>
        {item.name}
      </Text>
      {!!item.formula && <Text className="text-[11px] font-semibold text-center text-slate-400 mt-0.5">{item.formula}</Text>}

      <View className="flex-row flex-wrap justify-center gap-1 mt-1.5">
        {safety && (
          <View className={`px-2 py-0.5 rounded-full ${safety.bg}`}>
            <Text className={`text-[10px] font-bold capitalize ${safety.text}`}>{item.safetyClassification}</Text>
          </View>
        )}
        {isBuildable && !built && (
          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
            <Hammer size={10} color={ICON_COLORS.primary500} strokeWidth={2.5} />
            <Text className="text-[10px] font-bold text-primary">Build from Elements</Text>
          </View>
        )}
        {built && (
          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100">
            <Check size={10} color={SUCCESS_DARK} strokeWidth={3} />
            <Text className="text-[10px] font-bold text-emerald-700">Built</Text>
          </View>
        )}
      </View>

      <ObserveButton onPress={onObserve} />
    </AnimatedPressable>
  );
};

const SectionHeading = ({ title, caption, count }: { title: string; caption?: string; count: number }) => (
  <View className="mb-2 mt-1">
    <View className="flex-row items-center gap-2">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</Text>
      <View className="px-1.5 py-0.5 rounded-full bg-slate-100">
        <Text className="text-[10px] font-bold text-slate-500">{count}</Text>
      </View>
    </View>
    {!!caption && <Text className="text-[11px] font-medium text-slate-400 mt-0.5">{caption}</Text>}
  </View>
);

export default function ChemicalSelection() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const { data: experiment } = useExperiment(experimentId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const { data: chemicals, isLoading, isError, refetch } = useChemicals({ search });
  const [selected, setSelected] = useState<string[]>([]);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [builderTarget, setBuilderTarget] = useState<ChemicalType | null>(null);
  const [observeItem, setObserveItem] = useState<ChemicalType | null>(null);
  const [result, setResult] = useState<SelectionResultType | null>(null);

  const submitMutation = useSubmitChemicalSelection(sessionId);

  const elements = useMemo(
    () =>
      (chemicals || [])
        .filter((c) => c.chemicalType === "element")
        .sort((a, b) => (a.atomicNumber ?? 999) - (b.atomicNumber ?? 999)),
    [chemicals]
  );
  const compounds = useMemo(() => (chemicals || []).filter((c) => c.chemicalType === "compound"), [chemicals]);

  const showElements = filter === "All" || filter === "Elements";
  const visibleCompounds =
    filter === "Elements" ? [] : filter === "Buildable" ? compounds.filter((c) => c.isBuildableFromElements) : compounds;

  const toggle = (id: string) => {
    selectionHaptic();
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
    if (selected.length > 0) handleSubmit();
  };

  // Once only a build is outstanding, resubmitting the same selection can't help — the button
  // reflects that instead of inviting a dead click.
  const incompleteResult = result && !result.complete ? result : null;
  const blockedOnBuildsOnly = !!incompleteResult && incompleteResult.missingCount === 0 && incompleteResult.missingBuildsCount > 0;
  const outstandingBuilds = incompleteResult?.missingBuildsCount ?? 0;
  const canConfirm = selected.length > 0 && !submitMutation.isPending && !blockedOnBuildsOnly;

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
            {experiment?.subject ?? "Chemistry"} Practical
          </Text>
          <Text className="text-base font-black text-slate-800" numberOfLines={1}>
            {experiment?.title ?? "Choose your materials"}
          </Text>
        </View>
      </View>

      {/* Search + filters */}
      <View className="px-4 pt-3 pb-2 bg-white border-b border-slate-100">
        <View className="flex-row items-center gap-2 px-3.5 rounded-xl bg-slate-100">
          <Search size={15} color={ICON_COLORS.slate400} strokeWidth={2} />
          <TextInput
            className="flex-1 py-2.5 text-[14px] text-slate-800"
            placeholder="Search name, symbol or formula…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View className="flex-row gap-2 mt-2.5">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                className={`px-3 py-1.5 rounded-xl border ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-white"}`}
                activeOpacity={0.8}
                onPress={() => setFilter(f)}
              >
                <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-slate-600"}`}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={ICON_COLORS.primary500} />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t reach the server</Text>
          <Text className="text-sm text-slate-500 text-center leading-5 mt-2 mb-4">Check your connection and try again.</Text>
          <TouchableOpacity className="bg-primary px-6 py-3 rounded-xl" activeOpacity={0.85} onPress={() => refetch()}>
            <Text className="text-white text-sm font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-lg font-black text-slate-800 mb-1">Choose your materials</Text>
          <Text className="text-[12px] text-slate-500 leading-4 mb-3">
            Select the elements and compounds you think you&apos;ll need. You can select more than one.
          </Text>

          {showElements && elements.length > 0 && (
            <View className="mb-5">
              <SectionHeading title="Elements" caption="Periodic-table elements" count={elements.length} />
              <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
                {elements.map((item) => (
                  <ElementCard
                    key={item._id}
                    item={item}
                    selected={selected.includes(item._id)}
                    onToggle={() => toggle(item._id)}
                    onObserve={() => setObserveItem(item)}
                  />
                ))}
              </View>
            </View>
          )}

          {visibleCompounds.length > 0 && (
            <View className="mb-5">
              <SectionHeading
                title={filter === "Buildable" ? "Buildable compounds" : "Compounds"}
                caption="Laboratory substances — tap a buildable one to construct it"
                count={visibleCompounds.length}
              />
              <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
                {visibleCompounds.map((item) => (
                  <CompoundCard
                    key={item._id}
                    item={item}
                    selected={selected.includes(item._id)}
                    built={builtIds.includes(item._id)}
                    onPress={() => (item.isBuildableFromElements ? setBuilderTarget(item) : toggle(item._id))}
                    onObserve={() => setObserveItem(item)}
                  />
                ))}
              </View>
            </View>
          )}

          {(showElements ? elements.length : 0) + visibleCompounds.length === 0 && (
            <View className="items-center py-16">
              <Text className="text-slate-800 font-black text-base text-center mb-1">Nothing matches</Text>
              <Text className="text-slate-500 text-sm text-center">Try a different search or filter.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Feedback */}
      {result && !result.complete && (
        <View className="mx-4 mb-1 p-3 rounded-2xl bg-amber-50 flex-row gap-2">
          <Lightbulb size={15} color="#B45309" strokeWidth={2} />
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-amber-900">
              {blockedOnBuildsOnly ? "Finish building to continue" : "Not quite complete yet"}
            </Text>
            <Text className="text-[12px] text-amber-800 leading-4 mt-0.5">{result.hint}</Text>
          </View>
        </View>
      )}
      {result?.complete && (
        <View className="mx-4 mb-1 p-3 rounded-2xl bg-emerald-50 flex-row items-center gap-2">
          <CheckCircle2 size={16} color="#059669" />
          <Text className="text-[13px] font-bold text-emerald-800">Materials confirmed — entering the workspace…</Text>
        </View>
      )}

      {/* Sticky bottom */}
      <View className="border-t border-slate-100 bg-white px-4 pt-3 pb-2">
        <Text className="text-[13px] font-semibold text-slate-500 mb-2.5">
          Selected materials: <Text className="font-black text-slate-800">{selected.length}</Text>
        </Text>
        <TouchableOpacity
          disabled={!canConfirm}
          onPress={handleSubmit}
          activeOpacity={0.85}
          className={`py-3.5 rounded-xl items-center ${canConfirm ? "bg-primary" : "bg-slate-200"}`}
        >
          <Text className={`text-base font-bold ${canConfirm ? "text-white" : "text-slate-400"}`}>
            {submitMutation.isPending
              ? "Checking…"
              : blockedOnBuildsOnly
                ? `Build ${outstandingBuilds} more compound${outstandingBuilds > 1 ? "s" : ""} to continue`
                : "Confirm Selection"}
          </Text>
        </TouchableOpacity>
      </View>

      <MaterialObserveSheet chemical={observeItem} onClose={() => setObserveItem(null)} />

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
