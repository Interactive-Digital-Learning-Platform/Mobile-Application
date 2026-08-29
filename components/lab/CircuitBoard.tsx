import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { colors } from "@/constants/colors";
import { CIRCUIT_BOARDS, CIRCUIT_BOARD_VIEWBOX } from "@/constants/lab/circuitBoards.constants";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { CircuitBoardProps } from "@/types/lab";
import EquipmentShelfItem from "@/components/lab/equipment/EquipmentShelfItem";
import BatteryArt from "@/components/lab/equipment/BatteryArt";
import SheetHandle from "@/components/ui/SheetHandle";
import Button from "@/components/ui/Button";

const BOARD_DISPLAY_WIDTH = 320;
const SLOT_SIZE = 44; // in viewBox units
const SLOT_HIT_RADIUS = 30; // in viewBox units — generous, since fingers aren't pixel-precise
const SHELF_EQUIPMENT_TYPES = ["resistor", "ammeter", "voltmeter"];

// Electricity (Phase B) — a fixed slot-based circuit board, sibling to LabWorkspace rather than a
// PROBE_INSTRUMENTS entry (see component.types.ts's CircuitBoardProps comment for why). The board
// itself (battery + wire schematic + slot outlines) is drawn with inline SVG rather than an image
// asset — same approach every other equipment Visual in this codebase already uses.
export default function CircuitBoard({ boardId, physicsEquipment, dispatch }: CircuitBoardProps) {
  const board = CIRCUIT_BOARDS[boardId];
  const boardRef = useRef<View>(null);
  const [panelInstanceId, setPanelInstanceId] = useState<string | null>(null);
  const [resistanceInput, setResistanceInput] = useState("");
  // Set synchronously by resolveDropSlot, read immediately after by the onDroppedOnBench handler
  // — both happen within EquipmentShelfItem's single awaited handleDrop call, so there's no
  // concurrency risk between two different drags racing each other.
  const pendingSlotIdRef = useRef<string | null>(null);

  const scale = BOARD_DISPLAY_WIDTH / CIRCUIT_BOARD_VIEWBOX.width;
  const boardHeight = CIRCUIT_BOARD_VIEWBOX.height * scale;

  if (!board) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text className="font-aregular text-muted">Unknown circuit board.</Text>
      </View>
    );
  }

  const resolveDropSlot = (absoluteX: number, absoluteY: number): Promise<{ x: number; y: number } | null> => {
    return new Promise((resolve) => {
      if (!boardRef.current) return resolve(null);
      boardRef.current.measure((_x, _y, _width, _height, pageX, pageY) => {
        const localX = (absoluteX - pageX) / scale;
        const localY = (absoluteY - pageY) / scale;
        const slot = board.slots.find(
          (s) => Math.abs(localX - s.anchor.x) < SLOT_HIT_RADIUS && Math.abs(localY - s.anchor.y) < SLOT_HIT_RADIUS
        );
        pendingSlotIdRef.current = slot?.slotId ?? null;
        resolve(slot ? { x: slot.anchor.x, y: slot.anchor.y } : null);
      });
    });
  };

  const handleDroppedOnBench = (equipmentType: string) => {
    const slotId = pendingSlotIdRef.current;
    if (!slotId) return;
    dispatch.createAndPlaceComponent(equipmentType, slotId, board.boardId);
  };

  const instanceBySlot: Record<string, (typeof physicsEquipment)[number]> = {};
  physicsEquipment.forEach((inst) => {
    if (inst.slotId) instanceBySlot[inst.slotId] = inst;
  });

  const panelInstance = physicsEquipment.find((e) => e.instanceId === panelInstanceId) || null;
  const panelSlot = panelInstance ? board.slots.find((s) => s.slotId === panelInstance.slotId) : null;

  return (
    <View style={{ flex: 1 }}>
      <View className="py-3 border-b" style={{ borderColor: colors.borderColorLight }}>
        <Text className="font-amedium text-xs text-muted px-4 mb-2">COMPONENTS — drag onto the board</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {SHELF_EQUIPMENT_TYPES.map((key) => {
            const entry = LAB_EQUIPMENT_CATALOG.find((e) => e.key === key);
            if (!entry) return null;
            return (
              <EquipmentShelfItem
                key={key}
                equipmentType={key}
                label={entry.label}
                Visual={entry.Visual}
                resolveBenchPosition={resolveDropSlot}
                onDroppedOnBench={handleDroppedOnBench}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View ref={boardRef} style={{ width: BOARD_DISPLAY_WIDTH, height: boardHeight }}>
          <Svg
            width={BOARD_DISPLAY_WIDTH}
            height={boardHeight}
            viewBox={`0 0 ${CIRCUIT_BOARD_VIEWBOX.width} ${CIRCUIT_BOARD_VIEWBOX.height}`}
          >
            {board.wireSegments.map((seg, i) => (
              <Line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={colors.primaryBlack}
                strokeWidth={2}
                strokeDasharray={seg.dashed ? "5,4" : undefined}
              />
            ))}
          </Svg>

          {/* Battery symbol — fixed, never a slot */}
          <View
            style={{
              position: "absolute",
              left: board.batteryAnchor.x * scale - 20,
              top: board.batteryAnchor.y * scale - 15,
            }}
          >
            <BatteryArt size={30} />
          </View>

          {/* Slot outlines + placed component icons */}
          {board.slots.map((slot) => {
            const inst = instanceBySlot[slot.slotId];
            const entry = inst ? LAB_EQUIPMENT_CATALOG.find((e) => e.key === inst.equipmentType) : null;
            const Visual = entry?.Visual;
            return (
              <Pressable
                key={slot.slotId}
                disabled={!inst}
                onPress={() => setPanelInstanceId(inst?.instanceId ?? null)}
                style={{
                  position: "absolute",
                  left: (slot.anchor.x - SLOT_SIZE / 2) * scale,
                  top: (slot.anchor.y - SLOT_SIZE / 2) * scale,
                  width: SLOT_SIZE * scale,
                  height: SLOT_SIZE * scale,
                  borderRadius: 8,
                  // Neutral connection-point styling — filled vs. empty only, never a hint at
                  // correctness (a green "success" border here would tell the student they got it
                  // right before they've even checked). Which component belongs in which position
                  // is exactly what the student has to work out; the slot itself stays silent
                  // about it, whether empty or filled.
                  borderWidth: inst ? 1.5 : 1,
                  borderStyle: inst ? "solid" : "dashed",
                  borderColor: inst ? colors.primaryBlack : colors.borderColorLight,
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Visual ? (
                  <Visual size={22} color={colors.primaryBlack} />
                ) : (
                  <Text className="font-aregular text-base text-muted">+</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal transparent animationType="slide" visible={!!panelInstance} onRequestClose={() => setPanelInstanceId(null)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
          <View className="bg-surface rounded-t-3xl p-5">
            <SheetHandle />
            {panelInstance && (
              <>
                <Text className="text-lg font-amedium text-ink mb-4">
                  {LAB_EQUIPMENT_CATALOG.find((e) => e.key === panelInstance.equipmentType)?.label} — slot {panelSlot?.slotId}
                </Text>

                {panelInstance.role === "resistor" && (
                  <>
                    <Text className="font-aregular text-xs text-muted mb-1">Resistance (Ω)</Text>
                    <TextInput
                      className="px-3 py-2.5 rounded-xl border font-aregular mb-3"
                      style={{ borderColor: colors.borderColorLight, color: colors.primaryBlack }}
                      keyboardType="decimal-pad"
                      value={resistanceInput}
                      onChangeText={setResistanceInput}
                      placeholder="e.g. 10"
                    />
                    <Button
                      label={panelInstance.resistanceValue != null ? `Set: ${panelInstance.resistanceValue} Ω` : "Set resistance"}
                      onPress={() => {
                        const v = parseFloat(resistanceInput);
                        if (Number.isFinite(v)) dispatch.setComponentValue(panelInstance.instanceId, v);
                      }}
                    />
                  </>
                )}

                {(panelInstance.role === "ammeter" || panelInstance.role === "voltmeter") && (
                  <>
                    <Text className="font-aregular text-muted mb-3">
                      {panelInstance.lastMeasurement?.value != null
                        ? `Reading: ${panelInstance.lastMeasurement.value} ${panelInstance.role === "ammeter" ? "A" : "V"}`
                        : panelInstance.lastMeasurement?.measuredAt
                          ? // A reading was attempted but nothing measurable came back — deliberately not
                            // told WHY (that would give away the answer); the student has to reason about it,
                            // same as a real meter that shows nothing when wired incorrectly.
                            "No reading — check your circuit."
                          : "Not read yet."}
                    </Text>
                    <Button label="Read meter" onPress={() => dispatch.readMeter(panelInstance.instanceId)} />
                  </>
                )}

                <View className="h-2" />
                <Button
                  label="Remove from circuit"
                  variant="danger"
                  onPress={() => {
                    dispatch.removeComponent(panelInstance.instanceId);
                    setPanelInstanceId(null);
                  }}
                />
                <View className="h-2" />
                <Button label="Close" variant="secondary" onPress={() => setPanelInstanceId(null)} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
