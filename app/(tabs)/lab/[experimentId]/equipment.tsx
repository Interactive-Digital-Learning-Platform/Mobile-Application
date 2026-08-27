import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, CheckCircle2, ChevronLeft, Info, Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LAB_EQUIPMENT_CATALOG, EquipmentCatalogItem } from "@/constants/lab/equipment.constants";
import { useExperiment } from "@/hooks/lab/use-experiments";
import { useStartSession, useSubmitChemicalSelection, useSubmitEquipmentSelection } from "@/hooks/lab/use-lab-session";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { EquipmentSelectionResultType } from "@/types/lab";
import SheetHandle from "@/components/ui/SheetHandle";
import EquipmentObserveSheet from "@/components/lab/equipment/EquipmentObserveSheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SUCCESS = "#10B981"; // emerald-500 — the existing "selected/success" accent for this flow
const SUCCESS_DARK = "#047857"; // emerald-700

const selectionHaptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const EquipmentCard = ({
  item,
  isSelected,
  locked,
  onToggle,
  onObserve,
}: {
  item: EquipmentCatalogItem;
  isSelected: boolean;
  locked: boolean;
  onToggle: () => void;
  onObserve: () => void;
}) => {
  const { style, onPressIn, onPressOut } = usePressScale(0.96);
  const Visual = item.Visual;

  return (
    <AnimatedPressable
      onPress={locked ? undefined : onToggle}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: locked }}
      accessibilityLabel={item.label}
      style={[
        {
          width: "31.5%",
          borderRadius: 18,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? SUCCESS : "#E2E8F0",
          backgroundColor: isSelected ? "#ECFDF5" : "#FFFFFF",
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 6,
          ...(isSelected
            ? { shadowColor: SUCCESS, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }
            : {}),
        },
        style,
      ]}
    >
      <View style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
        {isSelected ? (
          <View
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: SUCCESS, alignItems: "center", justifyContent: "center" }}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1" }} />
        )}
      </View>

      <View style={{ height: 76, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        <Visual size={60} color={isSelected ? SUCCESS_DARK : "#334155"} />
      </View>

      <Text
        className="text-[12px] font-bold text-center text-slate-800"
        numberOfLines={2}
        style={{ minHeight: 30, marginTop: 8, lineHeight: 15 }}
      >
        {item.label}
      </Text>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onObserve();
        }}
        hitSlop={{ top: 8, bottom: 10, left: 14, right: 14 }}
        className="flex-row items-center justify-center gap-1 mt-2 py-1"
      >
        <Info size={13} color={ICON_COLORS.slate500} strokeWidth={2} />
        <Text className="text-[11px] font-bold text-slate-500">Observe</Text>
      </Pressable>
    </AnimatedPressable>
  );
};

