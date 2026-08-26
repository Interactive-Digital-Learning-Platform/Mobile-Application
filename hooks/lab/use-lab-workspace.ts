import { useLabRun, useLogLabAction } from "@/hooks/lab/use-lab-run";
import { EquipmentInstanceType, InterventionType, LastMeasurementType, ReactionResultType } from "@/types/lab";

export type BenchActionOutcome = { reactionResult: ReactionResultType | null; intervention: InterventionType };

// Thin action-dispatch layer over the real LabRun backend (see labRun.controller.js) — replaces
// the old local-only useState prototype. Every call here is a real POST to /api/lab/runs/:id/action,
// so the bench state is authoritative on the server, not just in this component tree.
export const useLabWorkspace = (labRunId: string | undefined) => {
  const { data: labRun, isLoading, isError, refetch } = useLabRun(labRunId);
  const logAction = useLogLabAction(labRunId);

  const equipment = labRun?.equipment || [];
  const physicsEquipment = labRun?.physicsEquipment || [];

  const createEquipment = (equipmentType: string, position: { x: number; y: number }) => {
    const instanceId = `${equipmentType}-${Date.now()}`;
    logAction.mutate({ actionType: "create_equipment", instanceId, equipmentType, position });
  };

  // Physics (Mechanics) — routes into labRun.physicsEquipment on the server (see the
  // create_equipment case's category branch in labRun.controller.js). move_equipment/
  // remove_equipment above already work for physics instances unchanged (the server checks both
  // bench-state arrays by instanceId), so only creation needs its own dispatcher.
  const createPhysicsEquipment = (equipmentType: string, position: { x: number; y: number }) => {
    const instanceId = `${equipmentType}-${Date.now()}`;
    logAction.mutate({ actionType: "create_equipment", instanceId, equipmentType, position, category: "physics" });
  };

  const attachMass = (instanceId: string, massGrams: number) => {
    logAction.mutate({ actionType: "attach_mass", instanceId, quantity: massGrams });
  };

  // Generic length setter — a pendulum's string length or a spring's natural length, both stored
  // in the same physicsInstanceSchema.length field (see set_pendulum_length/set_length in
  // labRun.controller.js).
  const setLength = (instanceId: string, lengthCm: number) => {
    logAction.mutate({ actionType: "set_length", instanceId, quantity: lengthCm });
  };

  const setReleaseAngle = (instanceId: string, angleDeg: number) => {
    logAction.mutate({ actionType: "set_release_angle", instanceId, quantity: angleDeg });
  };

  const startTimer = (instanceId: string) => {
    logAction.mutate({ actionType: "start_timer", instanceId });
  };

  const recordOscillation = (instanceId: string) => {
    logAction.mutate({ actionType: "record_oscillation", instanceId });
  };

  const stopTimer = (instanceId: string, onOutcome?: (updated: import("@/types/lab").PhysicsInstanceType | undefined) => void) => {
    logAction.mutate(
      { actionType: "stop_timer", instanceId },
      {
        onSuccess: (result) => {
          const updated = result.labRun.physicsEquipment.find((e) => e.instanceId === instanceId);
          onOutcome?.(updated);
        },
      }
    );
  };

  // Generic apparatus reading — a balance's mass, a measuring cylinder's initial/final water
  // level (needs `phase`), or a spring's stretched length. See read_measurement in
  // labRun.controller.js for what each equipmentType does with the value.
  const readMeasurement = (
    instanceId: string,
    quantity: number,
    options?: { unit?: string; phase?: "initial" | "final" }
  ) => {
    logAction.mutate({ actionType: "read_measurement", instanceId, quantity, ...options });
  };

  // Electricity (Phase B) — creates a circuit component (resistor/ammeter/voltmeter) AND places
  // it into a board slot in one call. The two are sequenced (place fires only once create's
  // mutation has actually landed) rather than fired concurrently, since both mutate the same
  // LabRun document server-side — firing them in parallel risks place_component's findOne()
  // running before create_equipment's save() has completed.
  const createAndPlaceComponent = async (equipmentType: string, slotId: string, boardId: string) => {
    const instanceId = `${equipmentType}-${Date.now()}`;
    // Awaiting (rather than nesting the second mutate() inside the first's onSuccess) matters:
    // both calls share the same logAction mutation observer, and calling mutate() again from
    // inside that observer's own onSuccess resets its internal mutateOptions mid-notify, which
    // crashes with "Cannot read property 'onSettled' of undefined". Awaiting mutateAsync lets the
    // first call's notify cycle fully finish before the second mutate() fires.
    await logAction.mutateAsync({ actionType: "create_equipment", instanceId, equipmentType, category: "physics" });
    logAction.mutate({ actionType: "place_component", instanceId, slotId, boardId });
  };

  const placeComponent = (instanceId: string, slotId: string, boardId: string) => {
    logAction.mutate({ actionType: "place_component", instanceId, slotId, boardId });
  };

  const removeComponent = (instanceId: string) => {
    logAction.mutate({ actionType: "remove_component", instanceId });
  };

  const setComponentValue = (instanceId: string, ohms: number) => {
    logAction.mutate({ actionType: "set_component_value", instanceId, quantity: ohms });
  };

  const readMeter = (instanceId: string, onOutcome?: (updated: import("@/types/lab").PhysicsInstanceType | undefined) => void) => {
    logAction.mutate(
      { actionType: "read_meter", instanceId },
      {
        onSuccess: (result) => {
          const updated = result.labRun.physicsEquipment.find((e) => e.instanceId === instanceId);
          onOutcome?.(updated);
        },
      }
    );
  };

  const moveEquipment = (instanceId: string, position: { x: number; y: number }) => {
    logAction.mutate({ actionType: "move_equipment", instanceId, position });
  };

  const removeEquipment = (instanceId: string) => {
    logAction.mutate({ actionType: "remove_equipment", instanceId });
  };

  // onOutcome, when given, is called with this action's continuous reaction check (see
  // checkAndApplyReaction) and proactive safety check (checkSafetyIntervention) — only
  // add_chemical/heat trigger either.
  const addChemical = (
    instanceId: string,
    chemicalId: string,
    quantity?: number,
    unit?: string,
    onOutcome?: (outcome: BenchActionOutcome) => void
  ) => {
    logAction.mutate(
      { actionType: "add_chemical", instanceId, chemicalId, quantity, unit },
      { onSuccess: (result) => onOutcome?.({ reactionResult: result.reactionResult, intervention: result.intervention }) }
    );
  };

  // Pours the entirety of instanceId's contents into targetInstanceId and empties instanceId —
  // see the "pour" case in labRun.controller.js. Fires the same reaction/intervention outcome
  // callback as addChemical/toggleHeat since a pour can trigger or reveal a reaction just as
  // adding a chemical straight from a bottle can.
  const pourLiquid = (
    instanceId: string,
    targetInstanceId: string,
    onOutcome?: (outcome: BenchActionOutcome) => void
  ) => {
    logAction.mutate(
      { actionType: "pour", instanceId, targetInstanceId },
      { onSuccess: (result) => onOutcome?.({ reactionResult: result.reactionResult, intervention: result.intervention }) }
    );
  };

  const toggleHeat = (instanceId: string, onOutcome?: (outcome: BenchActionOutcome) => void) => {
    const instance = equipment.find((e) => e.instanceId === instanceId);
    logAction.mutate(
      { actionType: "heat", instanceId, heated: !instance?.isHeated },
      { onSuccess: (result) => onOutcome?.({ reactionResult: result.reactionResult, intervention: result.intervention }) }
    );
  };

  // Probe-role equipment (e.g. pH meter) — see PhMeterInstrument.tsx for the state machine that
  // calls these once its probe tip is detected overlapping a target container's liquid region.
  const probeMeasure = (
    probeInstanceId: string,
    targetInstanceId: string,
    onOutcome?: (lastMeasurement: LastMeasurementType) => void
  ) => {
    logAction.mutate(
      { actionType: "probe_measure", instanceId: probeInstanceId, targetInstanceId },
      {
        onSuccess: (result) => {
          const updated = result.labRun.equipment.find(
            (e: EquipmentInstanceType) => e.instanceId === probeInstanceId
          );
          onOutcome?.(updated?.lastMeasurement ?? null);
        },
      }
    );
  };

  const probeDetach = (probeInstanceId: string) => {
    logAction.mutate({ actionType: "probe_detach", instanceId: probeInstanceId });
  };

  return {
    labRun,
    isLoading,
    isError,
    refetch,
    equipment,
    physicsEquipment,
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
    placeComponent,
    removeComponent,
    setComponentValue,
    readMeter,
  };
};
