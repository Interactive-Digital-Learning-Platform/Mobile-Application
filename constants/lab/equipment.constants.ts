import { ComponentType } from "react";
import { EquipmentVisualProps } from "@/types/lab";
import BeakerArt from "@/components/lab/equipment/BeakerArt";
import TestTubeArt from "@/components/lab/equipment/TestTubeArt";
import MeasuringCylinderArt from "@/components/lab/equipment/MeasuringCylinderArt";
import DropperArt from "@/components/lab/equipment/DropperArt";
import BuretteArt from "@/components/lab/equipment/BuretteArt";
import PipetteArt from "@/components/lab/equipment/PipetteArt";
import FlaskArt from "@/components/lab/equipment/FlaskArt";
import ThermometerArt from "@/components/lab/equipment/ThermometerArt";
import BurnerArt from "@/components/lab/equipment/BurnerArt";
import StirrerArt from "@/components/lab/equipment/StirrerArt";
import PhMeterArt from "@/components/lab/equipment/PhMeterArt";
import BalanceArt from "@/components/lab/equipment/BalanceArt";
import RetortStandArt from "@/components/lab/equipment/RetortStandArt";
import PendulumArt from "@/components/lab/equipment/PendulumArt";
import StopwatchArt from "@/components/lab/equipment/StopwatchArt";
import RulerArt from "@/components/lab/equipment/RulerArt";
import SpringArt from "@/components/lab/equipment/SpringArt";
import SlottedMassArt from "@/components/lab/equipment/SlottedMassArt";
import TestObjectArt from "@/components/lab/equipment/TestObjectArt";
import ResistorArt from "@/components/lab/equipment/ResistorArt";
import AmmeterArt from "@/components/lab/equipment/AmmeterArt";
import VoltmeterArt from "@/components/lab/equipment/VoltmeterArt";

// "container"          passive vessel — EquipmentContainer renders it, unchanged liquid/heat/pour effects
// "heat_source"        burner — replaces the old ad hoc `equipmentType === "burner"` check
// "probe:ph"           ph_meter — LabWorkspace renders PhMeterInstrument instead of EquipmentContainer
// "probe:temp"         thermometer — reserved for a future pass, falls through to EquipmentContainer today
// "passive"            stirrer, balance — visual upgrade only, no dispatch branch
// "instrument:physics"  mechanics equipment (pendulum, spring, stopwatch, etc.) — LabWorkspace
//                       renders PhysicsInstrument for these instead of EquipmentContainer; see
//                       physicsEquipment/createPhysicsEquipment (a physics-shaped bench instance
//                       has no contents/temperature/isHeated, so it can never go through the
//                       default container path)
// "circuit_component"  resistor/ammeter/voltmeter — placed via CircuitBoard.tsx's slot-based
//                       board, not the free bench; never rendered by LabWorkspace at all (see
//                       workspace.tsx's role-based split of benchPhysicsEquipment)
export type EquipmentRole =
  | "container"
  | "heat_source"
  | "probe:ph"
  | "probe:temp"
  | "passive"
  | "instrument:physics"
  | "circuit_component";

// Fixed equipment catalog shown during equipment selection. Which items are actually
// required for a given practical is never sent to the client — only the evaluation
// endpoint (POST /api/sessions/:id/equipment-selection) knows, and it responds with a
// non-revealing hint rather than the answer.
export type EquipmentCatalogItem = {
  key: string;
  label: string;
  Visual: ComponentType<EquipmentVisualProps>;
  role: EquipmentRole;
  // Which experiment subject(s) this item's equipment-selection screen and workspace shelf
  // should show it for. A few items (balance, measuring_cylinder) are shared real-world
  // equipment reused by both Chemistry and Physics practicals.
  subjects: ("Chemistry" | "Physics" | "Biology")[];
  // Fixed pixel offset (at PhMeterInstrument's bench render size) from the instrument's top-left
  // to its sensing tip — only meaningful for probe:* roles.
  probeOffset?: { x: number; y: number };
  // Nominal max capacity in mL/g, used to normalize an instance's total content quantity into the
  // 0-1 fillLevel its Visual renders — container-role equipment only.
  capacity?: number;
  // One-line "what this is used for" shown in the equipment-selection screen's Observe sheet —
  // pre-selection orientation only, distinct from EquipmentInspectPanel's live bench-instance data.
  description: string;
};

