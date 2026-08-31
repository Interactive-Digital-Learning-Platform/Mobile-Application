import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { CheckCircle2, FlaskConical } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import {
  containerCapacityOptions,
  defaultContainerCapacity,
  friendlyEquipmentName,
  LAB_EQUIPMENT_CATALOG,
  resolveContainerAppearance,
} from "@/constants/lab/equipment.constants";
import { rendersAsTransferInstrument } from "@/constants/lab/transfer.constants";
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
import { BenchActionOutcome, BenchObservation, useLabWorkspace } from "@/hooks/lab/use-lab-workspace";
import { useDropTargetRegistry } from "@/hooks/lab/use-drop-target-registry";
import LabWorkspace from "@/components/lab/LabWorkspace";
import CircuitBoard from "@/components/lab/CircuitBoard";
import EducationalInfoPanel from "@/components/lab/panels/EducationalInfoPanel";
import HintCenterPanel from "@/components/lab/panels/HintCenterPanel";
import ChemicalInspectPanel from "@/components/lab/chemicals/ChemicalInspectPanel";
import CompoundBuilder from "@/components/lab/chemicals/CompoundBuilder";
import EquipmentInspectPanel from "@/components/lab/equipment/EquipmentInspectPanel";
import LabExperimentHeader from "@/components/lab/workspace/LabExperimentHeader";
import LabEquipmentShelf from "@/components/lab/workspace/LabEquipmentShelf";
import LabMaterialsDrawer from "@/components/lab/workspace/LabMaterialsDrawer";
import BenchStage from "@/components/lab/workspace/BenchStage";
import ContainerSizeSheet from "@/components/lab/workspace/ContainerSizeSheet";
import TransferActionSheet from "@/components/lab/transfer/TransferActionSheet";
import GuidedStepPanel from "@/components/lab/workspace/GuidedStepPanel";
import LabActionBar from "@/components/lab/workspace/LabActionBar";
import DevWalkthroughOverlay from "@/components/lab/dev/DevWalkthroughOverlay"; // DEV ONLY — remove before shipping
import { ObservationBanner, ObservationChangeBanner, SafetyBanner, TutorInsightBanner } from "@/components/lab/workspace/LabInterventionBanners";
import {
  ChemicalType,
  CurriculumReferenceType,
  HelpRevealType,
  HintNotificationType,
  InterventionType,
  ReactionResultType,
} from "@/types/lab";

// Server intervention types that are a safety concern rather than a nudge — these get the
// distinct, must-acknowledge Safety banner; every other intervention type is a Tutor Insight.
const SAFETY_INTERVENTION_TYPES = ["heating_empty_container", "unnecessary_heat"];

