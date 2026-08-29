import { Text, TouchableOpacity, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Droplet, X } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ChemicalType, EquipmentInstanceType } from "@/types/lab";

type Props = {
  instance: EquipmentInstanceType;
  chemicalMap: Record<string, ChemicalType>;
  dropCount: number;
  busy: boolean;
  // Containers currently on the bench that a filled dropper could be positioned over — lets the
  // student advance without a pixel-perfect drag (belt & braces for the drop hit-test).
  targets: { instanceId: string; label: string }[];
  onFill: () => void;
  onDispense: () => void;
  onPositionOver: (containerId: string) => void;
  onClose: () => void;
};

// The contextual control for a liquid-transfer instrument — a compact card anchored to the bottom
// of the bench (not a modal, so the bench and drag stay live). Which action it offers is driven
// entirely by the instrument's server-authoritative `transfer.status`.
export default function TransferActionSheet({
  instance,
  chemicalMap,
  dropCount,
  busy,
  targets,
  onFill,
  onDispense,
  onPositionOver,
  onClose,
}: Props) {
  const t = instance.transfer;
  const held = t?.contents?.[0];
  const heldName = held ? chemicalMap[held.chemical]?.name : null;
  const status = t?.status ?? "empty";

  const body = (() => {
    if (status === "filled") {
      // Prefer a real drag ("move the dropper over the container"), but always offer a tap
      // fallback so a missed drop-target hit-test never strands the student here.
      if (targets.length === 1) {
        return {
          hint: "Move the dropper over the container — or:",
          action: { label: `Position over ${targets[0].label}`, onPress: () => onPositionOver(targets[0].instanceId) },
        };
      }
      if (targets.length > 1) {
        return { hint: "Move the dropper over the container you want to add it to.", action: null, chooseTarget: true };
      }
      return { hint: "Now move the dropper over the container you want to add it to.", action: null };
    }
    if (status === "positioned_over_target") {
      return {
        hint: dropCount > 0 ? `${dropCount} drop${dropCount > 1 ? "s" : ""} added` : "Release one drop at a time.",
        action: { label: "Add a drop", onPress: onDispense },
      };
    }
    if (status === "empty" && !held) {
      return { hint: "Dip the dropper back into a liquid to fill it again.", action: null };
    }
    // "positioned_in_source" or just-dropped (status not confirmed yet) — offer to fill. If the
    // dropper isn't actually in a liquid, the server says so.
    return { hint: "Squeeze the bulb to draw the liquid up.", action: { label: "Fill dropper", onPress: onFill } };
  })();

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(160)}
      className="absolute left-3 right-3 bottom-3 bg-white rounded-2xl p-3.5 border border-slate-200"
      style={{ shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}
    >
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-lg bg-slate-50 items-center justify-center">
          <Droplet size={15} color={ICON_COLORS.primary500} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-slate-800">Dropper</Text>
          <Text className="text-[11px] font-medium text-slate-400" numberOfLines={1}>
            {heldName ? `Holding ${heldName}` : "Empty"}
            {t?.contaminated ? " · may be contaminated" : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <X size={16} color={ICON_COLORS.slate400} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {!!body.hint && <Text className="text-[12px] text-slate-500 leading-4 mt-2">{body.hint}</Text>}

      {body.action && (
        <TouchableOpacity
          className={`mt-2.5 py-2.5 rounded-xl items-center ${busy ? "bg-slate-200" : "bg-primary"}`}
          activeOpacity={0.85}
          disabled={busy}
          onPress={body.action.onPress}
        >
          <Text className={`text-sm font-bold ${busy ? "text-slate-400" : "text-white"}`}>
            {busy ? "…" : body.action.label}
          </Text>
        </TouchableOpacity>
      )}

      {"chooseTarget" in body && body.chooseTarget && (
        <View className="flex-row flex-wrap gap-2 mt-2.5">
          {targets.map((target) => (
            <TouchableOpacity
              key={target.instanceId}
              className={`px-3 py-2 rounded-xl ${busy ? "bg-slate-200" : "bg-primary"}`}
              activeOpacity={0.85}
              disabled={busy}
              onPress={() => onPositionOver(target.instanceId)}
            >
              <Text className={`text-xs font-bold ${busy ? "text-slate-400" : "text-white"}`}>Over {target.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
}
