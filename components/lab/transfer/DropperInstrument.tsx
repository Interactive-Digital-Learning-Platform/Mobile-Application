import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { resolveLiquidAppearance } from "@/constants/lab/equipment.constants";
import { DROPPER_ART_SIZE, TRANSFER_STATUS_LABEL } from "@/constants/lab/transfer.constants";
import { useDraggableBenchItem } from "@/hooks/lab/use-draggable-bench-item";
import { ChemicalType, EquipmentInstanceType } from "@/types/lab";
import DropperArt from "@/components/lab/equipment/DropperArt";

type Props = {
  id: string;
  label: string;
  instance: EquipmentInstanceType;
  chemicalMap: Record<string, ChemicalType>;
  resolveDropTarget: (x: number, y: number, excludeId?: string) => Promise<string | null>;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onInspect: () => void;
  onHoverChange: (containerId: string | null) => void;
  // Fired when the dropper is released overlapping a container — the server decides whether that's
  // "positioned in a source" or "positioned over a target" from the dropper's own state.
  onInsert: (dropperId: string, containerId: string) => void;
  // Marks this dropper as the one the Transfer action panel should act on.
  onActivate: (dropperId: string) => void;
  // Registers the dropper's body in the shared drop-target registry so a material bottle dragged
  // from the drawer can be dropped onto it (fills the dropper — indicators come in a dropper bottle).
  registerRef: (node: View | null) => void;
};

// A dropper on the bench. Not a container — it has its own transfer lifecycle (see
// liquidTransferService.js): drag its tip into a liquid → Fill; drag it over another container →
// Add a drop. The Fill / Add-a-drop controls live in TransferActionSheet.
export default function DropperInstrument({
  id,
  label,
  instance,
  chemicalMap,
  resolveDropTarget,
  onMove,
  onInspect,
  onHoverChange,
  onInsert,
  onActivate,
  registerRef,
}: Props) {
  const bodyRef = useRef<View>(null);
  const t = instance.transfer;
  const held = t?.contents?.[0];
  const heldChemical = held ? chemicalMap[held.chemical] : undefined;
  const hasLiquid = (held?.volume ?? 0) > 0;
  // A just-drawn dropper is essentially full; show a clearly visible column even for colourless
  // reagents (spec #25). Floor at 0.3 so any amount reads as "loaded".
  const fillLevel = hasLiquid
    ? Math.max(0.3, Math.min(1, (held!.volume ?? 0) / (t?.capacity || 1)))
    : 0;
  const heldLook = hasLiquid ? resolveLiquidAppearance(heldChemical) : null;
  const liquidColor = heldLook?.color;

  const checkOverlap = () => {
    bodyRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      const tipX = pageX + w / 2;
      const tipY = pageY + h - 4;
      resolveDropTarget(tipX, tipY, id).then((cid) => onHoverChange(cid && cid !== id ? cid : null));
    });
  };

  const { panGesture, animatedStyle } = useDraggableBenchItem({
    id,
    position: instance.position,
    onMove,
    onDragChange: checkOverlap,
    resolveDropTarget,
    // Any release of the dropper makes it the active instrument — so even a tiny drag that the
    // Tap gesture doesn't claim still opens the Fill / Add-a-drop panel.
    onRelease: () => onActivate(id),
    onDrop: (targetId) => {
      onHoverChange(null);
      if (!targetId || targetId === id) return false; // not over a container → just reposition
      // Over a container: hand off to the server (source vs. target is decided from the dropper's
      // own fill state) and open the action panel. Return true so the drag does NOT also fire a
      // move_equipment — that second mutation races the transfer-state update and was making the
      // Fill / Add-a-drop panel appear only intermittently.
      onActivate(id);
      onInsert(id, targetId);
      return true;
    },
  });

  // Tap = "act on this dropper" (opens the Fill / Add-a-drop panel). A long press opens the
  // generic inspect sheet.
  const tap = Gesture.Tap().onEnd(() => runOnJS(onActivate)(id));
  const longPress = Gesture.LongPress().onStart(() => runOnJS(onInspect)());
  const gesture = Gesture.Race(panGesture, tap, longPress);

  // Briefly flash the tip on a successful dispense (contents just dropped).
  const [flash, setFlash] = useState(false);
  const prevVol = useRef(held?.volume ?? 0);
  useEffect(() => {
    const v = held?.volume ?? 0;
    if (v < prevVol.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 260);
      prevVol.current = v;
      return () => clearTimeout(timer);
    }
    prevVol.current = v;
  }, [held?.volume]);

  const statusText = t?.status && t.status !== "empty" ? TRANSFER_STATUS_LABEL[t.status] : null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View ref={registerRef} style={[{ position: "absolute", width: 96, alignItems: "center" }, animatedStyle]}>
        <View ref={bodyRef} style={{ width: (DROPPER_ART_SIZE * 20) / 56, height: DROPPER_ART_SIZE, alignItems: "center", justifyContent: "flex-end" }}>
          <View
            pointerEvents="none"
            style={{ position: "absolute", bottom: 0, alignSelf: "center", width: 14, height: 4, borderRadius: 999, backgroundColor: "#0f172a", opacity: 0.1 }}
          />
          <DropperArt
            size={DROPPER_ART_SIZE}
            color={t?.contaminated ? "#B45309" : colors.primaryBlack}
            liquidColor={liquidColor}
            fillLevel={fillLevel}
          />
          {flash && held && (
            <Animated.View
              pointerEvents="none"
              entering={FadeIn.duration(60)}
              exiting={FadeOut.duration(200)}
              style={{ position: "absolute", bottom: -6, width: 5, height: 8, borderRadius: 3, backgroundColor: heldChemical?.color || "#94a3b8" }}
            />
          )}
        </View>

        <Text className="text-[10px] font-bold text-slate-500 mt-1" numberOfLines={1}>
          {label}
        </Text>
        {heldChemical && (
          <Text className="text-[10px] font-semibold mt-0.5" numberOfLines={1} style={{ color: heldChemical.color === "#FFFFFF" ? "#64748b" : heldChemical.color }}>
            {heldChemical.name}
          </Text>
        )}
        {statusText && (
          <View className="mt-0.5 px-2 py-0.5 rounded-full bg-slate-800">
            <Text className="text-white font-bold" style={{ fontSize: 9 }} numberOfLines={1}>
              {statusText}
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
