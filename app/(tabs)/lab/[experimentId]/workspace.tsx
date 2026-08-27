import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChevronDown, ChevronUp, Droplet, FlaskConical, Hammer, Lightbulb } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { useExperiment } from "@/hooks/lab/use-experiments";
import { useChemicals } from "@/hooks/lab/use-chemicals";
import {
  useSession,
  useLogStepAction,
  useRequestStepHint,
  useRequestStepHelp,
  useCompleteSession,
} from "@/hooks/lab/use-lab-session";
import { useStartLabRun } from "@/hooks/lab/use-lab-run";
import { BenchActionOutcome, useLabWorkspace } from "@/hooks/lab/use-lab-workspace";
import { useDropTargetRegistry } from "@/hooks/lab/use-drop-target-registry";
import CompoundBuilder from "@/components/lab/chemicals/CompoundBuilder";
import LabWorkspace from "@/components/lab/LabWorkspace";
import CircuitBoard from "@/components/lab/CircuitBoard";
import ChemicalBottle from "@/components/lab/chemicals/ChemicalBottle";
import EquipmentShelfItem from "@/components/lab/equipment/EquipmentShelfItem";
import EducationalInfoPanel from "@/components/lab/panels/EducationalInfoPanel";
import HintCenterPanel from "@/components/lab/panels/HintCenterPanel";
import ChemicalInspectPanel from "@/components/lab/chemicals/ChemicalInspectPanel";
import EquipmentInspectPanel from "@/components/lab/equipment/EquipmentInspectPanel";
import { ChemicalType, HelpRevealType, HintNotificationType, ReactionResultType } from "@/types/lab";
import Button from "@/components/ui/Button";
import ProgressSteps, { ProgressStepsCaption } from "@/components/ui/ProgressSteps";

