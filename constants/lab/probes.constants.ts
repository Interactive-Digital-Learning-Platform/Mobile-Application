import { colors } from "@/constants/colors";
import { PhMeterLedState } from "@/types/lab";

// Split out from equipment.constants.ts: that file imports every *Art component (including
// PhMeterArt/ThermometerArt) to build LAB_EQUIPMENT_CATALOG, so those components importing probe
// constants back from equipment.constants.ts would form a require cycle. This file imports no
// equipment component, so PhMeterArt/PhMeterInstrument/ThermometerArt can safely depend on it.

// --- pH meter ---
export const PH_METER_LED_COLOR: Record<PhMeterLedState, string> = {
  idle: "#B0B0B8",
  in_liquid: "#4F86C6",
  measuring: colors.primary,
  complete: "#10B981", // emerald-500 — matches the app-wide "correct/complete" accent
};

export const ART_SIZE = 84; // 1.2x PhMeterArt's own viewBox height (70) — see LAB_EQUIPMENT_CATALOG's probeOffset in equipment.constants.ts
export const MEASURE_DEBOUNCE_MS = 150; // avoids a false trigger on a quick pass-through of the liquid
export const MEASURING_DURATION_MS = 1000;

// --- Thermometer ---
// Backend clamps: room temp is 25°C, heating jumps to at least 80°C (labRun.controller.js) — so
// this range comfortably spans "cold" through "actively boiling" without needing a wider scale.
export const THERMOMETER_MIN_TEMP = 20;
export const THERMOMETER_MAX_TEMP = 100;
