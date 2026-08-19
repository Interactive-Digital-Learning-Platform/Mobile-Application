import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG, EquipmentCatalogItem } from "@/constants/lab/equipment.constants";
import { useExperiment } from "@/hooks/lab/use-experiments";
import { useStartSession, useSubmitEquipmentSelection } from "@/hooks/lab/use-lab-session";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { EquipmentSelectionResultType } from "@/types/lab";
import Button from "@/components/ui/Button";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EquipmentChip = ({
  item,
  isSelected,
  isConfirmedCorrect,
  onPress,
}: {
  item: EquipmentCatalogItem;
  isSelected: boolean;
  isConfirmedCorrect: boolean;
  onPress: () => void;
}) => {
  const { style, onPressIn, onPressOut } = usePressScale();
  const Visual = item.Visual;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="flex-row items-center gap-1.5 px-3 py-2 rounded-2xl border"
      style={[
        {
          backgroundColor: isConfirmedCorrect ? "#ECFDF5" : isSelected ? `${colors.primary}0D` : "white",
          borderColor: isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : colors.borderColorLight,
          borderWidth: isConfirmedCorrect || isSelected ? 1.5 : 1,
        },
        style,
      ]}
    >
      <Visual size={22} color={isConfirmedCorrect ? "#10B981" : isSelected ? colors.primary : colors.primaryBlack} />
      <Text className="font-amedium" style={{ color: colors.primaryBlack }}>
        {item.label}
      </Text>
      {isConfirmedCorrect && <CheckCircle2 size={15} color="#10B981" />}
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

  const submitMutation = useSubmitEquipmentSelection(session?._id);

  useEffect(() => {
    if (experimentId) startSession(experimentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  // startSession can resume an existing in_progress session that's already past this phase
  // (e.g. the student left mid-practical last time) — jump to wherever it actually left off
  // instead of letting them fill this screen out against a session that will reject it.
  useEffect(() => {
    if (!session || session.phase === "equipment_selection") return;
    const target =
      session.phase === "chemical_selection"
        ? "chemicals"
        : session.phase === "procedure"
          ? "workspace"
          : "report";
    router.replace(`/(tabs)/lab/${experimentId}/${target}?sessionId=${session._id}` as never);
  }, [session, experimentId]);

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
      router.replace(`/(tabs)/lab/${experimentId}/chemicals?sessionId=${session?._id}` as never);
      return;
    }

    submitMutation.mutate(selected, {
      onSuccess: (data) => {
        setResult(data);
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
        <Text className="text-xl font-amedium text-ink">{experiment?.title}</Text>
        <Text className="font-aregular text-muted mt-1 mb-4">
          Select the equipment you think you&apos;ll need — you can always grab more from the
          equipment drawer once you&apos;re in the lab.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {LAB_EQUIPMENT_CATALOG.map((item) => (
            <EquipmentChip
              key={item.key}
              item={item}
              isSelected={selected.includes(item.key)}
              isConfirmedCorrect={!!result?.correct.includes(item.key)}
              onPress={() => toggle(item.key)}
            />
          ))}
        </View>

        {result && !result.fullyCorrect && (
          <View className="mt-5 p-4 rounded-2xl bg-amber-50 flex-row gap-2">
            <AlertTriangle size={18} color="#B45309" />
            <View className="flex-1">
              <Text className="font-amedium text-amber-900">
                {result.missingCount > 0
                  ? `You're missing ${result.missingCount} item(s) — that's okay, you can add them from the equipment drawer in the lab.`
                  : "You've selected some equipment this experiment doesn't need — no problem, moving on."}
              </Text>
              {result.hint && <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>}
            </View>
          </View>
        )}

        {result?.fullyCorrect && (
          <View className="mt-5 p-4 rounded-2xl bg-emerald-50 flex-row items-center gap-2">
            <CheckCircle2 size={18} color="#059669" />
            <Text className="font-amedium text-emerald-800">
              Correct equipment selected! Press Continue when you&apos;re ready.
            </Text>
          </View>
        )}

        {submitError && (
          <View className="mt-5 p-4 rounded-2xl bg-red-50 flex-row gap-2">
            <XCircle size={18} color="#B91C1C" />
            <Text className="font-amedium text-red-900 flex-1">{submitError}</Text>
          </View>
        )}
      </ScrollView>

      <View className="p-4">
        <Button
          label={submitMutation.isPending ? "Checking..." : result ? "Continue" : "Confirm Selection"}
          onPress={handleSubmit}
          disabled={selected.length === 0 || submitMutation.isPending}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
