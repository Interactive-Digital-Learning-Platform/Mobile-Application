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

// "container"    passive vessel — EquipmentContainer renders it, unchanged liquid/heat/pour effects
// "heat_source"  burner — replaces the old ad hoc `equipmentType === "burner"` check
// "probe:ph"     ph_meter — LabWorkspace renders PhMeterInstrument instead of EquipmentContainer
// "probe:temp"   thermometer — reserved for a future pass, falls through to EquipmentContainer today
// "passive"      stirrer, balance — visual upgrade only, no dispatch branch
export type EquipmentRole = "container" | "heat_source" | "probe:ph" | "probe:temp" | "passive";

// Fixed equipment catalog shown during equipment selection. Which items are actually
// required for a given practical is never sent to the client — only the evaluation
// endpoint (POST /api/sessions/:id/equipment-selection) knows, and it responds with a
// non-revealing hint rather than the answer.
export type EquipmentCatalogItem = {
  key: string;
  label: string;
  Visual: ComponentType<EquipmentVisualProps>;
  role: EquipmentRole;
  // Fixed pixel offset (at PhMeterInstrument's bench render size) from the instrument's top-left
  // to its sensing tip — only meaningful for probe:* roles.
  probeOffset?: { x: number; y: number };
  // Nominal max capacity in mL/g, used to normalize an instance's total content quantity into the
  // 0-1 fillLevel its Visual renders — container-role equipment only.
  capacity?: number;
};

export const LAB_EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  { key: "beaker", label: "Beaker", Visual: BeakerArt, role: "container", capacity: 250 },
  { key: "test_tube", label: "Test Tube", Visual: TestTubeArt, role: "container", capacity: 20 },
  { key: "measuring_cylinder", label: "Measuring Cylinder", Visual: MeasuringCylinderArt, role: "container", capacity: 100 },
  { key: "dropper", label: "Dropper", Visual: DropperArt, role: "container", capacity: 5 },
  { key: "burette", label: "Burette", Visual: BuretteArt, role: "container", capacity: 50 },
  { key: "pipette", label: "Pipette", Visual: PipetteArt, role: "container", capacity: 10 },
  { key: "flask", label: "Flask", Visual: FlaskArt, role: "container", capacity: 250 },
  { key: "thermometer", label: "Thermometer", Visual: ThermometerArt, role: "probe:temp" },
  { key: "burner", label: "Burner", Visual: BurnerArt, role: "heat_source" },
  { key: "stirrer", label: "Stirrer", Visual: StirrerArt, role: "passive" },
  // PhMeterArt's viewBox is 40x70; PhMeterInstrument renders it at size=84 (1.2x scale), so this
  // offset is the tip's viewBox coordinate (20, 70) scaled by the same 1.2 factor.
  { key: "ph_meter", label: "pH Meter", Visual: PhMeterArt, role: "probe:ph", probeOffset: { x: 24, y: 84 } },
  { key: "balance", label: "Balance", Visual: BalanceArt, role: "passive" },
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
