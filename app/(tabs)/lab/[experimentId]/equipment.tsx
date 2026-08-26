import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, Check, CheckCircle2, Info, Lightbulb, XCircle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG, EquipmentCatalogItem } from "@/constants/lab/equipment.constants";
import { useExperiment } from "@/hooks/lab/use-experiments";
import { useStartSession, useSubmitChemicalSelection, useSubmitEquipmentSelection } from "@/hooks/lab/use-lab-session";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { EquipmentSelectionResultType } from "@/types/lab";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";
import EquipmentObserveSheet from "@/components/lab/equipment/EquipmentObserveSheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EquipmentCheckbox = ({ isSelected, isConfirmedCorrect }: { isSelected: boolean; isConfirmedCorrect: boolean }) => (
  <View
    className="items-center justify-center"
    style={{
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : colors.borderColorLight,
      backgroundColor: isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : "white",
    }}
  >
    {(isSelected || isConfirmedCorrect) && <Check size={14} color="white" strokeWidth={3} />}
  </View>
);

const EquipmentCard = ({
  item,
  isSelected,
  isConfirmedCorrect,
  onPress,
  onObserve,
}: {
  item: EquipmentCatalogItem;
  isSelected: boolean;
  isConfirmedCorrect: boolean;
  onPress: () => void;
  onObserve: () => void;
}) => {
  const { style, onPressIn, onPressOut } = usePressScale();
  const Visual = item.Visual;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="items-center px-2 pt-3 pb-2.5 rounded-2xl border"
      style={[
        {
          width: "31%",
          backgroundColor: isConfirmedCorrect ? "#ECFDF5" : isSelected ? `${colors.primary}0D` : "white",
          borderColor: isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : colors.borderColorLight,
          borderWidth: isConfirmedCorrect || isSelected ? 1.5 : 1,
        },
        style,
      ]}
    >
      <View style={{ position: "absolute", top: 8, right: 8 }}>
        <EquipmentCheckbox isSelected={isSelected} isConfirmedCorrect={isConfirmedCorrect} />
      </View>

      <View style={{ height: 56, justifyContent: "center" }}>
        <Visual size={48} color={isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : colors.primaryBlack} />
      </View>

      <Text className="font-amedium text-xs text-center mt-2" numberOfLines={2} style={{ color: colors.primaryBlack, minHeight: 30 }}>
        {item.label}
      </Text>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onObserve();
        }}
        hitSlop={8}
        className="flex-row items-center gap-1 mt-1.5"
      >
        <Info size={12} color="#979797" />
        <Text className="font-aregular text-[11px] text-muted">Observe</Text>
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
  // The submission result (missing/extra items, or fully correct) used to render inline right
  // below the equipment grid, where it could end up covering the last row of cards on shorter
  // screens — a popup keeps it fully separate from the grid instead. `result` itself stays
  // around after the popup is dismissed (it still drives each card's green "correct" checkmark
  // and the footer button's "Continue" label), so this is its own dismiss-only flag.
  const [showResultModal, setShowResultModal] = useState(false);

  const submitMutation = useSubmitEquipmentSelection(session?._id);
  const chemicalSelectionMutation = useSubmitChemicalSelection(session?._id);
  // Physics experiments never have any requiredChemicals (submitChemicalSelection trivially
  // reports isComplete against an empty requirement set either way — see session.controller.js),
  // so their chemical-selection screen has nothing to select and is skipped entirely: an empty
  // selection is auto-submitted and the student goes straight to the workspace.
  const isPhysicsExperiment = experiment?.subject === "Physics";

  useEffect(() => {
    if (experimentId) startSession(experimentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  // startSession can resume an existing in_progress session that's already past this phase
  // (e.g. the student left mid-practical last time) — jump to wherever it actually left off
  // instead of letting them fill this screen out against a session that will reject it.
  useEffect(() => {
    if (!session || session.phase === "equipment_selection") return;
    if (session.phase === "chemical_selection" && isPhysicsExperiment) {
      chemicalSelectionMutation.mutate([], {
        onSuccess: () => router.replace(`/(tabs)/lab/${experimentId}/workspace?sessionId=${session._id}` as never),
      });
      return;
    }
    const target =
      session.phase === "chemical_selection"
        ? "chemicals"
        : session.phase === "procedure"
          ? "workspace"
          : "report";
    router.replace(`/(tabs)/lab/${experimentId}/${target}?sessionId=${session._id}` as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, experimentId, isPhysicsExperiment]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = () => {
    setSubmitError(null);

    // The backend advances the session out of "equipment_selection" on the very first submission
    // (equipment selection is feedback-only, not a gate) — so a second press must NOT submit again,
    // the session is no longer in that phase and the API would reject it. Once we already have a
    // result from the first press, just move the student on to the next phase.
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
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (experimentError || sessionError || !session) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <Text className="font-aregular text-muted text-center mt-2 mb-4">
          Check that the backend is running and reachable from this device.
        </Text>
        <View className="self-stretch">
          <Button label="Retry" onPress={() => startSession(experimentId)} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-xl font-amedium text-ink mb-3">{experiment?.title}</Text>

        <View className="flex-row gap-3 p-4 rounded-2xl mb-3" style={{ backgroundColor: "#FEF3E2" }}>
          <View
            className="items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#FDE4C0" }}
          >
            <Lightbulb size={16} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-amedium text-ink">Select the equipment you think you&apos;ll need</Text>
            <Text className="font-aregular text-muted mt-1">
              Choose the equipment you believe is suitable for this experiment. You can select more than one.
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 px-3 py-2.5 rounded-2xl mb-4" style={{ backgroundColor: "#ECFDF5" }}>
          <Info size={16} color="#10B981" />
          <Text className="font-aregular text-xs flex-1" style={{ color: "#065F46" }}>
            <Text className="font-amedium">Not sure what an item is used for? </Text>
            Tap &quot;Observe&quot; to learn more.
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          {LAB_EQUIPMENT_CATALOG.filter(
            (item) => !!experiment && item.subjects.includes(experiment.subject as "Chemistry" | "Physics" | "Biology")
          ).map((item) => (
            <EquipmentCard
              key={item.key}
              item={item}
              isSelected={selected.includes(item.key)}
              isConfirmedCorrect={!!result?.correct.includes(item.key)}
              onPress={() => toggle(item.key)}
              onObserve={() => setObserveItem(item)}
            />
          ))}
        </View>

        {submitError && (
          <View className="mt-5 p-4 rounded-2xl bg-red-50 flex-row gap-2">
            <XCircle size={18} color="#B91C1C" />
            <Text className="font-amedium text-red-900 flex-1">{submitError}</Text>
          </View>
        )}

        <View className="h-4" />
      </ScrollView>

      <View className="px-4 pt-3 pb-1">
        <Button
          label={submitMutation.isPending ? "Checking..." : result ? "Continue" : "Confirm Selection"}
          onPress={handleSubmit}
          disabled={selected.length === 0 || submitMutation.isPending}
          size="lg"
        />
      </View>
      <Text className="font-aregular text-xs text-muted text-center pb-3">You can change your selection later in the lab.</Text>

      <EquipmentObserveSheet item={observeItem} onClose={() => setObserveItem(null)} />

      <Modal transparent animationType="slide" visible={showResultModal} onRequestClose={() => setShowResultModal(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
          <View className="bg-surface rounded-t-3xl p-5">
            <SheetHandle />
            <View className="items-center py-2">
              <View
                className="items-center justify-center mb-3"
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: result?.fullyCorrect ? "#ECFDF5" : "#FFFBEB" }}
              >
                {result?.fullyCorrect ? (
                  <CheckCircle2 size={28} color="#059669" />
                ) : (
                  <AlertTriangle size={28} color="#B45309" />
                )}
              </View>
              <Text className="text-lg font-amedium text-ink text-center">
                {result?.fullyCorrect
                  ? "Correct equipment selected!"
                  : result && result.missingCount > 0
                    ? `You're missing ${result.missingCount} item${result.missingCount > 1 ? "s" : ""}`
                    : "You've picked some extra equipment"}
              </Text>
              <Text className="font-aregular text-muted text-center mt-1">
                {result?.fullyCorrect
                  ? "Press Continue when you're ready."
                  : result && result.missingCount > 0
                    ? "That's okay — you can add them from the equipment drawer in the lab."
                    : "No problem — this experiment doesn't need it, moving on."}
              </Text>
              {result && !result.fullyCorrect && result.hint && (
                <Text className="font-aregular text-amber-700 text-center mt-2">{result.hint}</Text>
              )}
            </View>
            <View className="mt-4">
              <Button label="Got it" onPress={() => setShowResultModal(false)} variant={result?.fullyCorrect ? "success" : "secondary"} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
