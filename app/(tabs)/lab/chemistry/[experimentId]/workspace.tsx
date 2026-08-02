import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, FlaskConical, Hammer, Lightbulb } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/labEquipment";
import { useExperiment } from "@/hooks/use-experiments";
import { useChemicals } from "@/hooks/use-chemicals";
import {
  useSession,
  useLogStepAction,
  useRequestStepHint,
  useCompleteSession,
} from "@/hooks/use-lab-session";
import CompoundBuilder from "@/components/lab/CompoundBuilder";
import { ChemicalType, InterventionType, ReactionResultType } from "@/types";

export default function Workspace() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { data: session, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession(sessionId);
  const { data: allChemicals } = useChemicals({});

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [selectedChemicalIds, setSelectedChemicalIds] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [reactionResult, setReactionResult] = useState<ReactionResultType | null>(null);
  const [intervention, setIntervention] = useState<InterventionType>(null);
  const [stepStartedAt, setStepStartedAt] = useState(Date.now());
  const [builderTarget, setBuilderTarget] = useState<ChemicalType | null>(null);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [builderDrawerOpen, setBuilderDrawerOpen] = useState(false);

  const logAction = useLogStepAction(sessionId);
  const requestHint = useRequestStepHint(sessionId);
  const completeSession = useCompleteSession(sessionId);

  useEffect(() => {
    if (session && currentStep === null) setCurrentStep(session.currentStep);
  }, [session, currentStep]);

  const confirmedChemicals = (allChemicals || []).filter((c) => session?.chemicalSelection?.selected.includes(c._id));
  const confirmedEquipment = LAB_EQUIPMENT_CATALOG.filter((e) => session?.equipmentSelection?.selected.includes(e.key));
  const buildableConfirmed = confirmedChemicals.filter((c) => c.isBuildableFromElements);
  const step = experiment?.steps.find((s) => s.stepId === currentStep);
  const totalSteps = experiment?.steps.length || 0;

  const handleBuilt = (compoundId: string) => {
    setBuiltIds((prev) => (prev.includes(compoundId) ? prev : [...prev, compoundId]));
  };

  const resetStepUI = () => {
    setSelectedChemicalIds([]);
    setSelectedEquipment(null);
    setHint(null);
    setFeedback(null);
    setReactionResult(null);
    setIntervention(null);
    setStepStartedAt(Date.now());
  };

  const handleHint = () => {
    if (!currentStep) return;
    requestHint.mutate(currentStep, { onSuccess: (data) => setHint(data.hintText) });
  };

  const toggleChemical = (id: string) => {
    setSelectedChemicalIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const submitAction = () => {
    if (!step || !currentStep) return;
    const isMix = step.actionType === "mix";

    logAction.mutate(
      {
        stepId: currentStep,
        actionType: "correct", // client's best-effort claim — the server re-grades mix steps authoritatively
        equipmentType: isMix ? confirmedEquipment[0]?.key || null : selectedEquipment,
        chemicalIds: isMix ? selectedChemicalIds : undefined,
        timeTaken: Math.round((Date.now() - stepStartedAt) / 1000),
      },
      {
        onSuccess: ({ data, meta }) => {
          setReactionResult(meta.reactionResult);
          setIntervention(meta.intervention);

          if (data.actionType === "correct") {
            setFeedback({ ok: true, message: "Correct — well done." });
            setTimeout(() => {
              if (meta.currentStep > totalSteps) {
                completeSession.mutate(undefined, {
                  onSuccess: () => router.replace(`/(tabs)/lab/chemistry/${experimentId}/report?sessionId=${sessionId}` as never),
                });
              } else {
                setCurrentStep(meta.currentStep);
                resetStepUI();
              }
            }, 1400);
          } else {
            setFeedback({ ok: false, message: "That doesn't look right yet — try again." });
          }
        },
      }
    );
  };

  if (experimentError || sessionError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center" style={{ color: colors.primaryBlack }}>
          Couldn&apos;t reach the server
        </Text>
        <Pressable onPress={() => refetchSession()} className="mt-4 px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
          <Text className="text-white font-amedium">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (experimentLoading || sessionLoading || currentStep === null) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!step) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      {/* Equipment shelf — top */}
      <View className="py-3 border-b" style={{ borderColor: colors.borderColorLight }}>
        <Text className="font-amedium text-xs px-4 mb-2" style={{ color: "#979797" }}>
          EQUIPMENT
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {confirmedEquipment.map((e) => (
            <View
              key={e.key}
              className="flex-row items-center gap-2 px-3 py-2 rounded-full border"
              style={{ borderColor: colors.borderColorLight }}
            >
              <FlaskConical size={14} color={colors.primary} />
              <Text className="font-amedium text-xs" style={{ color: colors.primaryBlack }}>
                {e.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Experiment area — center */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="font-aregular text-xs text-[#979797]">
          Step {currentStep} of {totalSteps}
        </Text>
        <Text className="text-xl font-amedium mt-1" style={{ color: colors.primaryBlack }}>
          {step.title}
        </Text>
        <Text className="font-aregular text-[#979797] mt-1">{step.instruction}</Text>

        {step.actionType === "mix" ? (
          <>
            <Text className="font-amedium mt-5 mb-2">Select chemicals to mix</Text>
            <View className="flex-row flex-wrap gap-2">
              {confirmedChemicals.map((c) => {
                const isSelected = selectedChemicalIds.includes(c._id);
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => toggleChemical(c._id)}
                    className="px-4 py-2 rounded-full border flex-row items-center gap-2"
                    style={{ backgroundColor: isSelected ? colors.primary : "white", borderColor: isSelected ? colors.primary : colors.borderColorLight }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }} />
                    <Text style={{ color: isSelected ? "white" : colors.primaryBlack }} className="font-amedium">
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text className="font-amedium mt-5 mb-2">Equipment used (optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              {confirmedEquipment.map((e) => {
                const isSelected = selectedEquipment === e.key;
                return (
                  <Pressable
                    key={e.key}
                    onPress={() => setSelectedEquipment(isSelected ? null : e.key)}
                    className="px-4 py-2 rounded-full border"
                    style={{ backgroundColor: isSelected ? colors.primary : "white", borderColor: isSelected ? colors.primary : colors.borderColorLight }}
                  >
                    <Text style={{ color: isSelected ? "white" : colors.primaryBlack }} className="font-amedium">
                      {e.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {hint && (
          <View className="mt-4 p-3 rounded-xl bg-blue-50 flex-row gap-2">
            <Lightbulb size={18} color="#1E88E5" />
            <Text className="font-aregular text-blue-900 flex-1">{hint}</Text>
          </View>
        )}

        {intervention && (
          <View className="mt-4 p-3 rounded-xl bg-red-50">
            <Text className="font-amedium text-red-900">Pause and think</Text>
            <Text className="font-aregular text-red-800 mt-1">{intervention.hint}</Text>
          </View>
        )}

        {feedback && (
          <View className="mt-4 p-3 rounded-xl" style={{ backgroundColor: feedback.ok ? "#E8F5E9" : "#FFF3E0" }}>
            <Text className="font-amedium" style={{ color: feedback.ok ? "#2E7D32" : "#E65100" }}>
              {feedback.message}
            </Text>
          </View>
        )}

        {reactionResult?.found && (
          <View className="mt-4 p-4 rounded-xl bg-slate-100">
            <Text className="font-amedium">{reactionResult.reaction.name}</Text>
            <Text className="font-aregular mt-1" style={{ color: colors.primary }}>{reactionResult.reaction.balancedEquation}</Text>
            <Text className="font-aregular text-[#979797] mt-1">{reactionResult.reaction.educationalInfo.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Materials shelf — bottom */}
      <View className="py-3 border-t" style={{ borderColor: colors.borderColorLight }}>
        <Text className="font-amedium text-xs px-4 mb-2" style={{ color: "#979797" }}>
          MATERIALS
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {confirmedChemicals.map((c) => (
            <View
              key={c._id}
              className="flex-row items-center gap-2 px-3 py-2 rounded-full border"
              style={{ borderColor: colors.borderColorLight }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color, borderWidth: 1, borderColor: "#00000022" }} />
              <Text className="font-amedium text-xs" style={{ color: colors.primaryBlack }}>
                {c.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Compound Builder drawer — collapsed by default, lets a student build/rebuild a
          buildable compound mid-experiment without leaving the workspace. */}
      {buildableConfirmed.length > 0 && (
        <View className="border-t" style={{ borderColor: colors.borderColorLight }}>
          <Pressable
            onPress={() => setBuilderDrawerOpen((v) => !v)}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Hammer size={16} color="#FC6E20" />
              <Text className="font-amedium text-sm" style={{ color: colors.primaryBlack }}>
                Compound Builder
              </Text>
            </View>
            {builderDrawerOpen ? (
              <ChevronUp size={18} color={colors.primaryBlack} />
            ) : (
              <ChevronDown size={18} color={colors.primaryBlack} />
            )}
          </Pressable>

          {builderDrawerOpen && (
            <View className="px-4 pb-4 gap-2">
              {buildableConfirmed.map((c) => (
                <Pressable
                  key={c._id}
                  onPress={() => setBuilderTarget(c)}
                  className="flex-row items-center justify-between px-3 py-2 rounded-xl border"
                  style={{ borderColor: builtIds.includes(c._id) ? "#4CAF50" : colors.borderColorLight }}
                >
                  <Text className="font-amedium text-sm" style={{ color: colors.primaryBlack }}>
                    {c.name}
                  </Text>
                  <Text
                    className="font-aregular text-xs"
                    style={{ color: builtIds.includes(c._id) ? "#2E7D32" : "#979797" }}
                  >
                    {builtIds.includes(c._id) ? "Built ✓" : "Tap to build"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <View className="p-4 flex-row gap-3">
        <Pressable onPress={handleHint} className="px-4 py-3 rounded-xl border items-center justify-center" style={{ borderColor: colors.borderColorLight }}>
          <Lightbulb size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={submitAction}
          disabled={(step.actionType === "mix" ? selectedChemicalIds.length < 2 : false) || logAction.isPending}
          className="flex-1 py-3 rounded-xl items-center"
          style={{
            backgroundColor: colors.primaryBlack,
            opacity: step.actionType === "mix" && selectedChemicalIds.length < 2 ? 0.5 : 1,
          }}
        >
          <Text className="text-white font-amedium text-lg">
            {logAction.isPending ? "Checking..." : step.actionType === "mix" ? "Mix" : "Mark as Done"}
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
