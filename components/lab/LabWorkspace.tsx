import { ComponentType } from "react";
import { View } from "react-native";
import {
  benchScale,
  BOX,
  capacityScale,
  EquipmentRole,
  friendlyEquipmentName,
  LAB_EQUIPMENT_CATALOG,
} from "@/constants/lab/equipment.constants";
import { rendersAsTransferInstrument } from "@/constants/lab/transfer.constants";
import { EquipmentInstanceType, LabWorkspaceProps, ProbeInstrumentProps } from "@/types/lab";
import EquipmentContainer from "./equipment/EquipmentContainer";
import PhMeterInstrument from "./equipment/PhMeterInstrument";
import PhysicsInstrument from "./equipment/PhysicsInstrument";
import PourStream from "./effects/PourStream";
import DropperInstrument from "./transfer/DropperInstrument";

const catalogEntry = (equipmentType: string) => LAB_EQUIPMENT_CATALOG.find((e) => e.key === equipmentType);

// Bench-local point near the top-centre (spout / rim) of an instance's rendered box.
const vesselMouth = (instance: EquipmentInstanceType) => {
  const outerWidth = BOX * benchScale(instance.equipmentType) + 38;
  return { x: instance.position.x + outerWidth / 2, y: instance.position.y + 6 };
};

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
  onHoverChange,
  resolveDropTarget,
  onPour,
  pourEvent,
  probeTargetId,
  onProbeTargetChange,
  onTransferInsert,
  onTransferActivate,
  physicsEquipment,
  physicsDispatch,
}: LabWorkspaceProps) {
  const pourSource = pourEvent ? equipment.find((e) => e.instanceId === pourEvent.sourceId) : undefined;
  const pourTarget = pourEvent ? equipment.find((e) => e.instanceId === pourEvent.targetId) : undefined;
  // Tilt the source toward the target: target on the right → tip clockwise (+), on the left → (−).
  const pourAngle = pourSource && pourTarget && pourTarget.position.x >= pourSource.position.x ? 24 : -24;

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
        const label = friendlyEquipmentName(equipment, instance.instanceId) || entry?.label || instance.equipmentType;
        const Visual = entry?.Visual;
        const role = entry?.role || "container";

        // Transfer instruments that have a dedicated bench component (dropper today; pipette /
        // burette when built). Others fall through to EquipmentContainer below.
        if (rendersAsTransferInstrument(instance.equipmentType)) {
          return (
            <DropperInstrument
              key={instance.instanceId}
              id={instance.instanceId}
              label={label}
              instance={instance}
              chemicalMap={chemicalMap}
              registerRef={registerEquipmentRef(instance.instanceId)}
              resolveDropTarget={resolveDropTarget}
              onMove={onMoveEquipment}
              onInspect={() => onInspectEquipment(instance.instanceId)}
              onHoverChange={(cid) => onHoverChange?.(cid)}
              onInsert={(dropperId, containerId) => onTransferInsert?.(dropperId, containerId)}
              onActivate={(dropperId) => onTransferActivate?.(dropperId)}
            />
          );
        }

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
              onTargetChange={onProbeTargetChange}
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
            scale={benchScale(instance.equipmentType) * capacityScale(instance.equipmentType, instance.capacity)}
            isPouringOut={pourEvent?.sourceId === instance.instanceId}
            pourAngle={pourAngle}
            position={instance.position}
            chemicals={instance.contents.map((c) => chemicalMap[c.chemical]).filter(Boolean)}
            contents={instance.contents}
            observableState={instance.observableState}
            capacity={instance.capacity ?? entry?.capacity}
            heated={instance.isHeated}
            isHeatSource={role === "heat_source"}
            temperature={instance.temperature}
            isDropTarget={hoveredEquipmentId === instance.instanceId}
            isMeasuring={probeTargetId === instance.instanceId}
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

      {/* Pour stream on top — connects the tilted source's spout to the target's rim. */}
      {pourEvent && pourSource && pourTarget && (
        <PourStream key={pourEvent.nonce} from={vesselMouth(pourSource)} to={vesselMouth(pourTarget)} color={pourEvent.color} />
      )}
    </View>
  );
}
