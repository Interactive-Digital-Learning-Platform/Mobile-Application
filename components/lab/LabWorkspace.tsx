import { ComponentType } from "react";
import { View } from "react-native";
import { ChemicalType, EquipmentInstanceType, LastMeasurementType } from "@/types";
import { EquipmentRole, LAB_EQUIPMENT_CATALOG } from "@/constants/labEquipment";
import EquipmentContainer from "./EquipmentContainer";
import PhMeterInstrument from "./PhMeterInstrument";

type Props = {
  equipment: EquipmentInstanceType[];
  chemicalMap: Record<string, ChemicalType>;
  registerEquipmentRef: (id: string) => (node: any) => void;
  registerLiquidRegion: (id: string) => (node: View | null) => void;
  resolveLiquidRegion: (x: number, y: number) => Promise<string | null>;
  onMoveEquipment: (id: string, position: { x: number; y: number }) => void;
  onToggleHeat: (id: string) => void;
  onInspectEquipment: (id: string) => void;
  probeMeasure: (probeId: string, targetId: string, onOutcome?: (measurement: LastMeasurementType) => void) => void;
  probeDetach: (probeId: string) => void;
  // Instance currently being hovered over by a dragged chemical bottle — drives the dashed
  // highlight on that one EquipmentContainer. See ChemicalBottle's onHoverChange.
  hoveredEquipmentId?: string | null;
};

const catalogEntry = (equipmentType: string) => LAB_EQUIPMENT_CATALOG.find((e) => e.key === equipmentType);

// Common props every probe-role instrument needs — a future probe (e.g. thermometer) implements
// this same shape.
type ProbeInstrumentProps = {
  id: string;
  label: string;
  instance: EquipmentInstanceType;
  equipment: EquipmentInstanceType[];
  probeOffset: { x: number; y: number };
  resolveLiquidRegion: (x: number, y: number) => Promise<string | null>;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onInspect?: () => void;
  probeMeasure: (probeId: string, targetId: string, onOutcome?: (measurement: LastMeasurementType) => void) => void;
  probeDetach: (probeId: string) => void;
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
}: Props) {
  return (
    <View style={{ flex: 1, position: "relative" }}>
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
