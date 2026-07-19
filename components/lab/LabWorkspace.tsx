import { View } from "react-native";
import { ChemicalType } from "@/types";
import { EquipmentDef } from "@/hooks/use-lab-workspace";
import EquipmentContainer from "./EquipmentContainer";

type Props = {
  equipmentList: EquipmentDef[];
  positions: Record<string, { x: number; y: number }>;
  chemicalsByEquipment: Record<string, ChemicalType[]>;
  heated: Record<string, boolean>;
  registerEquipmentRef: (id: string) => (node: any) => void;
  onMoveEquipment: (id: string, position: { x: number; y: number }) => void;
  onToggleHeat: (id: string) => void;
};

export default function LabWorkspace({
  equipmentList,
  positions,
  chemicalsByEquipment,
  heated,
  registerEquipmentRef,
  onMoveEquipment,
  onToggleHeat,
}: Props) {
  return (
    <View style={{ flex: 1, position: "relative" }}>
      {equipmentList.map((equipment) => (
        <EquipmentContainer
          key={equipment.id}
          ref={registerEquipmentRef(equipment.id)}
          id={equipment.id}
          label={equipment.label}
          position={positions[equipment.id]}
          chemicals={chemicalsByEquipment[equipment.id] || []}
          heated={!!heated[equipment.id]}
          isBurner={equipment.type === "burner"}
          onMove={onMoveEquipment}
          // MVP simplification: tapping a container toggles "heated" directly, rather than
          // requiring the container to be spatially stacked on the burner equipment.
          onPress={equipment.type !== "burner" ? () => onToggleHeat(equipment.id) : undefined}
        />
      ))}
    </View>
  );
}