export default function EquipmentSelection() {
  const { experimentId } = useLocalSearchParams<{ experimentId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { mutate: startSession, data: session, isPending: startingSession, isError: sessionError } = useStartSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<EquipmentSelectionResultType | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [observeItem, setObserveItem] = useState<EquipmentCatalogItem | null>(null);
  // The submission result drives an inline popup; `result` itself stays around after the popup is
  // dismissed (it flips the footer button to "Continue" and locks the grid), so this is its own
  // dismiss-only flag.
  const [showResultModal, setShowResultModal] = useState(false);

  const submitMutation = useSubmitEquipmentSelection(session?._id);
  const chemicalSelectionMutation = useSubmitChemicalSelection(session?._id);
  // Physics experiments never have any requiredChemicals, so their chemical-selection screen has
  // nothing to select and is skipped: an empty selection is auto-submitted straight to the workspace.
  const isPhysicsExperiment = experiment?.subject === "Physics";

  useEffect(() => {
    if (experimentId) startSession(experimentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  // startSession can resume an existing in_progress session that's already past this phase — jump
  // to wherever it actually left off instead of filling this screen out against a stale phase.
  useEffect(() => {
    if (!session || session.phase === "equipment_selection") return;
    if (session.phase === "chemical_selection" && isPhysicsExperiment) {
      chemicalSelectionMutation.mutate([], {
        onSuccess: () => router.replace(`/(tabs)/lab/${experimentId}/workspace?sessionId=${session._id}` as never),
      });
      return;
    }
    const target =
      session.phase === "chemical_selection" ? "chemicals" : session.phase === "procedure" ? "workspace" : "report";
    router.replace(`/(tabs)/lab/${experimentId}/${target}?sessionId=${session._id}` as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, experimentId, isPhysicsExperiment]);

  const equipment = useMemo(
    () =>
      LAB_EQUIPMENT_CATALOG.filter(
        (item) => !!experiment && item.subjects.includes(experiment.subject as "Chemistry" | "Physics" | "Biology")
      ),
    [experiment]
  );

  const toggle = (key: string) => {
    selectionHaptic();
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = () => {
    setSubmitError(null);

    // The backend advances the session out of "equipment_selection" on the first submission
    // (feedback-only, not a gate) — a second press must NOT resubmit; just move to the next phase.
    if (result) {
      if (isPhysicsExperiment) {
        chemicalSelectionMutation.mutate([], {
          onSuccess: () => router.replace(`/(tabs)/lab/${experimentId}/workspace?sessionId=${session?._id}` as never),
        });
      } else {
        router.replace(`/(tabs)/lab/${experimentId}/chemicals?sessionId=${session?._id}` as never);
      }
      return;
    }

    submitMutation.mutate(selected, {
      onSuccess: (data) => {
        setResult(data);
        setShowResultModal(true);
      },
      onError: () => {
        setSubmitError("Couldn't check your selection. Check your connection and try again.");
      },
    });
  };

  if (experimentLoading || startingSession) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  if (experimentError || sessionError || !session) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["top", "bottom"]}>
        <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t reach the server</Text>
        <Text className="text-sm text-slate-500 text-center leading-5 mt-2 mb-4">
          Check that the backend is running and reachable from this device.
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl"
          activeOpacity={0.85}
          onPress={() => startSession(experimentId)}
        >
          <Text className="text-white text-sm font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const canConfirm = selected.length > 0 && !submitMutation.isPending;
  const footerActive = canConfirm || !!result;

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
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
            {experiment?.title}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-lg font-black text-slate-800 mb-2">Choose your equipment</Text>

        {/* Guidance — not a warning */}
        <View className="flex-row gap-3 p-3 rounded-2xl mb-2.5" style={{ backgroundColor: "#FEF3E2" }}>
          <View className="items-center justify-center rounded-full" style={{ width: 30, height: 30, backgroundColor: "#FDE4C0" }}>
            <Lightbulb size={15} color={ICON_COLORS.primary500} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-slate-800">Think about what you&apos;ll need</Text>
            <Text className="text-[12px] text-slate-600 leading-4 mt-0.5">
              Pick the equipment you think is suitable for this practical. You can select more than one.
            </Text>
          </View>
        </View>

        {/* Observe hint — secondary */}
        <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{ backgroundColor: "#F1F5F9" }}>
          <Info size={14} color={ICON_COLORS.slate500} strokeWidth={2} />
          <Text className="text-[12px] text-slate-500 flex-1 leading-4">
            <Text className="font-bold text-slate-600">Unsure about an item? </Text>
            Tap Observe to learn what it&apos;s used for.
          </Text>
        </View>

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
          {equipment.map((item) => (
            <EquipmentCard
              key={item.key}
              item={item}
              isSelected={selected.includes(item.key)}
              locked={!!result}
              onToggle={() => toggle(item.key)}
              onObserve={() => setObserveItem(item)}
            />
          ))}
        </View>

        {submitError && (
          <View className="mt-4 p-3 rounded-2xl bg-rose-50 flex-row gap-2">
            <Info size={16} color="#B91C1C" strokeWidth={2} />
            <Text className="text-[13px] font-semibold text-rose-800 flex-1">{submitError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom action area */}
      <View className="border-t border-slate-100 bg-white px-4 pt-3 pb-2">
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-[13px] font-semibold text-slate-500">
            Selected equipment: <Text className="font-black text-slate-800">{selected.length}</Text>
          </Text>
        </View>
        <TouchableOpacity
          disabled={!footerActive}
          onPress={handleSubmit}
          activeOpacity={0.85}
          className={`py-3.5 rounded-xl items-center ${footerActive ? "bg-primary" : "bg-slate-200"}`}
        >
          <Text className={`text-base font-bold ${footerActive ? "text-white" : "text-slate-400"}`}>
            {submitMutation.isPending ? "Checking…" : result ? "Continue" : "Confirm Selection"}
          </Text>
        </TouchableOpacity>
      </View>

      <EquipmentObserveSheet item={observeItem} onClose={() => setObserveItem(null)} />

      <Modal transparent animationType="slide" visible={showResultModal} onRequestClose={() => setShowResultModal(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
          <View className="bg-white rounded-t-3xl p-5 pb-7">
            <SheetHandle />
            <View className="items-center py-1">
              <View
                className="items-center justify-center mb-3 rounded-full"
                style={{ width: 56, height: 56, backgroundColor: result?.fullyCorrect ? "#ECFDF5" : "#FFF7ED" }}
              >
                {result?.fullyCorrect ? (
                  <CheckCircle2 size={26} color="#059669" />
                ) : (
                  <Lightbulb size={24} color={ICON_COLORS.primary500} />
                )}
              </View>
              <Text className="text-lg font-black text-slate-800 text-center">
                {result?.fullyCorrect ? "Your selection looks complete" : "Good start"}
              </Text>
              <Text className="text-[13px] text-slate-500 text-center leading-5 mt-1.5">
                {result?.fullyCorrect
                  ? "You've picked the tools you'll need. Press Continue when you're ready."
                  : "Some of your choices will be useful in the lab. Think about how you'll measure, hold, and transfer each substance during the practical — you can still add tools from the equipment drawer once you're inside."}
              </Text>
              {!result?.fullyCorrect && !!result?.hint && (
                <View className="flex-row gap-2 mt-3 p-3 rounded-2xl bg-amber-50 self-stretch">
                  <Lightbulb size={15} color="#B45309" strokeWidth={2} />
                  <Text className="text-[13px] text-amber-800 leading-5 flex-1">{result.hint}</Text>
                </View>
              )}
            </View>
            <View className="flex-row gap-2 mt-4">
              {!result?.fullyCorrect && (
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl items-center border border-slate-200"
                  activeOpacity={0.8}
                  onPress={() => setShowResultModal(false)}
                >
                  <Text className="text-slate-600 text-sm font-bold">Review selection</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center bg-primary"
                activeOpacity={0.85}
                onPress={() => {
                  setShowResultModal(false);
                  handleSubmit();
                }}
              >
                <Text className="text-white text-sm font-bold">Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