export default function Workspace() {
  const { experimentId, sessionId } = useLocalSearchParams<{ experimentId: string; sessionId: string }>();
  const { data: experiment, isLoading: experimentLoading, isError: experimentError } = useExperiment(experimentId);
  const { data: session, isLoading: sessionLoading, isError: sessionError, refetch: refetchSession } = useSession(sessionId);
  const { data: allChemicals } = useChemicals({});

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [currentMicroStep, setCurrentMicroStep] = useState<number | null>(null);
  const [hintNotifications, setHintNotifications] = useState<HintNotificationType[]>([]);
  const [hintCenterOpen, setHintCenterOpen] = useState(false);
  const [helpAvailableByStep, setHelpAvailableByStep] = useState<Record<string, boolean>>({});
  const [helpRevealByStep, setHelpRevealByStep] = useState<Record<string, HelpRevealType>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [reactionResult, setReactionResult] = useState<ReactionResultType | null>(null);
  const [measurementInput, setMeasurementInput] = useState("");
  const [stepStartedAt, setStepStartedAt] = useState(Date.now());
  const [labRunId, setLabRunId] = useState<string | undefined>(undefined);
  const [liveReactionResult, setLiveReactionResult] = useState<ReactionResultType | null>(null);
  // A live reaction shows an "Observation detected" banner first; the Educational Info Panel only
  // opens once the student taps "Explore why" — observe first, theory second.
  const [showObservationInfo, setShowObservationInfo] = useState(false);
  const [inspectChemical, setInspectChemical] = useState<ChemicalType | null>(null);
  const [inspectEquipmentId, setInspectEquipmentId] = useState<string | null>(null);
  const [hoveredEquipmentId, setHoveredEquipmentId] = useState<string | null>(null);
  const [isDraggingEquipmentOverBench, setIsDraggingEquipmentOverBench] = useState(false);
  // Drives the pour choreography (source tilt + connecting stream) — LabWorkspace reads it.
  const [pourEvent, setPourEvent] = useState<{ sourceId: string; targetId: string; nonce: number; color: string } | null>(null);
  // Which container a probe (pH meter) is currently in — drives the "being measured" ring.
  const [probeTargetId, setProbeTargetId] = useState<string | null>(null);
  // The transfer instrument (dropper) the action panel is acting on, and how many drops it has
  // released since it was last filled.
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [dropCount, setDropCount] = useState(0);
  // A buildable compound the student picked in the in-lab Material Library but hasn't built yet —
  // hands off to the Compound Builder, then adds the built compound to the lab inventory.
  const [builderTarget, setBuilderTarget] = useState<ChemicalType | null>(null);
  // Bumped to open the in-workspace Material Library from outside the drawer (Hint Center's
  // "Open Material Library" action when a hint flags a missing material).
  const [materialLibrarySignal, setMaterialLibrarySignal] = useState(0);
  // Proactive intervention surfaces — a transient Tutor Insight banner, or a persistent Safety
  // banner. The hint text is ALSO queued into the Hint Center (history), same as before.
  const [tutorBanner, setTutorBanner] = useState<string | null>(null);
  const [safetyBanner, setSafetyBanner] = useState<string | null>(null);
  // A backend observableState change that isn't a catalogued reaction (e.g. an indicator colour
  // change) — surfaced as a compact Observation banner so the text always matches the visual.
  const [observationNote, setObservationNote] = useState<BenchObservation>(null);

  const logAction = useLogStepAction(sessionId);
  const requestHint = useRequestStepHint(sessionId);
  const requestHelp = useRequestStepHelp(sessionId);
  const completeSession = useCompleteSession(sessionId);

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
    labRun,
    createEquipment,
    moveEquipment,
    removeEquipment,
    addChemical,
    addMaterialToLab,
    pourLiquid,
    toggleHeat,
    probeMeasure,
    probeDetach,
    insertTransferTool,
    loadTransferTool,
    aspirate,
    dispense,
    isActionPending,
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

  const isPhysicsExperiment = experiment?.subject === "Physics";
  // Resizable containers ask for a capacity first (ContainerSizeSheet); everything else places
  // straight away.
  const [pendingContainer, setPendingContainer] = useState<{ equipmentType: string; position: { x: number; y: number } } | null>(null);
  const handleShelfDrop = (equipmentType: string, position: { x: number; y: number }) => {
    if (isPhysicsExperiment) return createPhysicsEquipment(equipmentType, position);
    if (containerCapacityOptions(equipmentType).length > 0) return setPendingContainer({ equipmentType, position });
    createEquipment(equipmentType, position);
  };
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
  const mechanicsPhysicsEquipment = benchPhysicsEquipment.filter((e) => !e.role);
  const circuitPhysicsEquipment = benchPhysicsEquipment.filter((e) => !!e.role);
  const { register: registerEquipmentRef, resolveDropTarget } = useDropTargetRegistry();
  const { register: registerLiquidRegion, resolveDropTarget: resolveLiquidRegion } = useDropTargetRegistry();

  useEffect(() => {
    if (session && currentStep === null) {
      setCurrentStep(session.currentStep);
      setCurrentMicroStep(session.currentMicroStep ?? 1);
    }
  }, [session, currentStep]);

  // Auto-dismiss the transient Tutor Insight banner; the Safety banner stays until acknowledged.
  useEffect(() => {
    if (!tutorBanner) return;
    const t = setTimeout(() => setTutorBanner(null), 12000);
    return () => clearTimeout(t);
  }, [tutorBanner]);

  useEffect(() => {
    if (!observationNote) return;
    const t = setTimeout(() => setObservationNote(null), 11000);
    return () => clearTimeout(t);
  }, [observationNote]);

  const chemicalMap = useMemo(() => {
    const map: Record<string, ChemicalType> = {};
    (allChemicals || []).forEach((c) => {
      map[c._id] = c;
    });
    return map;
  }, [allChemicals]);

  // "On Hand" materials come from the LabRun's physical inventory (LabRun.materials) — seeded
  // from the confirmed initial selection and grown by the in-lab Material Library. Fall back to
  // the Session's selection for a legacy run whose inventory was never seeded (backward compat).
  const builtChemicalIds = (session?.builtCompounds || []).filter((b) => b.completedAt).map((b) => b.chemical);
  const confirmedChemicalIds = [...(session?.chemicalSelection?.selected || []), ...builtChemicalIds];
  const onHandChemicalIds =
    labRun?.materials && labRun.materials.length > 0
      ? labRun.materials.map((m) => m.chemical)
      : confirmedChemicalIds;
  const onHandChemicals = (allChemicals || []).filter((c) => onHandChemicalIds.includes(c._id));
  const availableEquipment = LAB_EQUIPMENT_CATALOG.filter(
    (e) => !!experiment && e.subjects.includes(experiment.subject as "Chemistry" | "Physics" | "Biology")
  );
  const step = experiment?.steps.find((s) => s.stepId === currentStep);
  const totalSteps = experiment?.steps.length || 0;
  const inspectEquipmentInstance = benchEquipment.find((e) => e.instanceId === inspectEquipmentId) || null;
  const currentBoardId = step?.circuitBoardId || null;
  const isCircuitStep = !!currentBoardId;

  const sortedMicroSteps = step?.microSteps?.length ? [...step.microSteps].sort((a, b) => a.microStepId - b.microStepId) : [];
  const usingMicroSteps = sortedMicroSteps.length > 0;
  const currentTask = usingMicroSteps ? sortedMicroSteps.find((ms) => ms.microStepId === currentMicroStep) || null : null;
  const currentTaskIndex = usingMicroSteps
    ? sortedMicroSteps.findIndex((ms) => ms.microStepId === currentMicroStep) + 1
    : null;
  const isReactionCheckUnit = usingMicroSteps ? !!currentTask?.requiresReactionCheck : step?.actionType === "mix";
  const isMeasurementCheckUnit = usingMicroSteps ? !!currentTask?.requiresMeasurementCheck : false;
  const taskKey = (stepId: number, microStepId: number | null) => `${stepId}:${microStepId ?? 0}`;
  const currentTaskKey = currentStep !== null ? taskKey(currentStep, usingMicroSteps ? currentMicroStep : null) : null;

  // Contextual verification label — the backend verifies the live LabRun, so this is never
  // "Mark as Done". Derived from task/step metadata, not hardcoded per experiment.
  const checkLabel = useMemo(() => {
    if (isCircuitStep) return "Check Circuit";
    if (isReactionCheckUnit) return "Check Reaction";
    if (isMeasurementCheckUnit) return "Check Measurement";
    switch (step?.actionType) {
      case "measure":
        return "Check Measurement";
      case "observe":
      case "record":
        return "Check Observation";
      case "calculate":
        return "Check Answer";
      default:
        return "Check My Work";
    }
  }, [isCircuitStep, isReactionCheckUnit, isMeasurementCheckUnit, step?.actionType]);

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

  const resetStepUI = () => {
    setFeedback(null);
    setReactionResult(null);
    setMeasurementInput("");
    setStepStartedAt(Date.now());
  };

  const taskPositionRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentTaskKey === null) return;
    if (taskPositionRef.current !== null && taskPositionRef.current !== currentTaskKey) {
      setHintNotifications([]);
      setTutorBanner(null);
      setSafetyBanner(null);
      setObservationNote(null);
      setLiveReactionResult(null);
      setShowObservationInfo(false);
      setActiveTransferId(null);
    }
    taskPositionRef.current = currentTaskKey;
  }, [currentTaskKey]);

  const pushHintNotification = (
    message: string,
    suggestedAction?: "open_material_library" | null,
    curriculumReference?: CurriculumReferenceType | null,
  ) => {
    setHintNotifications((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        suggestedAction: suggestedAction ?? null,
        curriculumReference: curriculumReference ?? null,
      },
    ]);
  };

  // Proactive interventions: queue into the Hint Center (history) AND surface as a banner —
  // Safety vs Tutor Insight by type. Student-requested hints do NOT come through here.
  const surfaceIntervention = (intervention: InterventionType) => {
    if (!intervention) return;
    pushHintNotification(intervention.hint, intervention.suggestedAction, intervention.curriculumReference);
    if (SAFETY_INTERVENTION_TYPES.includes(intervention.type)) setSafetyBanner(intervention.hint);
    else setTutorBanner(intervention.hint);
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
          pushHintNotification(data.hintText, data.suggestedAction, data.curriculumReference);
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
        actionType: "correct",
        timeTaken: Math.round((Date.now() - stepStartedAt) / 1000),
        ...(isMeasurementCheckUnit ? { quantity: parseFloat(measurementInput) } : {}),
      },
      {
        onSuccess: ({ data, meta }) => {
          setReactionResult(meta.reactionResult);
          if (meta.intervention) surfaceIntervention(meta.intervention);
          if (meta.helpAvailable) setHelpAvailableByStep((prev) => ({ ...prev, [currentTaskKey]: true }));

          if (data.actionType === "correct") {
            setFeedback({ ok: true, message: "Great work — task completed." });
            setTimeout(() => {
              if (meta.currentStep > totalSteps) {
                completeSession.mutate(undefined, {
                  onSuccess: () => router.replace(`/(tabs)/lab/${experimentId}/report?sessionId=${sessionId}` as never),
                });
              } else {
                setCurrentStep(meta.currentStep);
                setCurrentMicroStep(meta.currentMicroStep);
                resetStepUI();
              }
            }, 1400);
          } else {
            setFeedback({ ok: false, message: "That doesn't look right yet — take another look and try again." });
          }
        },
      }
    );
  };

  const handleBenchOutcome = ({ reactionResult, intervention: benchIntervention, observation }: BenchActionOutcome) => {
    if (reactionResult?.found) {
      setLiveReactionResult(reactionResult);
      if (isReactionCheckUnit) submitAction();
    }
    if (benchIntervention) surfaceIntervention(benchIntervention);
    // A pure observable change (indicator colour, precipitate) that isn't a catalogued reaction —
    // the reaction banner already covers the reaction case.
    if (observation && !reactionResult?.found) setObservationNote(observation);
  };

  const handleBenchToggleHeat = (instanceId: string) => {
    toggleHeat(instanceId, handleBenchOutcome);
  };

  // --- Liquid transfer (dropper) ---
  const activeTransfer = activeTransferId ? benchEquipment.find((e) => e.instanceId === activeTransferId) ?? null : null;
  useEffect(() => {
    setDropCount(0);
  }, [activeTransferId]);

  const handleTransferInsert = (dropperId: string, containerId: string) => {
    setActiveTransferId(dropperId);
    insertTransferTool(dropperId, containerId, handleBenchOutcome);
  };
  // Container-role instances a filled dropper can be positioned over — powers the tap fallback in
  // TransferActionSheet so a missed drag never strands the student on "move it over the container".
  const transferTargets = benchEquipment
    .filter((e) => {
      if (e.instanceId === activeTransferId) return false;
      if (rendersAsTransferInstrument(e.equipmentType)) return false; // another dropper isn't a target
      const entry = LAB_EQUIPMENT_CATALOG.find((c) => c.key === e.equipmentType);
      return entry?.role === "container";
    })
    .map((e) => ({ instanceId: e.instanceId, label: friendlyEquipmentName(benchEquipment, e.instanceId) || "the container" }));
  const handleFill = () => {
    if (!activeTransferId) return;
    setDropCount(0);
    aspirate(activeTransferId, handleBenchOutcome);
  };
  const handleDrop = () => {
    if (!activeTransferId) return;
    setDropCount((c) => c + 1);
    dispense(activeTransferId, undefined, handleBenchOutcome);
  };

  const handlePour = (sourceId: string, targetId: string) => {
    const target = benchEquipment.find((e) => e.instanceId === targetId);
    const targetEntry = target && LAB_EQUIPMENT_CATALOG.find((e) => e.key === target.equipmentType);
    if (targetEntry?.role !== "container") return;

    // Capture the pour colour now (the server empties the source, so it's gone after the refetch)
    // and let LabWorkspace play the tilt + stream. Purely visual — the server action is unchanged.
    const src = benchEquipment.find((e) => e.instanceId === sourceId);
    const srcChemicals = (src?.contents || []).map((c) => chemicalMap[c.chemical]).filter(Boolean);
    const color =
      resolveContainerAppearance(src?.observableState, srcChemicals)?.color || "#9CA3AF";
    const nonce = Date.now();
    setPourEvent({ sourceId, targetId, nonce, color });
    setTimeout(() => setPourEvent((p) => (p?.nonce === nonce ? null : p)), 1000);

    pourLiquid(sourceId, targetId, handleBenchOutcome);
  };

  if (experimentError || sessionError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50 px-8" edges={["top", "bottom"]}>
        <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t reach the server</Text>
        <TouchableOpacity className="mt-4 bg-primary px-6 py-3 rounded-xl" activeOpacity={0.85} onPress={() => refetchSession()}>
          <Text className="text-white text-sm font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (experimentLoading || sessionLoading || currentStep === null || !step) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  const benchEmpty = benchEquipment.length === 0 && mechanicsPhysicsEquipment.length === 0;

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <LabExperimentHeader title={experiment?.title ?? "Experiment"} onExit={() => router.back()} />

      {isCircuitStep ? (
        <View style={{ flex: 1, minHeight: 320 }}>
          <CircuitBoard boardId={currentBoardId as string} physicsEquipment={circuitPhysicsEquipment} dispatch={circuitDispatch} />
        </View>
      ) : (
        <>
          <LabEquipmentShelf
            items={availableEquipment}
            resolveBenchPosition={resolveBenchPosition}
            onDropped={handleShelfDrop}
            onHoverChange={setIsDraggingEquipmentOverBench}
          />

          <BenchStage ref={benchRef} highlighted={isDraggingEquipmentOverBench}>
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
              onHoverChange={setHoveredEquipmentId}
              resolveDropTarget={resolveDropTarget}
              onPour={handlePour}
              pourEvent={pourEvent}
              probeTargetId={probeTargetId}
              onProbeTargetChange={setProbeTargetId}
              onTransferInsert={handleTransferInsert}
              onTransferActivate={setActiveTransferId}
              physicsEquipment={mechanicsPhysicsEquipment}
              physicsDispatch={physicsDispatch}
            />

            {benchEmpty && (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
                pointerEvents="none"
              >
                <FlaskConical size={28} color={ICON_COLORS.slate400} />
                <Text className="text-[13px] text-slate-400 mt-2">Drag equipment here to begin</Text>
              </Animated.View>
            )}

            <LabMaterialsDrawer
              onHand={onHandChemicals}
              catalog={allChemicals || []}
              builtCompoundIds={builtChemicalIds}
              busy={isActionPending}
              openLibrarySignal={materialLibrarySignal}
              onAddMaterial={(chemicalId) => addMaterialToLab(chemicalId)}
              onBuildCompound={setBuilderTarget}
              resolveDropTarget={resolveDropTarget}
              onDropChemical={(chemical, instanceId) => {
                const target = benchEquipment.find((e) => e.instanceId === instanceId);
                // Dropped onto a dropper → fill the dropper straight from the reagent bottle
                // (indicators / stock reagents come in a dropper bottle).
                if (target && rendersAsTransferInstrument(target.equipmentType)) {
                  setActiveTransferId(instanceId);
                  loadTransferTool(instanceId, chemical._id, handleBenchOutcome);
                  return;
                }
                const isSolid = chemical.state === "solid";
                const cap = target?.capacity;
                // Half-fill a sized vessel; fall back to the old fixed amount for fixed-size ones.
                const amount = isSolid ? 5 : cap ? Math.max(2, Math.round(cap * 0.45)) : 50;
                addChemical(instanceId, chemical._id, amount, isSolid ? "g" : "mL", handleBenchOutcome);
              }}
              onInspectChemical={setInspectChemical}
              onHoverChange={setHoveredEquipmentId}
            />

            {pendingContainer && (
              <ContainerSizeSheet
                label={LAB_EQUIPMENT_CATALOG.find((e) => e.key === pendingContainer.equipmentType)?.label ?? "vessel"}
                options={containerCapacityOptions(pendingContainer.equipmentType)}
                onPick={(ml) => {
                  createEquipment(pendingContainer.equipmentType, pendingContainer.position, ml);
                  setPendingContainer(null);
                }}
                onCancel={() => {
                  createEquipment(
                    pendingContainer.equipmentType,
                    pendingContainer.position,
                    defaultContainerCapacity(pendingContainer.equipmentType)
                  );
                  setPendingContainer(null);
                }}
              />
            )}

            {activeTransfer && !pendingContainer && (
              <TransferActionSheet
                instance={activeTransfer}
                chemicalMap={chemicalMap}
                dropCount={dropCount}
                busy={isActionPending}
                targets={transferTargets}
                onFill={handleFill}
                onDispense={handleDrop}
                onPositionOver={(containerId) => handleTransferInsert(activeTransfer.instanceId, containerId)}
                onClose={() => setActiveTransferId(null)}
              />
            )}
          </BenchStage>
        </>
      )}

      {safetyBanner && <SafetyBanner message={safetyBanner} onAcknowledge={() => setSafetyBanner(null)} />}
      {tutorBanner && !safetyBanner && <TutorInsightBanner message={tutorBanner} onDismiss={() => setTutorBanner(null)} />}
      {observationNote && !safetyBanner && !liveReactionResult?.found && (
        <ObservationChangeBanner
          description={observationNote.description}
          swatchColor={observationNote.liquidColor}
          onDismiss={() => setObservationNote(null)}
        />
      )}
      {liveReactionResult?.found && !showObservationInfo && !safetyBanner && (
        <ObservationBanner
          reactionName={liveReactionResult.reaction.name}
          onExplore={() => setShowObservationInfo(true)}
          onDismiss={() => setLiveReactionResult(null)}
        />
      )}

      <ScrollView style={{ maxHeight: 210 }} className="bg-white px-4 pt-3" showsVerticalScrollIndicator={false}>
        <GuidedStepPanel
          stepTitle={step.title}
          stepInstruction={step.instruction}
          totalSteps={totalSteps}
          currentStep={currentStep}
          taskPrompt={currentTask?.studentPrompt ?? null}
          taskIndex={currentTaskIndex}
          taskTotal={usingMicroSteps ? sortedMicroSteps.length : null}
          measurement={
            isMeasurementCheckUnit ? { value: measurementInput, onChange: setMeasurementInput } : null
          }
        />

        {isReactionCheckUnit && (
          <View className="mt-3 p-3 rounded-2xl bg-blue-50">
            <Text className="text-[13px] font-bold text-blue-900">Perform this on the bench above</Text>
            <Text className="text-[12px] text-blue-800 leading-4 mt-1">
              Add the right materials to your equipment — this completes automatically when the reaction happens.
            </Text>
          </View>
        )}

        {feedback && (
          <View className={`mt-3 p-3 rounded-2xl flex-row items-center gap-2 ${feedback.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
            {feedback.ok && <CheckCircle2 size={16} color="#059669" />}
            <Text className={`text-[13px] font-bold flex-1 ${feedback.ok ? "text-emerald-800" : "text-amber-900"}`}>
              {feedback.message}
              {feedback.ok ? "  ·  Preparing your next task…" : ""}
            </Text>
          </View>
        )}

        {reactionResult?.found && (
          <View className="mt-3 p-3.5 rounded-2xl bg-slate-100">
            <Text className="text-[13px] font-bold text-slate-800">{reactionResult.reaction.name}</Text>
            <Text className="text-[13px] font-semibold text-primary mt-1">{reactionResult.reaction.balancedEquation}</Text>
            <Text className="text-[12px] text-slate-500 leading-4 mt-1">{reactionResult.reaction.educationalInfo.explanation}</Text>
          </View>
        )}

        <View className="h-3" />
      </ScrollView>

      <LabActionBar
        checkLabel={checkLabel}
        onCheck={submitAction}
        checking={logAction.isPending}
        checkDisabled={isMeasurementCheckUnit && measurementInput.trim() === ""}
        onOpenHints={openHintCenter}
        unreadHintCount={unreadHintCount}
      />

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
        onOpenMaterialLibrary={() => {
          setHintCenterOpen(false);
          setMaterialLibrarySignal((n) => n + 1);
        }}
      />

      <EducationalInfoPanel
        result={showObservationInfo ? liveReactionResult : null}
        onClose={() => {
          setShowObservationInfo(false);
          setLiveReactionResult(null);
        }}
      />

      <ChemicalInspectPanel chemical={inspectChemical} onClose={() => setInspectChemical(null)} />

      <EquipmentInspectPanel
        instance={inspectEquipmentInstance}
        chemicalMap={chemicalMap}
        friendlyName={inspectEquipmentId ? friendlyEquipmentName(benchEquipment, inspectEquipmentId) : undefined}
        onClose={() => setInspectEquipmentId(null)}
        onRemove={removeEquipment}
      />

      {/* DEV ONLY — floating cheat sheet showing exactly how to complete this practical.
          Renders nothing outside __DEV__. Remove before shipping (grep "DevWalkthrough"). */}
      <DevWalkthroughOverlay
        experimentId={experimentId}
        currentStep={currentStep}
        currentMicroStep={usingMicroSteps ? currentMicroStep : null}
      />

      {/* Buildable compound picked from the in-lab Material Library — build it, then bring the
          built compound into the live lab. Progress/session/micro-step are untouched throughout. */}
      {builderTarget && (
        <CompoundBuilder
          experimentId={experimentId}
          sessionId={sessionId}
          compoundId={builderTarget._id}
          onClose={() => setBuilderTarget(null)}
          onBuilt={(compoundId) => {
            addMaterialToLab(compoundId);
            setBuilderTarget(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}