export default function Workspace() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { data: session, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession(sessionId);
  const { data: allChemicals } = useChemicals({});

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  // Which Current Task within currentStep the student is on — server-authoritative, seeded once
  // from session.currentMicroStep and then advanced from logAction's meta.currentMicroStep, same
  // pattern as currentStep. Irrelevant (stays 1) for a step with no microSteps.
  const [currentMicroStep, setCurrentMicroStep] = useState<number | null>(null);
  // AI hints are never shown automatically — they're queued here (auto-triggered by mistakes, or
  // student-requested) and only surfaced when the student opens the Hint Center panel themselves.
  // Cleared the instant the Current Task changes (see the effect below) — hints belong to the
  // task that produced them, never carried forward to the next one.
  const [hintNotifications, setHintNotifications] = useState<HintNotificationType[]>([]);
  const [hintCenterOpen, setHintCenterOpen] = useState(false);
  // Per Current Task (keyed by `${stepId}:${microStepId}`, see taskKey below): whether hint level
  // 3 has been reached (gates the Help button) and, once pressed, the revealed answer — so
  // re-visiting an earlier task doesn't lose either, but a new task always starts fresh.
  const [helpAvailableByStep, setHelpAvailableByStep] = useState<Record<string, boolean>>({});
  const [helpRevealByStep, setHelpRevealByStep] = useState<Record<string, HelpRevealType>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [reactionResult, setReactionResult] = useState<ReactionResultType | null>(null);
  // Physics measurement-check microSteps ("calculate g", "calculate density"...) ask the student
  // to type in their computed answer, which is submitted as the action's `quantity` and checked
  // server-side against the bench's own reading (see mechanicsEngine.js's resolvePhysicsMeasurement).
  const [measurementInput, setMeasurementInput] = useState("");
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
  const requestHelp = useRequestStepHelp(sessionId);
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
    physicsEquipment: benchPhysicsEquipment,
    createEquipment,
    moveEquipment,
    removeEquipment,
    addChemical,
    pourLiquid,
    toggleHeat,
    probeMeasure,
    probeDetach,
    createPhysicsEquipment,
    attachMass,
    setLength,
    setReleaseAngle,
    startTimer,
    stopTimer,
    recordOscillation,
    readMeasurement,
    createAndPlaceComponent,
    removeComponent,
    setComponentValue,
    readMeter,
  } = useLabWorkspace(labRunId);

  // A guided session's bench only ever populates one of equipment/physicsEquipment, decided by
  // the experiment's subject — see physicsInstanceSchema in LabRun.js for why they're separate
  // bench-state arrays rather than one shared shape.
  const isPhysicsExperiment = experiment?.subject === "Physics";
  const createShelfEquipment = isPhysicsExperiment ? createPhysicsEquipment : createEquipment;
  const physicsDispatch = {
    onMove: moveEquipment,
    attachMass,
    setLength,
    setReleaseAngle,
    startTimer,
    stopTimer,
    recordOscillation,
    readMeasurement,
  };
  const circuitDispatch = { createAndPlaceComponent, removeComponent, setComponentValue, readMeter };
  // Circuit-role instances (resistor/ammeter/voltmeter, placed via CircuitBoard) vs mechanics
  // instances (pendulum/spring/etc., placed via LabWorkspace) — split so each renderer only ever
  // sees its own kind, even though both live in the same labRun.physicsEquipment array server-side.
  const mechanicsPhysicsEquipment = benchPhysicsEquipment.filter((e) => !e.role);
  const circuitPhysicsEquipment = benchPhysicsEquipment.filter((e) => !!e.role);
  const { register: registerEquipmentRef, resolveDropTarget } = useDropTargetRegistry();
  // Registers each container instance's *liquid* sub-rect specifically (not its whole body), so
  // probe-role equipment (the pH meter) only triggers on actual overlap with poured liquid, not
  // mere proximity to the container. See EquipmentContainer / PhMeterInstrument.
  const { register: registerLiquidRegion, resolveDropTarget: resolveLiquidRegion } = useDropTargetRegistry();

  useEffect(() => {
    if (session && currentStep === null) {
      setCurrentStep(session.currentStep);
      setCurrentMicroStep(session.currentMicroStep ?? 1);
    }
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
  // Equipment selection is a preparation step, not a gate — the full catalog for this experiment's
  // subject stays available here as an equipment drawer, so a student who under-picked (or
  // discovers mid-experiment that they need something else) is never stuck without it. Scoped by
  // subject so a Physics workspace's shelf doesn't offer "flask"/"burette".
  const availableEquipment = LAB_EQUIPMENT_CATALOG.filter(
    (e) => !!experiment && e.subjects.includes(experiment.subject as "Chemistry" | "Physics" | "Biology")
  );
  const buildableConfirmed = confirmedChemicals.filter((c) => c.isBuildableFromElements);
  const step = experiment?.steps.find((s) => s.stepId === currentStep);
  const totalSteps = experiment?.steps.length || 0;
  const inspectEquipmentInstance = benchEquipment.find((e) => e.instanceId === inspectEquipmentId) || null;
  // Electricity (Phase B): a circuit step mounts CircuitBoard.tsx instead of the free-bench
  // LabWorkspace — see circuitBoards.constants.ts. Step-scoped, not experiment-scoped, since one
  // practical (Series and Parallel Resistors) uses a different board across its steps.
  const currentBoardId = step?.circuitBoardId || null;
  const isCircuitStep = !!currentBoardId;

  // Current Task resolution — mirrors how `step` above is resolved from Session position +
  // Experiment content. `currentTask` is null for a step with no microSteps (unmigrated
  // practicals), in which case the workspace falls back to showing just the Main Step, exactly
  // as it did before this feature existed.
  const sortedMicroSteps = step?.microSteps?.length ? [...step.microSteps].sort((a, b) => a.microStepId - b.microStepId) : [];
  const usingMicroSteps = sortedMicroSteps.length > 0;
  const currentTask = usingMicroSteps ? sortedMicroSteps.find((ms) => ms.microStepId === currentMicroStep) || null : null;
  // Whether the *current unit of work* (task if migrated, whole step otherwise) auto-completes
  // from a live reaction firing on the bench, vs. needing an explicit "Mark as Done" tap.
  const isReactionCheckUnit = usingMicroSteps ? !!currentTask?.requiresReactionCheck : step?.actionType === "mix";
  // Physics sibling of isReactionCheckUnit — a "calculate g/k/density" task, unmigrated (whole-
  // step) practicals never set this (see resolveGradingTarget in session.controller.js).
  const isMeasurementCheckUnit = usingMicroSteps ? !!currentTask?.requiresMeasurementCheck : false;
  const taskKey = (stepId: number, microStepId: number | null) => `${stepId}:${microStepId ?? 0}`;
  const currentTaskKey = currentStep !== null ? taskKey(currentStep, usingMicroSteps ? currentMicroStep : null) : null;

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
    setFeedback(null);
    setReactionResult(null);
    setMeasurementInput("");
    setStepStartedAt(Date.now());
  };

  // Hard requirement: hints belong to the Current Task that produced them and must disappear the
  // instant the task changes (whether the student solved it, the parent Main Step advanced, or —
  // for an unmigrated step — the step itself advanced). Comparing against the previous position
  // via a ref means this fires no matter *how* currentStep/currentMicroStep changed, without
  // duplicating the reset call at every place those setters are used.
  const taskPositionRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentTaskKey === null) return;
    if (taskPositionRef.current !== null && taskPositionRef.current !== currentTaskKey) {
      setHintNotifications([]);
    }
    taskPositionRef.current = currentTaskKey;
  }, [currentTaskKey]);

  // Queues a hint into the Hint Center instead of surfacing it inline — the student sees a badge
  // on the 💡 button and reads it only when they choose to open the panel.
  const pushHintNotification = (message: string) => {
    setHintNotifications((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, message, timestamp: new Date().toISOString(), read: false },
    ]);
  };

  const openHintCenter = () => {
    setHintCenterOpen(true);
    setHintNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  };

  const handleRequestHint = () => {
    if (!currentStep || !currentTaskKey) return;
    requestHint.mutate(
      { stepId: currentStep, microStepId: usingMicroSteps ? currentMicroStep : null },
      {
        onSuccess: (data) => {
          pushHintNotification(data.hintText);
          if (data.helpAvailable) setHelpAvailableByStep((prev) => ({ ...prev, [currentTaskKey]: true }));
        },
      }
    );
  };

  const handleRequestHelp = () => {
    if (!currentStep || !currentTaskKey) return;
    requestHelp.mutate(
      { stepId: currentStep, microStepId: usingMicroSteps ? currentMicroStep : null },
      { onSuccess: (data) => setHelpRevealByStep((prev) => ({ ...prev, [currentTaskKey]: data })) }
    );
  };

  const unreadHintCount = hintNotifications.filter((n) => !n.read).length;

  const submitAction = () => {
    if (!step || !currentStep || !currentTaskKey) return;
    if (isMeasurementCheckUnit && measurementInput.trim() === "") return;

    logAction.mutate(
      {
        stepId: currentStep,
        microStepId: usingMicroSteps ? currentMicroStep : null,
        // Placeholder claim only — the server always determines the real actionType itself, from
        // what's actually on the live bench (session.labRunId) against the current Current Task's
        // (or, for an unmigrated step, the whole step's) requiredEquipment/requiredChemicalsForStep,
        // so a wrong guess here can never advance anything. See evaluateOnBench / logAction in
        // session.controller.js.
        actionType: "correct",
        timeTaken: Math.round((Date.now() - stepStartedAt) / 1000),
        // Only meaningful for a measurement-check task — the student's typed calculated answer,
        // checked server-side against the bench's own reading (see resolvePhysicsMeasurement).
        ...(isMeasurementCheckUnit ? { quantity: parseFloat(measurementInput) } : {}),
      },
      {
        onSuccess: ({ data, meta }) => {
          setReactionResult(meta.reactionResult);
          if (meta.intervention) pushHintNotification(meta.intervention.hint);
          if (meta.helpAvailable) setHelpAvailableByStep((prev) => ({ ...prev, [currentTaskKey]: true }));

          if (data.actionType === "correct") {
            setFeedback({ ok: true, message: "Correct — well done." });
            setTimeout(() => {
              if (meta.currentStep > totalSteps) {
                completeSession.mutate(undefined, {
                  onSuccess: () => router.replace(`/(tabs)/lab/${experimentId}/report?sessionId=${sessionId}` as never),
                });
              } else {
                // Always sync both from the server's authoritative position — whether this
                // advanced to a new Main Step (microStep resets to 1 server-side) or just the
                // next Current Task within the same step, this is the single place that moves
                // the student forward.
                setCurrentStep(meta.currentStep);
                setCurrentMicroStep(meta.currentMicroStep);
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
  // Proactive Tutor flags (e.g. heating an empty container) land in the Hint Center too, same as
  // mistake-triggered hints — not just from step mistakes.
  const handleBenchOutcome = ({ reactionResult, intervention: benchIntervention }: BenchActionOutcome) => {
    if (reactionResult?.found) {
      setLiveReactionResult(reactionResult);
      if (isReactionCheckUnit) submitAction();
    }
    if (benchIntervention) pushHintNotification(benchIntervention.hint);
  };

  const handleBenchToggleHeat = (instanceId: string) => {
    toggleHeat(instanceId, handleBenchOutcome);
  };

  // Only a container-role instance (beaker, test tube, dropper, ...) can receive a pour — a
  // burner/probe/stirrer/balance target is silently ignored (the source has already snapped back
  // to its spot, see useDraggableBenchItem). Role lookup lives here rather than in
  // EquipmentContainer since that component only knows this one instance, not the whole catalog.
  const handlePour = (sourceId: string, targetId: string) => {
    const target = benchEquipment.find((e) => e.instanceId === targetId);
    const targetEntry = target && LAB_EQUIPMENT_CATALOG.find((e) => e.key === target.equipmentType);
    if (targetEntry?.role !== "container") return;
    pourLiquid(sourceId, targetId, handleBenchOutcome);
  };

  if (experimentError || sessionError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["top", "bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <View className="mt-4 self-stretch">
          <Button label="Retry" onPress={() => refetchSession()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (experimentLoading || sessionLoading || currentStep === null) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!step) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      {isCircuitStep ? (
        // Electricity (Phase B): a fixed slot-based board, sibling to (not a mode of) LabWorkspace
        // — it owns its own component shelf internally, unlike the chemistry/mechanics bench below.
        <View style={{ flex: 1, minHeight: 320 }}>
          <CircuitBoard boardId={currentBoardId as string} physicsEquipment={circuitPhysicsEquipment} dispatch={circuitDispatch} />
        </View>
      ) : (
        <>
          {/* Equipment shelf — top. Draggable spawners: drop one onto the bench below to place a
              brand new instance there (multiple of the same type are allowed). */}
          <View className="py-3 border-b" style={{ borderColor: colors.borderColorLight }}>
            <View className="flex-row items-center gap-1.5 px-4 mb-2">
              <FlaskConical size={12} color="#979797" />
              <Text className="font-amedium text-xs text-muted">EQUIPMENT SET — drag onto the bench</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {availableEquipment.map((e) => (
                <EquipmentShelfItem
                  key={e.key}
                  equipmentType={e.key}
                  label={e.label}
                  Visual={e.Visual}
                  resolveBenchPosition={resolveBenchPosition}
                  onDroppedOnBench={createShelfEquipment}
                  onHoverChange={setIsDraggingEquipmentOverBench}
                />
              ))}
            </ScrollView>
          </View>

          {/* Practical workspace — the live bench, with the materials shelf docked to its left as a
              vertical sidebar instead of a horizontal strip below the step guidance (which used to
              fight that section for vertical space and get covered by it on shorter screens). Row so
              the sidebar and bench share this section's height; flex: 1 so the row claims whatever's
              left over after the equipment shelf and guidance panel take what they need. */}
          <View style={{ flex: 1, flexDirection: "row", minHeight: 320 }}>
            {/* Materials sidebar — vertical scroll. Draggable bottles: drop one onto a bench container to add it. */}
            <View className="border-r" style={{ width: 92, borderColor: colors.borderColorLight }}>
              <View className="items-center pt-3 pb-2 px-1">
                <Droplet size={14} color="#979797" />
                <Text className="font-amedium text-[9px] text-muted text-center mt-1">MATERIALS</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingBottom: 12, gap: 12 }}>
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

            <View
              ref={benchRef}
              className="bg-bg-soft flex-1"
              style={{
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
                resolveDropTarget={resolveDropTarget}
                onPour={handlePour}
                physicsEquipment={mechanicsPhysicsEquipment}
                physicsDispatch={physicsDispatch}
              />
              {benchEquipment.length === 0 && mechanicsPhysicsEquipment.length === 0 && (
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
          </View>
        </>
      )}

      {/* Experiment area — step guidance, hints, and results. Bounded (not flex) and internally
          scrollable so it never competes with the lab bench above for vertical space. */}
      <ScrollView style={{ maxHeight: 220 }} className="px-4 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressSteps totalSteps={totalSteps} currentStep={currentStep} />
        <ProgressStepsCaption totalSteps={totalSteps} currentStep={currentStep} />
        <Text className="text-xl font-amedium mt-2 text-ink">{step.title}</Text>
        <Text className="font-aregular text-muted mt-1">{step.instruction}</Text>

        {/* CURRENT TASK — the one action the student needs to figure out right now. Deliberately
            never shows the rest of step.microSteps (future tasks stay hidden, per the "student
            reasons about the answer" design) — only the single entry matching currentMicroStep.
            Absent entirely for a step with no microSteps, where the Main Step above is the whole
            picture, exactly as before this feature existed. */}
        {currentTask && (
          <View className="mt-3 p-3 rounded-2xl bg-indigo-50">
            <Text className="font-amedium text-xs text-indigo-500">CURRENT TASK</Text>
            <Text className="font-amedium text-indigo-900 mt-1">{currentTask.studentPrompt}</Text>
          </View>
        )}

        {isReactionCheckUnit && (
          <View className="mt-4 p-3 rounded-2xl bg-blue-50">
            <Text className="font-amedium text-blue-900">Perform this on the bench above</Text>
            <Text className="font-aregular text-blue-800 mt-1">
              Drag the right materials into your equipment — this completes automatically once
              the reaction actually happens.
            </Text>
          </View>
        )}

        {isMeasurementCheckUnit && (
          <View className="mt-4 p-3 rounded-2xl bg-blue-50">
            <Text className="font-amedium text-blue-900 mb-2">Enter your calculated answer</Text>
            <TextInput
              className="px-3 py-2.5 rounded-xl border font-aregular bg-white"
              style={{ borderColor: colors.borderColorLight, color: colors.primaryBlack }}
              keyboardType="decimal-pad"
              value={measurementInput}
              onChangeText={setMeasurementInput}
              placeholder="e.g. 9.8"
            />
          </View>
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
        <View style={{ position: "relative" }}>
          {/* Single entry point for all AI guidance — opens the Hint Center rather than revealing
              anything inline; the badge is the only thing that appears unprompted. */}
          <Pressable
            onPress={openHintCenter}
            className="px-4 py-3 rounded-2xl border items-center justify-center border-border"
          >
            <Lightbulb size={20} color={colors.primary} />
          </Pressable>

          {unreadHintCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                borderWidth: 2,
                borderColor: "white",
              }}
            >
              <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
                {unreadHintCount > 9 ? "9+" : unreadHintCount}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <Button
            label={
              logAction.isPending
                ? "Checking..."
                : isReactionCheckUnit
                  ? "Check"
                  : isMeasurementCheckUnit
                    ? "Submit Answer"
                    : "Mark as Done"
            }
            onPress={submitAction}
            disabled={logAction.isPending || (isMeasurementCheckUnit && measurementInput.trim() === "")}
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

      <HintCenterPanel
        visible={hintCenterOpen}
        notifications={hintNotifications}
        onClose={() => setHintCenterOpen(false)}
        onRequestHint={handleRequestHint}
        requestingHint={requestHint.isPending}
        helpAvailable={!!(currentTaskKey && helpAvailableByStep[currentTaskKey])}
        onRequestHelp={handleRequestHelp}
        requestingHelp={requestHelp.isPending}
        helpReveal={(currentTaskKey && helpRevealByStep[currentTaskKey]) || null}
      />

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
