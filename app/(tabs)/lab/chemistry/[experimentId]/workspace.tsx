import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ChevronDown, ChevronUp, Droplet, FlaskConical, Hammer, Lightbulb, Sparkles } from "lucide-react-native";
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
import { useStartLabRun } from "@/hooks/use-lab-run";
import { BenchActionOutcome, useLabWorkspace } from "@/hooks/use-lab-workspace";
import { useDropTargetRegistry } from "@/hooks/use-drop-target-registry";
import CompoundBuilder from "@/components/lab/CompoundBuilder";
import LabWorkspace from "@/components/lab/LabWorkspace";
import ChemicalBottle from "@/components/lab/ChemicalBottle";
import EquipmentShelfItem from "@/components/lab/EquipmentShelfItem";
import EducationalInfoPanel from "@/components/lab/EducationalInfoPanel";
import ChemicalInspectPanel from "@/components/lab/ChemicalInspectPanel";
import EquipmentInspectPanel from "@/components/lab/EquipmentInspectPanel";
import { ChemicalType, InterventionType, ReactionResultType } from "@/types";
import Button from "@/components/ui/Button";
import ProgressSteps, { ProgressStepsCaption } from "@/components/ui/ProgressSteps";

export default function Workspace() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { data: session, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession(sessionId);
  const { data: allChemicals } = useChemicals({});

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [reactionResult, setReactionResult] = useState<ReactionResultType | null>(null);
  const [intervention, setIntervention] = useState<InterventionType>(null);
  const [stepStartedAt, setStepStartedAt] = useState(Date.now());
  const [builderTarget, setBuilderTarget] = useState<ChemicalType | null>(null);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [builderDrawerOpen, setBuilderDrawerOpen] = useState(false);
  const [labRunId, setLabRunId] = useState<string | undefined>(undefined);
  // Distinct from `reactionResult` above (that one's the guided-step "Mix" grading result) — this
  // is a reaction firing live on the bench, from dragging chemicals or toggling heat.
  const [liveReactionResult, setLiveReactionResult] = useState<ReactionResultType | null>(null);
  const [inspectChemical, setInspectChemical] = useState<ChemicalType | null>(null);
  const [inspectEquipmentId, setInspectEquipmentId] = useState<string | null>(null);
  // Visual-only drag-hover state (see ChemicalBottle/EquipmentShelfItem's onHoverChange) — never
  // read by any mutation or drop-resolution logic, purely drives the dashed highlight overlays.
  const [hoveredEquipmentId, setHoveredEquipmentId] = useState<string | null>(null);
  const [isDraggingEquipmentOverBench, setIsDraggingEquipmentOverBench] = useState(false);

  const logAction = useLogStepAction(sessionId);
  const requestHint = useRequestStepHint(sessionId);
  const completeSession = useCompleteSession(sessionId);

  // The live bench — a LabRun scoped to this Session (not the student's freeform run), started
  // once on entry. logLabAction/useLabRun handle it as the single source of truth from here on.
  const startLabRunMutation = useStartLabRun();
  const labRunStartedRef = useRef(false);
  const benchRef = useRef<View>(null);

  useEffect(() => {
    if (sessionId && !labRunStartedRef.current) {
      labRunStartedRef.current = true;
      startLabRunMutation.mutate(sessionId, { onSuccess: (labRun) => setLabRunId(labRun._id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const {
    equipment: benchEquipment,
    createEquipment,
    moveEquipment,
    removeEquipment,
    addChemical,
    toggleHeat,
    probeMeasure,
    probeDetach,
  } = useLabWorkspace(labRunId);
  const { register: registerEquipmentRef, resolveDropTarget } = useDropTargetRegistry();
  // Registers each container instance's *liquid* sub-rect specifically (not its whole body), so
  // probe-role equipment (the pH meter) only triggers on actual overlap with poured liquid, not
  // mere proximity to the container. See EquipmentContainer / PhMeterInstrument.
  const { register: registerLiquidRegion, resolveDropTarget: resolveLiquidRegion } = useDropTargetRegistry();

  useEffect(() => {
    if (session && currentStep === null) setCurrentStep(session.currentStep);
  }, [session, currentStep]);

  const chemicalMap = useMemo(() => {
    const map: Record<string, ChemicalType> = {};
    (allChemicals || []).forEach((c) => {
      map[c._id] = c;
    });
    return map;
  }, [allChemicals]);

  // Compounds built via the Compound Builder never enter chemicalSelection.selected (building
  // satisfies the requirement instead of tapping a chip) — merge both sources so the bench shows
  // everything the student actually has, not just what they clicked.
  const builtChemicalIds = (session?.builtCompounds || []).filter((b) => b.completedAt).map((b) => b.chemical);
  const confirmedChemicalIds = [...(session?.chemicalSelection?.selected || []), ...builtChemicalIds];
  const confirmedChemicals = (allChemicals || []).filter((c) => confirmedChemicalIds.includes(c._id));
  const confirmedEquipment = LAB_EQUIPMENT_CATALOG.filter((e) => session?.equipmentSelection?.selected.includes(e.key));
  const buildableConfirmed = confirmedChemicals.filter((c) => c.isBuildableFromElements);
  const step = experiment?.steps.find((s) => s.stepId === currentStep);
  const totalSteps = experiment?.steps.length || 0;
  const inspectEquipmentInstance = benchEquipment.find((e) => e.instanceId === inspectEquipmentId) || null;

  const resolveBenchPosition = (absoluteX: number, absoluteY: number): Promise<{ x: number; y: number } | null> => {
    return new Promise((resolve) => {
      if (!benchRef.current) return resolve(null);
      benchRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        if (absoluteX >= pageX && absoluteX <= pageX + width && absoluteY >= pageY && absoluteY <= pageY + height) {
          resolve({ x: absoluteX - pageX - 24, y: absoluteY - pageY - 24 });
        } else {
          resolve(null);
        }
      });
    });
  };

  const handleBuilt = (compoundId: string) => {
    setBuiltIds((prev) => (prev.includes(compoundId) ? prev : [...prev, compoundId]));
  };

  const resetStepUI = () => {
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

  const submitAction = () => {
    if (!step || !currentStep) return;
    const isMix = step.actionType === "mix";

    logAction.mutate(
      {
        stepId: currentStep,
        // Client's best-effort claim — for mix steps the server ignores this and checks the live
        // bench (session.labRunId) instead, so a wrong guess here can't advance the step.
        actionType: "correct",
        equipmentType: isMix ? undefined : selectedEquipment,
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

  // Only surface a genuine reaction — the bench checks on every add/heat, so most of those checks
  // come back "no reaction" (two chemicals that just don't react is normal, not worth a popup).
  // For a mix step, a reaction firing live is also exactly what the step is waiting on, so
  // re-check with the server right away instead of making the student tap "Check" separately.
  // Reuses the same `intervention` banner the guided step flow already shows — the AI Tutor now
  // also flags things proactively (e.g. heating an empty container) straight from bench events,
  // not just from step mistakes.
  const handleBenchOutcome = ({ reactionResult, intervention: benchIntervention }: BenchActionOutcome) => {
    if (reactionResult?.found) {
      setLiveReactionResult(reactionResult);
      if (step?.actionType === "mix") submitAction();
    }
    if (benchIntervention) setIntervention(benchIntervention);
  };

  const handleBenchToggleHeat = (instanceId: string) => {
    toggleHeat(instanceId, handleBenchOutcome);
  };

  if (experimentError || sessionError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <View className="mt-4 self-stretch">
          <Button label="Retry" onPress={() => refetchSession()} variant="secondary" />
        </View>
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
      {/* Equipment shelf — top. Draggable spawners: drop one onto the bench below to place a
          brand new instance there (multiple of the same type are allowed). */}
      <View className="py-3 border-b" style={{ borderColor: colors.borderColorLight }}>
        <View className="flex-row items-center gap-1.5 px-4 mb-2">
          <FlaskConical size={12} color="#979797" />
          <Text className="font-amedium text-xs text-muted">EQUIPMENT — drag onto the bench</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {confirmedEquipment.map((e) => (
            <EquipmentShelfItem
              key={e.key}
              equipmentType={e.key}
              label={e.label}
              Visual={e.Visual}
              resolveBenchPosition={resolveBenchPosition}
              onDroppedOnBench={createEquipment}
              onHoverChange={setIsDraggingEquipmentOverBench}
            />
          ))}
        </ScrollView>
      </View>

      {/* Practical workspace — the live bench. Every object here is real backend state.
          flex: 1 so it claims all vertical space left over after the equipment shelf, materials
          shelf, and guidance panel take what they need — this is the main interaction area. */}
      <View
        ref={benchRef}
        className="bg-bg-soft"
        style={{
          flex: 1,
          minHeight: 320,
          borderBottomWidth: isDraggingEquipmentOverBench ? 2 : 1,
          borderStyle: isDraggingEquipmentOverBench ? "dashed" : "solid",
          borderColor: isDraggingEquipmentOverBench ? colors.primary : colors.borderColorLight,
        }}
      >
        <LabWorkspace
          equipment={benchEquipment}
          chemicalMap={chemicalMap}
          registerEquipmentRef={registerEquipmentRef}
          registerLiquidRegion={registerLiquidRegion}
          resolveLiquidRegion={resolveLiquidRegion}
          onMoveEquipment={moveEquipment}
          onToggleHeat={handleBenchToggleHeat}
          onInspectEquipment={setInspectEquipmentId}
          probeMeasure={probeMeasure}
          probeDetach={probeDetach}
          hoveredEquipmentId={hoveredEquipmentId}
        />
        {benchEquipment.length === 0 && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            pointerEvents="none"
          >
            <FlaskConical size={28} color="#979797" />
            <Text className="font-aregular text-sm text-muted mt-2">Drag equipment here to begin</Text>
          </Animated.View>
        )}
      </View>

      {/* Experiment area — step guidance, hints, and results. Bounded (not flex) and internally
          scrollable so it never competes with the lab bench above for vertical space. */}
      <ScrollView style={{ maxHeight: 220 }} className="px-4 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressSteps totalSteps={totalSteps} currentStep={currentStep} />
        <ProgressStepsCaption totalSteps={totalSteps} currentStep={currentStep} />
        <Text className="text-xl font-amedium mt-2 text-ink">{step.title}</Text>
        <Text className="font-aregular text-muted mt-1">{step.instruction}</Text>

        {step.actionType === "mix" && (
          <View className="mt-4 p-3 rounded-2xl bg-blue-50">
            <Text className="font-amedium text-blue-900">Perform this on the bench above</Text>
            <Text className="font-aregular text-blue-800 mt-1">
              Drag the right materials into your equipment — this step completes automatically once
              the reaction actually happens.
            </Text>
          </View>
        )}

        {hint && (
          <View className="mt-4 p-3 rounded-2xl bg-blue-50 flex-row gap-2">
            <Lightbulb size={18} color="#1E88E5" />
            <Text className="font-aregular text-blue-900 flex-1">{hint}</Text>
          </View>
        )}

        {intervention && (
          // The one place a "proactive" tutor message actually appears in this app — surfaced
          // straight from a bench event (see handleBenchOutcome), not a reply to a question — so
          // it gets its own entrance and the same Lab Tutor identity mark used on the AI tab.
          <Animated.View entering={FadeInDown.duration(280)} className="mt-4 p-3 rounded-2xl bg-red-50 flex-row gap-2">
            <Sparkles size={16} color="#B91C1C" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="font-amedium text-red-900">Lab Tutor — pause and think</Text>
              <Text className="font-aregular text-red-800 mt-1">{intervention.hint}</Text>
            </View>
          </Animated.View>
        )}

        {feedback && (
          <View className={`mt-4 p-3 rounded-2xl ${feedback.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
            <Text className={`font-amedium ${feedback.ok ? "text-emerald-800" : "text-amber-900"}`}>{feedback.message}</Text>
          </View>
        )}

        {reactionResult?.found && (
          <View className="mt-4 p-4 rounded-2xl bg-slate-100">
            <Text className="font-amedium">{reactionResult.reaction.name}</Text>
            <Text className="font-aregular mt-1" style={{ color: colors.primary }}>{reactionResult.reaction.balancedEquation}</Text>
            <Text className="font-aregular text-muted mt-1">{reactionResult.reaction.educationalInfo.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Materials shelf — bottom. Draggable bottles: drop one onto a bench container to add it. */}
      <View className="py-3 border-t" style={{ borderColor: colors.borderColorLight }}>
        <View className="flex-row items-center gap-1.5 px-4 mb-2">
          <Droplet size={12} color="#979797" />
          <Text className="font-amedium text-xs text-muted">MATERIALS — drag into equipment on the bench</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {confirmedChemicals.map((c) => (
            <ChemicalBottle
              key={c._id}
              chemical={c}
              resolveDropTarget={resolveDropTarget}
              onDropped={(chemical, instanceId) => {
                const isSolid = chemical.state === "solid";
                addChemical(instanceId, chemical._id, isSolid ? 5 : 50, isSolid ? "g" : "mL", handleBenchOutcome);
              }}
              onInspect={setInspectChemical}
              onHoverChange={setHoveredEquipmentId}
            />
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
                  className="flex-row items-center justify-between px-3 py-2 rounded-2xl border"
                  style={{ borderColor: builtIds.includes(c._id) ? "#10B981" : colors.borderColorLight }}
                >
                  <Text className="font-amedium text-sm text-ink">{c.name}</Text>
                  <Text
                    className="font-aregular text-xs"
                    style={{ color: builtIds.includes(c._id) ? "#059669" : "#979797" }}
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
        <Pressable onPress={handleHint} className="px-4 py-3 rounded-2xl border items-center justify-center border-border">
          <Lightbulb size={20} color={colors.primary} />
        </Pressable>
        <View className="flex-1">
          <Button
            label={logAction.isPending ? "Checking..." : step.actionType === "mix" ? "Check" : "Mark as Done"}
            onPress={submitAction}
            disabled={logAction.isPending}
            size="lg"
          />
        </View>
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

      <EducationalInfoPanel result={liveReactionResult} onClose={() => setLiveReactionResult(null)} />

      <ChemicalInspectPanel chemical={inspectChemical} onClose={() => setInspectChemical(null)} />

      <EquipmentInspectPanel
        instance={inspectEquipmentInstance}
        chemicalMap={chemicalMap}
        onClose={() => setInspectEquipmentId(null)}
        onRemove={removeEquipment}
      />
    </SafeAreaView>
  );
}
