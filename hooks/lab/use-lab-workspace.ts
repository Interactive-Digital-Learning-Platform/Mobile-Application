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

  const createEquipment = (equipmentType: string, position: { x: number; y: number }) => {
    const instanceId = `${equipmentType}-${Date.now()}`;
    logAction.mutate({ actionType: "create_equipment", instanceId, equipmentType, position });
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
    createEquipment,
    moveEquipment,
    removeEquipment,
    addChemical,
    toggleHeat,
    probeMeasure,
    probeDetach,
  };
};
