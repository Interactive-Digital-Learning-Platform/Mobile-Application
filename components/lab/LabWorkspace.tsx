import { ComponentType } from "react";
import { View } from "react-native";
import { EquipmentRole, LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { LabWorkspaceProps, ProbeInstrumentProps } from "@/types/lab";
import EquipmentContainer from "./equipment/EquipmentContainer";
import PhMeterInstrument from "./equipment/PhMeterInstrument";
import PhysicsInstrument from "./equipment/PhysicsInstrument";

const catalogEntry = (equipmentType: string) => LAB_EQUIPMENT_CATALOG.find((e) => e.key === equipmentType);

// Role-keyed dispatch: a probe-role instance renders its own dedicated instrument component
// instead of the generic EquipmentContainer. Wiring a future probe (e.g. a thermometer) is just
// writing its instrument component and adding one entry here — no changes to this file's
// structure, EquipmentContainer, or the drop-target registries.
const PROBE_INSTRUMENTS: Partial<Record<EquipmentRole, ComponentType<ProbeInstrumentProps>>> = {
  "probe:ph": PhMeterInstrument,
};

export default function LabWorkspace({
  equipment,
  chemicalMap,
  registerEquipmentRef,
  registerLiquidRegion,
  resolveLiquidRegion,
  onMoveEquipment,
  onToggleHeat,
  onInspectEquipment,
  probeMeasure,
  probeDetach,
  hoveredEquipmentId,
  resolveDropTarget,
  onPour,
  physicsEquipment,
  physicsDispatch,
}: LabWorkspaceProps) {
  return (
    <View style={{ flex: 1, position: "relative" }}>
      {(physicsEquipment || []).map((instance) => {
        const entry = catalogEntry(instance.equipmentType);
        if (!physicsDispatch) return null;
        return (
          <PhysicsInstrument
            key={instance.instanceId}
            id={instance.instanceId}
            label={entry?.label || instance.equipmentType}
            instance={instance}
            dispatch={physicsDispatch}
          />
        );
      })}
      {equipment.map((instance) => {
        const entry = catalogEntry(instance.equipmentType);
        const label = entry?.label || instance.equipmentType;
        const Visual = entry?.Visual;
        const role = entry?.role || "container";

        const Instrument = PROBE_INSTRUMENTS[role];
        if (Instrument && entry?.probeOffset) {
          return (
            <Instrument
              key={instance.instanceId}
              id={instance.instanceId}
              label={label}
              instance={instance}
              equipment={equipment}
              probeOffset={entry.probeOffset}
              resolveLiquidRegion={resolveLiquidRegion}
              onMove={onMoveEquipment}
              onInspect={() => onInspectEquipment(instance.instanceId)}
              probeMeasure={probeMeasure}
              probeDetach={probeDetach}
            />
          );
        }

        if (!Visual) return null;

        return (
          <EquipmentContainer
            key={instance.instanceId}
            ref={registerEquipmentRef(instance.instanceId)}
            id={instance.instanceId}
            label={label}
            Visual={Visual}
            position={instance.position}
            chemicals={instance.contents.map((c) => chemicalMap[c.chemical]).filter(Boolean)}
            contents={instance.contents}
            capacity={entry?.capacity}
            heated={instance.isHeated}
            isHeatSource={role === "heat_source"}
            temperature={instance.temperature}
            isDropTarget={hoveredEquipmentId === instance.instanceId}
            onMove={onMoveEquipment}
            registerLiquidRegion={registerLiquidRegion}
            resolveDropTarget={resolveDropTarget}
            onPour={onPour}
            // MVP simplification: tapping a container toggles "heated" directly, rather than
            // requiring the container to be spatially stacked on the burner equipment.
            onPress={role !== "heat_source" ? () => onToggleHeat(instance.instanceId) : undefined}
            onInspect={() => onInspectEquipment(instance.instanceId)}
          />
        );
      })}
    </View>
  );
}
