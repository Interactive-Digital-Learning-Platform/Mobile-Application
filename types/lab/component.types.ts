import { ComponentType } from "react";
import { View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { SharedValue } from "react-native-reanimated";
import { ChemicalType, ReactionResultType } from "./chemical.types";
import { EquipmentContentType, EquipmentInstanceType, LastMeasurementType, PhysicsInstanceType } from "./lab-run.types";
import { HelpRevealType, HintNotificationType, SessionHistoryFilterType, SessionHistoryItemType } from "./session.types";
import {
  BiologyLearningQuestionType,
  BiologyVisualizationComponentType,
  BiologyVisualizationDetailType,
  BiologyVisualizationStageType,
  BiologyVisualizationSummaryType,
  GeneratedSceneElementType,
} from "./biology.types";

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
  // Same registry used to hit-test dragged chemical bottles (every EquipmentContainer registers
  // itself via registerEquipmentRef) — reused here so one container dragged onto another can pour.
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onPour: (sourceId: string, targetId: string) => void;
  // Physics (Mechanics) bench state — a parallel array to `equipment` above, rendered via
  // PhysicsInstrument instead of EquipmentContainer (see PhysicsInstrumentProps). Empty for a
  // Chemistry LabRun, which never populates this array.
  physicsEquipment?: PhysicsInstanceType[];
  physicsDispatch?: PhysicsInstrumentDispatch;
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

// Action dispatchers a PhysicsInstrument needs — grouped into one object (rather than one prop
// per action, like ProbeInstrumentProps takes) since a single instance may use several of them
// depending on its equipmentType (see PhysicsInstrument.tsx's per-type render branches).
export type PhysicsInstrumentDispatch = {
  onMove: (id: string, position: { x: number; y: number }) => void;
  onInspect?: (id: string) => void;
  attachMass: (id: string, massGrams: number) => void;
  setLength: (id: string, lengthCm: number) => void;
  setReleaseAngle: (id: string, angleDeg: number) => void;
  startTimer: (id: string) => void;
  stopTimer: (id: string, onOutcome?: (updated: PhysicsInstanceType | undefined) => void) => void;
  recordOscillation: (id: string) => void;
  readMeasurement: (id: string, quantity: number, options?: { unit?: string; phase?: "initial" | "final" }) => void;
};

export type PhysicsInstrumentProps = {
  id: string;
  label: string;
  instance: PhysicsInstanceType;
  dispatch: PhysicsInstrumentDispatch;
};

// Electricity (Phase B) — action dispatchers CircuitBoard.tsx needs. A slot-board is a fixed
// per-experiment layout (not a per-instance draggable), so it's a sibling to LabWorkspace rather
// than a PROBE_INSTRUMENTS/instrument:physics entry — see workspace.tsx for the mount decision.
export type CircuitBoardDispatch = {
  createAndPlaceComponent: (equipmentType: string, slotId: string, boardId: string) => Promise<void>;
  removeComponent: (instanceId: string) => void;
  setComponentValue: (instanceId: string, ohms: number) => void;
  readMeter: (instanceId: string, onOutcome?: (updated: PhysicsInstanceType | undefined) => void) => void;
};

export type CircuitBoardProps = {
  boardId: string;
  // Already filtered to this board's circuit-role instances (role != null) — see workspace.tsx.
  physicsEquipment: PhysicsInstanceType[];
  dispatch: CircuitBoardDispatch;
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
  // Help (the answer reveal) only appears once the current step has reached hint level 3 — never
  // shown before that, per the "no answer before hint 3" rule. See workspace.tsx for how this is
  // tracked per step.
  helpAvailable: boolean;
  onRequestHelp: () => void;
  requestingHelp: boolean;
  // Set once the student has actually pressed Help for the current step — the revealed answer
  // stays visible in the panel from then on (not just a one-time toast).
  helpReveal: HelpRevealType | null;
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
  // Container-to-container pouring — see useDraggableBenchItem's resolveDropTarget/onDrop and
  // LabWorkspace, which wires onPour to the workspace screen's role validation (only a
  // container-role target accepts a pour).
  resolveDropTarget?: (x: number, y: number) => Promise<string | null>;
  onPour?: (sourceId: string, targetId: string) => void;
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

// --- Biology Concept Visualization ---

export type ConceptVisualizationCardProps = {
  visualization: BiologyVisualizationSummaryType;
  onPress: () => void;
};

export type VisualizationPlayerProps = {
  visualization: BiologyVisualizationDetailType;
};

// Contract every per-concept canvas (components/lab/biology/canvases/*) implements.
// `timelinePosition` is continuous across the whole visualization — its integer part is the
// current stage index, its fractional part is progress within that stage — so a canvas can drive
// every animated element off one shared value via interpolate() breakpoints at each stage
// boundary, rather than branching on stage index in JS.
export type BiologyCanvasProps = {
  timelinePosition: SharedValue<number>;
  activeComponentIds: string[];
  showLabels: boolean;
  onTapComponent: (componentId: string) => void;
};

// A bold on-canvas caption for the current stage (e.g. "Evaporation") — mirrors the reference
// sample video's text-label treatment. Opacity fades in/out at the stage's own boundaries via
// one interpolate() formula, reused for every stage rather than needing per-stage animation code.
export type StageLabelOverlayProps = {
  title: string;
  stageIndex: number;
  timelinePosition: SharedValue<number>;
};

// A directional icon (ArrowUp/ArrowDown/etc.) that travels linearly between two points across
// `moveRange` (in timelinePosition units) and fades in/out at both ends of that same range — the
// "arrows showing direction/process" visual language from the reference video, layered as a
// plain positioned View over each canvas's static SVG scene. Position and opacity are computed
// from independent interpolations of the same range, so the icon fades fully out (not just
// freezes at its last value) once its stage has passed.
export type AnimatedFlowArrowProps = {
  Icon: LucideIcon;
  color: string;
  size?: number;
  timelinePosition: SharedValue<number>;
  moveRange: [number, number]; // [startTimelinePosition, endTimelinePosition]
  xRange: [number, number]; // left % at [start, end]
  yRange: [number, number]; // top % at [start, end]
  fadePadding?: number; // fraction of the range's width used to fade in/out at each end (default 0.15)
};

export type VisualizationTimelineProps = {
  totalStages: number;
  currentStageIndex: number;
  timelinePosition: SharedValue<number>;
  onJumpToStage: (index: number) => void;
};

export type VisualizationControlsProps = {
  isPlaying: boolean;
  onPlayPause: () => void;
  onReplay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  canStepBack: boolean;
  canStepForward: boolean;
};

export type InteractiveBiologyElementProps = {
  xPct: number; // 0-100, position within the canvas
  yPct: number;
  label: string;
  active?: boolean; // relevant to the currently-playing stage — draws a highlighted ring
  showLabel?: boolean;
  onPress: () => void;
};

export type BiologyInfoSheetProps = {
  visible: boolean;
  components: BiologyVisualizationComponentType[];
  selectedComponentId: string | null;
  onClose: () => void;
};

export type VisualizationQuestionProps = {
  question: BiologyLearningQuestionType;
  onReplayStage: (stageId: number) => void;
  onDone: () => void;
};

// --- AI-generated scene rendering ---
//
// AnimatedSceneAsset generalizes AnimatedFlowArrow: instead of one hand-picked icon/direction per
// call site, it derives x/y/opacity/scale/rotation from a data-driven `action` (see
// GeneratedSceneActionType) so the same component can render any controlled-vocabulary element
// the backend's AI pipeline produces.
export type AnimatedSceneAssetProps = {
  element: GeneratedSceneElementType;
  timelinePosition: SharedValue<number>;
  stageIndex: number;
  active: boolean;
  showLabel: boolean;
  onPress: (elementId: string) => void;
};

// The generic canvas needs the current stage's own data (for its sceneElements), not just the
// list of active component ids — that's the one respect in which it differs from the predefined
// canvases' BiologyCanvasProps contract.
export type GenericSceneCanvasProps = {
  stage: BiologyVisualizationStageType | undefined;
  stageIndex: number;
  timelinePosition: SharedValue<number>;
  showLabels: boolean;
  onTapComponent: (componentId: string) => void;
};