export const LAB_EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  {
    key: "beaker",
    label: "Beaker",
    Visual: BeakerArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 250,
    description: "Holds, mixes, and heats liquids. Its volume markings are approximate, not precise.",
  },
  {
    key: "test_tube",
    label: "Test Tube",
    Visual: TestTubeArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 20,
    description: "Holds small amounts of liquid or solid for observing, heating, or mixing a reaction.",
  },
  {
    key: "measuring_cylinder",
    label: "Measuring Cylinder",
    Visual: MeasuringCylinderArt,
    role: "container",
    subjects: ["Chemistry", "Physics"],
    capacity: 100,
    description: "Measures the volume of a liquid accurately — more precise than a beaker's markings.",
  },
  {
    key: "dropper",
    label: "Dropper",
    Visual: DropperArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 5,
    description: "Adds liquid a few drops at a time, for fine control over very small quantities.",
  },
  {
    key: "burette",
    label: "Burette",
    Visual: BuretteArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 50,
    description: "Delivers a precise, adjustable volume of liquid — commonly used in titrations.",
  },
  {
    key: "pipette",
    label: "Pipette",
    Visual: PipetteArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 10,
    description: "Transfers a fixed, accurately measured volume of liquid from one container to another.",
  },
  {
    key: "flask",
    label: "Flask",
    Visual: FlaskArt,
    role: "container",
    subjects: ["Chemistry"],
    capacity: 250,
    description: "Holds, mixes, or heats liquids — its narrow neck limits spills and evaporation.",
  },
  {
    key: "thermometer",
    label: "Thermometer",
    Visual: ThermometerArt,
    role: "probe:temp",
    subjects: ["Chemistry"],
    description: "Measures the temperature of a substance in a container.",
  },
  {
    key: "burner",
    label: "Burner",
    Visual: BurnerArt,
    role: "heat_source",
    subjects: ["Chemistry"],
    description: "Provides a controlled flame to heat whatever's placed above it.",
  },
  {
    key: "stirrer",
    label: "Stirrer",
    Visual: StirrerArt,
    role: "passive",
    subjects: ["Chemistry"],
    description: "Mixes a solution by hand so its components combine evenly.",
  },
  // PhMeterArt's viewBox is 40x70; PhMeterInstrument renders it at size=84 (1.2x scale), so this
  // offset is the tip's viewBox coordinate (20, 70) scaled by the same 1.2 factor.
  {
    key: "ph_meter",
    label: "pH Meter",
    Visual: PhMeterArt,
    role: "probe:ph",
    subjects: ["Chemistry"],
    probeOffset: { x: 24, y: 84 },
    description: "Measures how acidic or basic (alkaline) a solution is on the pH scale.",
  },
  {
    key: "balance",
    label: "Balance",
    Visual: BalanceArt,
    role: "passive",
    subjects: ["Chemistry", "Physics"],
    description: "Measures the mass of a solid substance.",
  },

  // --- Physics (Mechanics) — see PhysicsInstrument.tsx ---
  {
    key: "retort_stand",
    label: "Retort Stand",
    Visual: RetortStandArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "Holds and suspends other apparatus — a pendulum, a spring — steady above the bench.",
  },
  {
    key: "pendulum_bob",
    label: "Pendulum Bob",
    Visual: PendulumArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "A weight on a string, suspended from the retort stand — set its length and release angle here.",
  },
  {
    key: "stopwatch",
    label: "Stopwatch",
    Visual: StopwatchArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "Times how long a set of oscillations takes.",
  },
  {
    key: "ruler",
    label: "Ruler",
    Visual: RulerArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "Measures the length of a string, spring, or extension.",
  },
  {
    key: "spring",
    label: "Spring",
    Visual: SpringArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "Stretches under load — measure its natural and extended length to find its spring constant.",
  },
  {
    key: "slotted_mass",
    label: "Slotted Mass",
    Visual: SlottedMassArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "A known mass you can hang on a spring or attach to other apparatus.",
  },
  {
    key: "test_object",
    label: "Test Object",
    Visual: TestObjectArt,
    role: "instrument:physics",
    subjects: ["Physics"],
    description: "An irregular solid whose density you'll measure by mass and water displacement.",
  },

  // --- Physics (Electricity) — see CircuitBoard.tsx ---
  {
    key: "resistor",
    label: "Resistor",
    Visual: ResistorArt,
    role: "circuit_component",
    subjects: ["Physics"],
    description: "Resists the flow of current — set its value, then place it in the circuit loop.",
  },
  {
    key: "ammeter",
    label: "Ammeter",
    Visual: AmmeterArt,
    role: "circuit_component",
    subjects: ["Physics"],
    description: "Measures current — must be placed in series, in the main loop.",
  },
  {
    key: "voltmeter",
    label: "Voltmeter",
    Visual: VoltmeterArt,
    role: "circuit_component",
    subjects: ["Physics"],
    description: "Measures voltage — must be placed in parallel, across the component being measured.",
  },
];

