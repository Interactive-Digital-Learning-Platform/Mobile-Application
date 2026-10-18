import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { PhysicsInstrumentProps } from "@/types/lab";
import { useDraggableBenchItem } from "@/hooks/lab/use-draggable-bench-item";
import SheetHandle from "@/components/ui/SheetHandle";
import Button from "@/components/ui/Button";

// Equipment types whose control panel actually has something to set/read — everything else
// (retort_stand, ruler, test_object, slotted_mass) is drag-to-position only, matching a real lab
// bench where those items are just holders/tools rather than instruments with a reading. A
// slotted mass's actual value is recorded on the SPRING it's attached to (see the "spring" case
// below) — attaching it to its own instance would never feed computeSpringConstant, which reads
// the spring instance's own attachedMass field.
const INTERACTIVE_TYPES = new Set(["pendulum_bob", "stopwatch", "spring", "balance", "measuring_cylinder"]);

const NumberField = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) => (
  <View className="mb-3">
    <Text className="font-amedium text-xs text-muted mb-1">{label}</Text>
    <TextInput
      className="px-3 py-2.5 rounded-xl border font-aregular"
      style={{ borderColor: colors.borderColorLight, color: colors.primaryBlack }}
      keyboardType="decimal-pad"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
    />
  </View>
);

