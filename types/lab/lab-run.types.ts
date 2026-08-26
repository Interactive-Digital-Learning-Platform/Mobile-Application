import { ReactionResultType } from "./chemical.types";

// --- Lab domain types: bench state, equipment instances, run actions ---

// One physical container/tool placed on the bench, keyed by a client-generated instanceId (not
// equipmentType) so multiple instances of the same type (two beakers) can coexist.
export type EquipmentContentType = { chemical: string; volume: number | null; mass: number | null };

export type LastMeasurementType = {
  measurementType: "ph" | null;
  value: number | null;
  targetId: string | null;
  measuredAt: string | null;
} | null;

export type EquipmentInstanceType = {
  instanceId: string;
  equipmentType: string;
  position: { x: number; y: number };
  contents: EquipmentContentType[];
  temperature: number;
  isHeated: boolean;
  // Probe-role equipment only (e.g. pH meter) — see PhMeterInstrument.tsx.
  probeTargetId?: string | null;
  lastMeasurement?: LastMeasurementType;
};

// Mechanics-only bench instance (pendulum, spring, stopwatch, balance/measuring_cylinder reused
// with category "physics") — parallel to EquipmentInstanceType, not an extension of it, since a
// container-shaped instance (contents/temperature/isHeated) has no equivalent here. See
// physicsInstanceSchema in LabRun.js for why these live in their own bench-state array.
export type PhysicsInstanceType = {
  instanceId: string;
  equipmentType: string;
  position: { x: number; y: number };
  attachedMass: { value: number | null; unit: string };
  length: { value: number | null; unit: string };
  angle: { value: number | null; unit: string };
  extension: { value: number | null; unit: string };
  timerState: { running: boolean; startedAt: string | null; elapsedSeconds: number; oscillationCount: number };
  measuredVolumeDisplacement: { initial: number | null; final: number | null };
  // Electricity (Phase B) — unused by mechanics instances.
  slotId?: string | null;
  resistanceValue?: number | null;
  role?: "resistor" | "ammeter" | "voltmeter" | "battery" | "wire_link" | null;
  lastMeasurement: {
    measurementType: "g" | "spring_constant" | "density" | "resistance" | "current" | "voltage" | null;
    value: number | null;
    targetId: string | null;
    measuredAt: string | null;
  } | null;
};

export type LabActionType = {
  actionType:
    | "create_equipment"
    | "move_equipment"
    | "remove_equipment"
    | "add_chemical"
    | "remove_chemical"
    | "mix"
    | "heat"
    | "cool"
    | "stir"
    | "measure"
    | "pour"
    | "reset"
    | "probe_measure"
    | "probe_detach"
    | "attach_mass"
    | "set_pendulum_length"
    | "set_length"
    | "set_release_angle"
    | "start_timer"
    | "stop_timer"
    | "record_oscillation"
    | "read_measurement"
    | "place_component"
    | "remove_component"
    | "set_component_value"
    | "read_meter";
  equipment?: string | null;
  chemicalIds?: string[];
  quantity?: number | null;
  unit?: string | null;
  temperature?: number | null;
  reactionId?: string | null;
  resultType?: "reaction_success" | "no_reaction" | null;
  timestamp: string;
};

// Request payloads for POST /api/lab/runs/:id/action — discriminated by actionType so each
// variant only allows the fields that endpoint actually reads (see labRun.controller.js).
export type LogLabActionRequestType =
  | {
      actionType: "create_equipment";
      instanceId: string;
      equipmentType: string;
      position?: { x: number; y: number };
      category?: "physics"; // omit for chemistry — see logLabAction's create_equipment case
    }
  | { actionType: "move_equipment"; instanceId: string; position: { x: number; y: number } }
  | { actionType: "remove_equipment"; instanceId: string }
  | { actionType: "add_chemical"; instanceId: string; chemicalId: string; quantity?: number; unit?: string }
  | { actionType: "pour"; instanceId: string; targetInstanceId: string }
  | { actionType: "reset"; instanceId: string }
  | { actionType: "heat"; instanceId: string; heated?: boolean; temperature?: number }
  | { actionType: "probe_measure"; instanceId: string; targetInstanceId: string }
  | { actionType: "probe_detach"; instanceId: string }
  | { actionType: "attach_mass"; instanceId: string; quantity: number }
  | { actionType: "set_pendulum_length" | "set_length"; instanceId: string; quantity: number }
  | { actionType: "set_release_angle"; instanceId: string; quantity: number }
  | { actionType: "start_timer"; instanceId: string }
  | { actionType: "record_oscillation"; instanceId: string }
  | { actionType: "stop_timer"; instanceId: string }
  | { actionType: "read_measurement"; instanceId: string; quantity: number; unit?: string; phase?: "initial" | "final" }
  | { actionType: "place_component"; instanceId: string; slotId: string; boardId: string }
  | { actionType: "remove_component"; instanceId: string }
  | { actionType: "set_component_value"; instanceId: string; quantity: number }
  | { actionType: "read_meter"; instanceId: string };

export type LabRunType = {
  _id: string;
  userId: string;
  sessionId?: string | null;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  endedAt?: string | null;
  equipment: EquipmentInstanceType[];
  physicsEquipment: PhysicsInstanceType[];
  // Electricity (Phase B) only — which slot board is active and what's placed where. Absent/null
  // boardId for a mechanics or chemistry LabRun.
  circuitBoardState?: { boardId: string | null; filledSlots: { slotId: string; instanceId: string }[] };
  actions: LabActionType[];
  reactionsTriggered: string[];
  tutorConversation: { role: "user" | "assistant"; content: string; timestamp: string }[];
};

// Client-side only — an AI hint queued in the workspace's Hint Center (see HintCenterPanel).
// Built from an InterventionType.hint (auto-triggered by mistakes) or requestHint's hintText
// (student-requested); never sent over the network itself.
export type InterventionType = {
  type:
    | "unknown_combination"
    | "unnecessary_heat"
    | "heating_empty_container"
    | "repeated_mistake"
    | "equipment_hint"
    | "chemical_hint"
    | "circuit_hint";
  hint: string;
  // Only set for equipment_hint/chemical_hint/circuit_hint (the step-level mismatch hints) — the
  // escalating 1-3 level shown, mirrors requestHint's hintLevel. Used to gate the Help reveal button.
  level?: number | null;
} | null;

// POST /api/lab/runs/:id/action now checks for a reaction continuously (add_chemical/heat), so
// the response carries the live bench state plus whatever the reaction engine found this time,
// plus a proactive AI Tutor safety check (see checkSafetyIntervention in labRun.controller.js).
export type LogLabActionResponseType = {
  labRun: LabRunType;
  reactionResult: ReactionResultType | null;
  intervention: InterventionType;
};

export type MixRequestType = {
  instanceId: string;
  chemicalIds: string[];
  conditions?: { heated?: boolean; temperature?: number; stirred?: boolean };
};

export type TutorRequestType = {
  question: string;
};

export type TutorResponseType = {
  answer: string;
};