// Capability tags per equipment type — mirrors the backend's src/data/equipmentCapabilities.js.
// Behaviour is driven by capability, never by experiment title/id. A micro-step's hidden
// expectedTransfer.method names a capability; here it decides how an instance is rendered/handled.
export const EQUIPMENT_CAPABILITIES: Record<string, string[]> = {
  dropper: ["small_quantity_transfer"],
  pipette: ["accurate_volume_transfer", "measured_transfer"],
  burette: ["controlled_volume_delivery", "measured_transfer"],
  beaker: ["bulk_transfer", "mixing_vessel"],
  flask: ["bulk_transfer", "mixing_vessel"],
  test_tube: ["bulk_transfer", "small_scale_vessel"],
  measuring_cylinder: ["volume_measurement"],
  ph_meter: ["ph_measurement"],
  thermometer: ["temperature_measurement"],
  balance: ["mass_measurement"],
  burner: ["heating"],
  stirrer: ["mixing"],
};
export const capabilitiesOf = (equipmentType: string): string[] => EQUIPMENT_CAPABILITIES[equipmentType] ?? [];
export const hasCapability = (equipmentType: string, capability: string): boolean =>
  capabilitiesOf(equipmentType).includes(capability);
// Capabilities that make an instrument a fill → move → dispense liquid-transfer tool.
export const TRANSFER_CAPABILITIES = ["small_quantity_transfer", "accurate_volume_transfer", "controlled_volume_delivery"];
export const isTransferCapable = (equipmentType: string): boolean =>
  capabilitiesOf(equipmentType).some((c) => TRANSFER_CAPABILITIES.includes(c));

// --- EquipmentContainer bench sizing ---
// Bench render size for every container-role instance. `BOX` is the art's footprint; the liquid
// hitbox scales its height by fillLevel so it roughly tracks the SVG-rendered liquid.
export const BOX = 112;
export const VISUAL_SIZE = 76;
export const MAX_LIQUID_HEIGHT_PCT = 60;

// Vessel sizes the student can pick when placing a container (mL). Types not listed are
// fixed-size. The middle option is the sensible default. `containerCapacityOptions` returns [] for
// a type with no choice (so the workspace places it straight away, no size prompt).
export const CONTAINER_CAPACITY_OPTIONS: Record<string, number[]> = {
  test_tube: [5, 10, 20, 30],
  beaker: [50, 100, 250, 500],
  flask: [100, 250, 500],
  measuring_cylinder: [10, 25, 50, 100],
};
export const containerCapacityOptions = (equipmentType: string): number[] =>
  CONTAINER_CAPACITY_OPTIONS[equipmentType] ?? [];
export const defaultContainerCapacity = (equipmentType: string): number | undefined => {
  const opts = CONTAINER_CAPACITY_OPTIONS[equipmentType];
  return opts ? opts[Math.floor(opts.length / 2)] : undefined;
};

// A gentle capacity → render-size influence, so a 5 mL tube looks smaller than a 30 mL one
// without the difference being cartoonish. 1.0 when the type has no size choice.
export const capacityScale = (equipmentType: string, capacity: number | null | undefined): number => {
  const opts = CONTAINER_CAPACITY_OPTIONS[equipmentType];
  if (!opts || capacity == null) return 1;
  const lo = opts[0];
  const hi = opts[opts.length - 1];
  if (hi === lo) return 1;
  const t = Math.max(0, Math.min(1, (capacity - lo) / (hi - lo)));
  return 0.82 + t * 0.36; // 0.82x … 1.18x
};

// Many O/L reagents (HCl, NaOH, water...) are curated with a near-white `color`, which renders as
// an invisible fill in a thin tube/vessel. Substitute a faint blue-grey so a colourless liquid
// still reads as "there's liquid in here" (spec: show a subtle fill boundary even when colourless).
const NEAR_WHITE = new Set(["#FFFFFF", "#FFF", "#F2F2F2", "#F5F5F5", "#FAFAFA", "#F8FAFC", "#EAF6FF", "#E8E8E8", "#F5F5DC"]);
export const visibleLiquidColor = (hex: string | null | undefined): string =>
  hex && !NEAR_WHITE.has(hex.toUpperCase()) ? hex : "#AFC9E8";

