import { TransferInstrumentStatus } from "@/types/lab";
import { isTransferCapable } from "@/constants/lab/equipment.constants";

// Whether an equipment type is *conceptually* a liquid-transfer instrument (fill → move →
// dispense) — decided by CAPABILITY, never a hard-coded list. True for dropper/pipette/burette.
export const isTransferInstrument = (equipmentType: string): boolean => isTransferCapable(equipmentType);

// Equipment types that have a dedicated bench component built *today* (grows as PipetteInstrument /
// BuretteInstrument land in Phase 2/3). Until then, a pipette/burette on the bench falls back to
// the generic EquipmentContainer. Drives both LabWorkspace routing and the workspace's
// "drop a reagent onto the instrument to fill it" behaviour.
export const TRANSFER_INSTRUMENT_COMPONENT_KEYS: string[] = ["dropper"];
export const rendersAsTransferInstrument = (equipmentType: string): boolean =>
  TRANSFER_INSTRUMENT_COMPONENT_KEYS.includes(equipmentType);

// Student-facing one-liner for each lifecycle state.
export const TRANSFER_STATUS_LABEL: Record<Exclude<TransferInstrumentStatus, null>, string> = {
  empty: "Empty",
  positioned_in_source: "In the liquid — ready to fill",
  filled: "Filled",
  positioned_over_target: "Over the container — ready to add",
  dispensing: "Adding…",
};

// Bench render size for the dropper instrument (height, px). A dropper is a small tool, but big
// enough that the liquid column inside it is clearly visible.
export const DROPPER_ART_SIZE = 66;