// Mechanics (Phase A) bench instrument — one component covering every equipmentType in
// physicsEquipment (pendulum, spring, stopwatch, balance/measuring_cylinder reused for Density),
// rather than a separate file per type. Drag repositions it (useDraggableBenchItem, same as
// EquipmentContainer/PhMeterInstrument); a plain tap opens a control-panel Modal with the
// numeric inputs/buttons relevant to this instance's equipmentType — kept as a Modal rather than
// inline controls under the gesture-detected drag area, so text-input focus never has to fight
// the pan gesture for the touch.
export default function PhysicsInstrument({ id, label, instance, dispatch }: PhysicsInstrumentProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [lengthInput, setLengthInput] = useState("");
  const [angleInput, setAngleInput] = useState("");
  const [massInput, setMassInput] = useState("");
  const [extendedInput, setExtendedInput] = useState("");
  const [initialVolInput, setInitialVolInput] = useState("");
  const [finalVolInput, setFinalVolInput] = useState("");

  const entry = LAB_EQUIPMENT_CATALOG.find((e) => e.key === instance.equipmentType);
  const Visual = entry?.Visual;
  const isInteractive = INTERACTIVE_TYPES.has(instance.equipmentType);

  const { panGesture, animatedStyle } = useDraggableBenchItem({
    id,
    position: instance.position,
    onMove: dispatch.onMove,
  });

  const openPanel = () => setPanelOpen(true);
  const tapGesture = Gesture.Tap().onEnd(() => {
    if (isInteractive) runOnJS(openPanel)();
  });
  const gesture = Gesture.Race(panGesture, tapGesture);

  const parseNum = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const renderPanelContent = () => {
    switch (instance.equipmentType) {
      case "pendulum_bob":
        return (
          <>
            <NumberField label="String length (cm)" value={lengthInput} onChangeText={setLengthInput} placeholder="e.g. 50" />
            <Button
              label={instance.length.value != null ? `Length set: ${instance.length.value} cm` : "Set length"}
              onPress={() => {
                const v = parseNum(lengthInput);
                if (v != null) dispatch.setLength(id, v);
              }}
              variant="secondary"
              size="md"
            />
            <View className="h-3" />
            <NumberField label="Release angle (degrees)" value={angleInput} onChangeText={setAngleInput} placeholder="e.g. 10" />
            <Button
              label={instance.angle.value != null ? `Angle set: ${instance.angle.value}°` : "Set angle"}
              onPress={() => {
                const v = parseNum(angleInput);
                if (v != null) dispatch.setReleaseAngle(id, v);
              }}
              variant="secondary"
              size="md"
            />
          </>
        );

      case "stopwatch": {
        const running = instance.timerState.running;
        const g = instance.lastMeasurement?.measurementType === "g" ? instance.lastMeasurement.value : null;
        return (
          <>
            <Text className="font-aregular text-muted mb-3">
              {running
                ? `Running — ${instance.timerState.oscillationCount} oscillation(s) counted`
                : instance.timerState.elapsedSeconds > 0
                  ? `Stopped — ${instance.timerState.oscillationCount} oscillation(s) in ${instance.timerState.elapsedSeconds.toFixed(1)}s`
                  : "Not started yet"}
            </Text>
            {!running ? (
              <Button label="Start timer" onPress={() => dispatch.startTimer(id)} size="md" />
            ) : (
              <>
                <Button label="+1 oscillation" onPress={() => dispatch.recordOscillation(id)} variant="secondary" size="md" />
                <View className="h-2" />
                <Button label="Stop timer" onPress={() => dispatch.stopTimer(id)} size="md" />
              </>
            )}
            {g != null && <Text className="font-amedium text-emerald-700 mt-3">Implied g ≈ {g.toFixed(2)} m/s²</Text>}
          </>
        );
      }

      case "spring": {
        const naturalSet = instance.length.value != null;
        const massSet = instance.attachedMass.value != null;
        const k = instance.lastMeasurement?.measurementType === "spring_constant" ? instance.lastMeasurement.value : null;
        return (
          <>
            {!naturalSet ? (
              <>
                <NumberField label="Natural length (cm)" value={lengthInput} onChangeText={setLengthInput} placeholder="e.g. 10" />
                <Button
                  label="Set natural length"
                  onPress={() => {
                    const v = parseNum(lengthInput);
                    if (v != null) dispatch.setLength(id, v);
                  }}
                  size="md"
                />
              </>
            ) : !massSet ? (
              <>
                <Text className="font-aregular text-muted mb-3">Natural length: {instance.length.value} cm</Text>
                <NumberField
                  label="Attach a mass (g) — drag a slotted mass onto the spring, then record its value here"
                  value={massInput}
                  onChangeText={setMassInput}
                  placeholder="e.g. 200"
                />
                <Button
                  label="Attach mass"
                  onPress={() => {
                    const v = parseNum(massInput);
                    if (v != null) dispatch.attachMass(id, v);
                  }}
                  size="md"
                />
              </>
            ) : (
              <>
                <Text className="font-aregular text-muted mb-3">
                  Natural length: {instance.length.value} cm · Mass attached: {instance.attachedMass.value} g
                </Text>
                <NumberField label="Stretched length (cm)" value={extendedInput} onChangeText={setExtendedInput} placeholder="e.g. 15" />
                <Button
                  label="Record reading"
                  onPress={() => {
                    const v = parseNum(extendedInput);
                    if (v != null) dispatch.readMeasurement(id, v);
                  }}
                  size="md"
                />
              </>
            )}
            {k != null && <Text className="font-amedium text-emerald-700 mt-3">Spring constant ≈ {k.toFixed(2)} N/m</Text>}
          </>
        );
      }

      case "balance":
        return (
          <>
            <NumberField label="Mass reading (g)" value={massInput} onChangeText={setMassInput} placeholder="e.g. 45.6" />
            <Button
              label={instance.attachedMass.value != null ? `Recorded: ${instance.attachedMass.value} g` : "Record mass"}
              onPress={() => {
                const v = parseNum(massInput);
                if (v != null) dispatch.readMeasurement(id, v, { unit: "g" });
              }}
              size="md"
            />
          </>
        );

      case "measuring_cylinder":
        return (
          <>
            <NumberField
              label="Initial water level (mL)"
              value={initialVolInput}
              onChangeText={setInitialVolInput}
              placeholder="e.g. 50"
            />
            <Button
              label={
                instance.measuredVolumeDisplacement.initial != null
                  ? `Initial: ${instance.measuredVolumeDisplacement.initial} mL`
                  : "Record initial level"
              }
              onPress={() => {
                const v = parseNum(initialVolInput);
                if (v != null) dispatch.readMeasurement(id, v, { phase: "initial" });
              }}
              variant="secondary"
              size="md"
            />
            <View className="h-3" />
            <NumberField label="Final water level (mL)" value={finalVolInput} onChangeText={setFinalVolInput} placeholder="e.g. 65" />
            <Button
              label={
                instance.measuredVolumeDisplacement.final != null
                  ? `Final: ${instance.measuredVolumeDisplacement.final} mL`
                  : "Record final level"
              }
              onPress={() => {
                const v = parseNum(finalVolInput);
                if (v != null) dispatch.readMeasurement(id, v, { phase: "final" });
              }}
              size="md"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ position: "absolute", width: 90, alignItems: "center" }, animatedStyle]}>
          {Visual && <Visual size={44} color={colors.primaryBlack} />}
          <Text className="font-amedium text-xs mt-1 text-center" style={{ color: colors.primaryBlack }} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </GestureDetector>

      {isInteractive && (
        <Modal transparent animationType="slide" visible={panelOpen} onRequestClose={() => setPanelOpen(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
            <View className="bg-surface rounded-t-3xl p-5">
              <SheetHandle />
              <Text className="text-lg font-amedium text-ink mb-4">{label}</Text>
              {renderPanelContent()}
              <View className="h-2" />
              <Button label="Close" onPress={() => setPanelOpen(false)} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
