// Mobile mirror of the backend's circuitBoards.js — authored board layouts for the Electricity
// (Phase B) practicals. Anchors are positions within a shared 300x220 viewBox that CircuitBoard.tsx
// renders. The backend is the source of truth for grading (circuitEngine.js); this file only
// drives what the student sees and where drop targets sit — the two are kept in sync by hand
// since both are small, hand-authored, and rarely change.
export type SlotRole = "resistor" | "ammeter" | "voltmeter";

export type CircuitSlot = {
  slotId: string;
  acceptsRole: SlotRole;
  required: boolean;
  anchor: { x: number; y: number };
};

export type CircuitBoardLayout = {
  boardId: string;
  title: string;
  topology: "single" | "series" | "parallel";
  batteryVoltage: number;
  slots: CircuitSlot[];
  // Visual-only (not sent to/graded by the backend) — a fixed battery symbol position and the
  // wire segments connecting it through the slots, so CircuitBoard.tsx can draw a recognizable
  // schematic without needing an actual image asset.
  batteryAnchor: { x: number; y: number };
  wireSegments: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
};

export const CIRCUIT_BOARD_VIEWBOX = { width: 300, height: 220 };

export const CIRCUIT_BOARDS: Record<string, CircuitBoardLayout> = {
  single_resistor: {
    boardId: "single_resistor",
    title: "Single Resistor Circuit",
    topology: "single",
    batteryVoltage: 12,
    slots: [
      { slotId: "R1", acceptsRole: "resistor", required: true, anchor: { x: 150, y: 40 } },
      { slotId: "A1", acceptsRole: "ammeter", required: true, anchor: { x: 260, y: 110 } },
      { slotId: "V1", acceptsRole: "voltmeter", required: true, anchor: { x: 150, y: 180 } },
    ],
    batteryAnchor: { x: 30, y: 110 },
    wireSegments: [
      { x1: 30, y1: 110, x2: 30, y2: 40 },
      { x1: 30, y1: 40, x2: 260, y2: 40 },
      { x1: 260, y1: 40, x2: 260, y2: 180 },
      { x1: 260, y1: 180, x2: 30, y2: 180 },
      { x1: 30, y1: 180, x2: 30, y2: 110 },
      { x1: 150, y1: 40, x2: 150, y2: 180, dashed: true },
    ],
  },
  series_two_resistor: {
    boardId: "series_two_resistor",
    title: "Series Resistor Circuit",
    topology: "series",
    batteryVoltage: 12,
    slots: [
      { slotId: "R1", acceptsRole: "resistor", required: true, anchor: { x: 90, y: 40 } },
      { slotId: "R2", acceptsRole: "resistor", required: true, anchor: { x: 210, y: 40 } },
      { slotId: "A1", acceptsRole: "ammeter", required: true, anchor: { x: 260, y: 110 } },
    ],
    batteryAnchor: { x: 30, y: 110 },
    wireSegments: [
      { x1: 30, y1: 110, x2: 30, y2: 40 },
      { x1: 30, y1: 40, x2: 260, y2: 40 },
      { x1: 260, y1: 40, x2: 260, y2: 180 },
      { x1: 260, y1: 180, x2: 30, y2: 180 },
      { x1: 30, y1: 180, x2: 30, y2: 110 },
    ],
  },
  parallel_two_resistor: {
    boardId: "parallel_two_resistor",
    title: "Parallel Resistor Circuit",
    topology: "parallel",
    batteryVoltage: 12,
    slots: [
      { slotId: "R1", acceptsRole: "resistor", required: true, anchor: { x: 100, y: 40 } },
      { slotId: "R2", acceptsRole: "resistor", required: true, anchor: { x: 100, y: 130 } },
      { slotId: "A1", acceptsRole: "ammeter", required: true, anchor: { x: 260, y: 85 } },
    ],
    batteryAnchor: { x: 30, y: 85 },
    wireSegments: [
      { x1: 30, y1: 85, x2: 60, y2: 85 },
      { x1: 60, y1: 20, x2: 60, y2: 150 },
      { x1: 60, y1: 40, x2: 180, y2: 40 },
      { x1: 60, y1: 130, x2: 180, y2: 130 },
      { x1: 180, y1: 20, x2: 180, y2: 150 },
      { x1: 180, y1: 85, x2: 260, y2: 85 },
      { x1: 260, y1: 85, x2: 260, y2: 180 },
      { x1: 260, y1: 180, x2: 30, y2: 180 },
      { x1: 30, y1: 180, x2: 30, y2: 85 },
    ],
  },
};

// Which equipmentType key fills which circuit role — mirrors CIRCUIT_EQUIPMENT_ROLES in
// circuitBoards.js, used to decide slot compatibility client-side before even asking the server.
export const CIRCUIT_EQUIPMENT_ROLES: Record<string, SlotRole> = {
  resistor: "resistor",
  ammeter: "ammeter",
  voltmeter: "voltmeter",
};
