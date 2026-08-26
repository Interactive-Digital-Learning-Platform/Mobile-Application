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

// --- EquipmentContainer bench sizing ---
// Bench render size for every container-role instance. `BOX` is the art's footprint; the liquid
// hitbox scales its height by fillLevel so it roughly tracks the SVG-rendered liquid.
export const BOX = 88;
export const VISUAL_SIZE = 58;
export const MAX_LIQUID_HEIGHT_PCT = 60;

// pH meter LED colors, probe timings, and thermometer scale constants live in
// probes.constants.ts instead of here — this file imports PhMeterArt/ThermometerArt (for the
// catalog above), so those components importing constants back from here would be a require cycle.
