// --- Liquid-transfer instruments (dropper first; pipette/burette later) ---
// Mirrors equipmentInstanceSchema.transfer on the backend (see liquidTransferService.js). The
// LabRun stays authoritative — this is only the shape the workspace reads to drive the UI.

export type TransferInstrumentStatus =
  | "empty"
  | "positioned_in_source"
  | "filled"
  | "positioned_over_target"
  | "dispensing"
  | null;

export type TransferStateType = {
  status: TransferInstrumentStatus;
  contents: { chemical: string; volume: number | null }[];
  capacity: number | null;
  sourceInstanceId: string | null;
  lastSourceInstanceId: string | null;
  targetInstanceId: string | null;
  contaminated: boolean;
};