// A colourless solution still has to read as "there IS liquid in here" (spec §4): a faint tint at
// low opacity, never fully transparent.
export const COLOURLESS_LIQUID = { color: "#DCEBF7", opacity: 0.32 };

// How a single chemical looks as the substance in a vessel — prefers the backend-authored
// `appearance`, falls back to a category/state guess. Mirrors src/data/chemicalAppearance.js's
// fallbackAppearance. Used for the dropper's held liquid and for legacy LabRuns whose containers
// have no observableState yet.
export const resolveLiquidAppearance = (
  chemical: { color?: string; state?: string; appearance?: { solutionColor?: string | null; opacity?: number | null } | null } | null | undefined
): { color: string; opacity: number } => {
  if (!chemical) return { ...COLOURLESS_LIQUID };
  const ap = chemical.appearance;
  if (ap?.solutionColor) return { color: ap.solutionColor, opacity: ap.opacity ?? 0.85 };
  if (chemical.state === "solid") return { color: chemical.color || "#EFEFEF", opacity: 1 };
  if (chemical.state === "gas") return { color: chemical.color || "#EDEDED", opacity: 0.14 };
  const c = (chemical.color || "").toUpperCase();
  if (!c || NEAR_WHITE.has(c)) return { ...COLOURLESS_LIQUID };
  return { color: chemical.color as string, opacity: 0.85 };
};

// The observable appearance the bench should render for a container — the authoritative
// server-computed observableState when present, otherwise the last-added chemical's own
// appearance (legacy fallback), otherwise "empty".
export const resolveContainerAppearance = (
  observableState: { liquidColor?: string | null; opacity?: number | null; hasPrecipitate?: boolean; precipitateColor?: string | null; cloudiness?: number } | null | undefined,
  chemicals: ({ color?: string; state?: string; appearance?: { solutionColor?: string | null; opacity?: number | null } | null } | undefined)[]
): { color: string; opacity: number; hasPrecipitate: boolean; precipitateColor: string | null; cloudiness: number } | null => {
  if (observableState?.liquidColor) {
    return {
      color: observableState.liquidColor,
      opacity: observableState.opacity ?? 0.8,
      hasPrecipitate: !!observableState.hasPrecipitate,
      precipitateColor: observableState.precipitateColor ?? null,
      cloudiness: observableState.cloudiness ?? 0,
    };
  }
  const present = chemicals.filter(Boolean);
  if (present.length === 0) return null;
  const look = resolveLiquidAppearance(present[present.length - 1]);
  return { color: look.color, opacity: look.opacity, hasPrecipitate: false, precipitateColor: null, cloudiness: 0 };
};

// Believable relative bench sizes (spec: "test tubes, droppers, pH meters, burettes... should
// have believable relative scale"). Multiplier on BOX/VISUAL_SIZE in EquipmentContainer. Probe
// instruments (pH meter) are excluded — their probe-tip offset is calibrated to a fixed size.
// Anything not listed renders at 1.0.
export const BENCH_SIZE_SCALE: Record<string, number> = {
  dropper: 0.6, // XS
  pipette: 0.78, // S
  test_tube: 0.82, // S
  thermometer: 0.82, // S
  stirrer: 0.9,
  beaker: 1, // M
  flask: 1, // M
  burner: 1, // M
  measuring_cylinder: 1.12,
  balance: 1.2, // L
  burette: 1.5, // XL / tall
};
export const benchScale = (equipmentType: string) => BENCH_SIZE_SCALE[equipmentType] ?? 1;

// Friendly per-instance identity — "Test Tube A" / "Test Tube B" when more than one of a type is
// on the bench, plain "Test Tube" otherwise. Lets the inspect panel (and the AI tutor context)
// refer to a specific instance. Order follows the instances array order.
export const friendlyEquipmentName = (
  instances: { instanceId: string; equipmentType: string }[],
  instanceId: string
): string => {
  const target = instances.find((e) => e.instanceId === instanceId);
  if (!target) return "";
  const base = LAB_EQUIPMENT_CATALOG.find((e) => e.key === target.equipmentType)?.label || target.equipmentType;
  const sameType = instances.filter((e) => e.equipmentType === target.equipmentType);
  if (sameType.length <= 1) return base;
  const idx = sameType.findIndex((e) => e.instanceId === instanceId);
  return `${base} ${String.fromCharCode(65 + idx)}`;
};

// pH meter LED colors, probe timings, and thermometer scale constants live in
// probes.constants.ts instead of here — this file imports PhMeterArt/ThermometerArt (for the
// catalog above), so those components importing constants back from here would be a require cycle.
