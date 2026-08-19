import { ComponentType } from "react";
import { View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { SharedValue } from "react-native-reanimated";
import { ChemicalType, ReactionResultType } from "./chemical.types";
import { EquipmentContentType, EquipmentInstanceType, LastMeasurementType } from "./lab-run.types";
import { HintNotificationType, SessionHistoryFilterType, SessionHistoryItemType } from "./session.types";

// --- Shared equipment-visual contract ---
//
// `size` is interpreted as target height, each component computes its own width from its own
// viewBox aspect ratio — so every call site (shelf pill, bench container) can just do
// `<Visual size={N} color={...} />` with no per-type special-casing.
//
// `liquidColor`/`fillLevel` are only meaningful for container-role art (beaker, test tube, etc.)
// — those components render their liquid fill INSIDE their own <Svg>, clipped to their own
// silhouette Path, so liquid can never overflow the equipment's actual shape. Non-container art
// (pH meter, burner, thermometer, stirrer, balance) simply ignores them.
export type EquipmentVisualProps = {
  size?: number;
  color?: string;
  liquidColor?: string;
  fillLevel?: number; // 0 (empty) - 1 (full), fraction of the vessel's usable height
  on?: boolean; // heat_source-role art only (BurnerArt) — whether it's actively lit. Ignored elsewhere.
  temperature?: number; // probe:temp-role art only (ThermometerArt) — instance.temperature in °C. Ignored elsewhere.
};

// --- Lab home / history ---

export type LabStatCardProps = {
  label: string;
  value: string;
  subValue?: string;
  icon?: LucideIcon;
  color?: string;
};

export type PracticalHistoryListItemProps = {
  item: SessionHistoryItemType;
  onPress?: () => void;
};

export type PracticalHistoryFilterBarProps = {
  filters: SessionHistoryFilterType;
  onChange: (next: SessionHistoryFilterType) => void;
};

// --- Workspace ---

export type LabWorkspaceProps = {
  equipment: EquipmentInstanceType[];
  chemicalMap: Record<string, ChemicalType>;
  registerEquipmentRef: (id: string) => (node: any) => void;
  registerLiquidRegion: (id: string) => (node: View | null) => void;
  resolveLiquidRegion: (x: number, y: number) => Promise<string | null>;
  onMoveEquipment: (id: string, position: { x: number; y: number }) => void;
  onToggleHeat: (id: string) => void;
  onInspectEquipment: (id: string) => void;
  probeMeasure: (probeId: string, targetId: string, onOutcome?: (measurement: LastMeasurementType) => void) => void;
  probeDetach: (probeId: string) => void;
  // Instance currently being hovered over by a dragged chemical bottle — drives the dashed
  // highlight on that one EquipmentContainer. See ChemicalBottle's onHoverChange.
  hoveredEquipmentId?: string | null;
};

// Common props every probe-role instrument needs — a future probe (e.g. thermometer) implements
// this same shape. PhMeterInstrument uses this directly rather than declaring its own duplicate.
export type ProbeInstrumentProps = {
  id: string;
  label: string;
  instance: EquipmentInstanceType;
  equipment: EquipmentInstanceType[];
  probeOffset: { x: number; y: number };
  resolveLiquidRegion: (x: number, y: number) => Promise<string | null>;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onInspect?: () => void;
  probeMeasure: (probeId: string, targetId: string, onOutcome?: (measurement: LastMeasurementType) => void) => void;
  probeDetach: (probeId: string) => void;
};

// --- Tutor chat ---

export type LabTutorChatProps = {
  labRunId: string | undefined;
  visible: boolean;
  onClose: () => void;
};

// --- Compound builder ---

export type CompoundBuilderProps = {
  experimentId: string;
  sessionId: string;
  compoundId: string;
  onClose: () => void;
  onBuilt: (compoundId: string) => void;
};

// --- Chemicals ---

export type ChemicalInspectPanelProps = {
  chemical: ChemicalType | null;
  onClose: () => void;
};

export type ChemicalLibraryDrawerProps = {
  chemicals: ChemicalType[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropped: (chemical: ChemicalType, equipmentId: string) => void;
};

export type ChemicalBottleProps = {
  chemical: ChemicalType;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropped: (chemical: ChemicalType, equipmentId: string) => void;
  onInspect?: (chemical: ChemicalType) => void;
  // Fired (throttled to ~120ms, matching useDraggableBenchItem's own throttle) with the
  // currently-hovered equipment id while dragging, and null once not over a valid target or on
  // drop — drives the dashed hover highlight on the corresponding EquipmentContainer.
  onHoverChange?: (targetId: string | null) => void;
};

// --- Effects ---

export type ColorTransitionProps = { fromColor: string; toColor: string; style?: object };

export type PourAnimationProps = { color: string; onFinish?: () => void };

// --- Panels ---

export type HintCenterPanelProps = {
  visible: boolean;
  notifications: HintNotificationType[];
  onClose: () => void;
  onRequestHint: () => void;
  requestingHint: boolean;
};

export type EducationalInfoPanelProps = {
  result: ReactionResultType | null;
  onClose: () => void;
};

export type EquipmentInspectPanelProps = {
  instance: EquipmentInstanceType | null;
  chemicalMap: Record<string, ChemicalType>;
  onClose: () => void;
  // Long-press-to-inspect doubles as "select this equipment" — removing it from here (rather
  // than a separate selection UI) reuses that existing gesture instead of adding a new one.
  onRemove?: (instanceId: string) => void;
};

// --- Equipment (bench + shelf) ---

export type EquipmentShelfItemProps = {
  equipmentType: string;
  label: string;
  Visual: ComponentType<EquipmentVisualProps>;
  resolveBenchPosition: (x: number, y: number) => Promise<{ x: number; y: number } | null>;
  onDroppedOnBench: (equipmentType: string, position: { x: number; y: number }) => void;
  // Fired (throttled ~120ms) with whether the drag is currently over the bench — drives a dashed
  // highlight on the bench container itself while dragging, matching ChemicalBottle's per-target
  // highlight but at bench-wide granularity (any bench position is a valid drop, not one instance).
  onHoverChange?: (isOverBench: boolean) => void;
};

export type EquipmentContainerProps = {
  id: string;
  label: string;
  Visual: ComponentType<EquipmentVisualProps>;
  position: { x: number; y: number };
  chemicals: ChemicalType[];
  contents: EquipmentContentType[];
  capacity?: number;
  heated: boolean;
  isHeatSource: boolean;
  temperature?: number;
  // True while a chemical bottle is being dragged over this specific instance — drives the
  // dashed hover highlight. Purely a visual read of drag progress, set by the workspace screen;
  // doesn't affect drop hit-testing itself (see useDropTargetRegistry).
  isDropTarget?: boolean;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onPress?: () => void;
  onInspect?: () => void;
  // Registers this instance's liquid sub-rect (not the whole equipment body) so probe-role
  // equipment (e.g. the pH meter) can hit-test against poured liquid specifically — see
  // useDropTargetRegistry / PhMeterInstrument. Only called while hasLiquid is true.
  registerLiquidRegion?: (id: string) => (node: View | null) => void;
};

// Shared by PhMeterArt (LED color) and PhMeterInstrument (probe state machine) — kept as one
// type so the two stay in lockstep instead of drifting into two separately-maintained unions.
export type PhMeterLedState = "idle" | "in_liquid" | "measuring" | "complete";

export type PhMeterArtProps = EquipmentVisualProps & {
  ledState?: PhMeterLedState;
  // Shares PhMeterInstrument's own pulse shared value (already driven while measuring) so the LED
  // pulses in lockstep with the readout text instead of needing a second, separately-timed pulse.
  pulseValue?: SharedValue<number>;
};
