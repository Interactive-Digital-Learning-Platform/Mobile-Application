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
    | "probe_detach";
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
  | { actionType: "create_equipment"; instanceId: string; equipmentType: string; position?: { x: number; y: number } }
  | { actionType: "move_equipment"; instanceId: string; position: { x: number; y: number } }
  | { actionType: "remove_equipment"; instanceId: string }
  | { actionType: "add_chemical"; instanceId: string; chemicalId: string; quantity?: number; unit?: string }
  | { actionType: "reset"; instanceId: string }
  | { actionType: "heat"; instanceId: string; heated?: boolean; temperature?: number }
  | { actionType: "probe_measure"; instanceId: string; targetInstanceId: string }
  | { actionType: "probe_detach"; instanceId: string };

export type LabRunType = {
  _id: string;
  userId: string;
  sessionId?: string | null;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  endedAt?: string | null;
  equipment: EquipmentInstanceType[];
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
    | "chemical_hint";
  hint: string;
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
