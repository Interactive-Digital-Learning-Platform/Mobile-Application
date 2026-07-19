import { useCallback, useState } from "react";

export type EquipmentDef = { id: string; type: string; label: string };

export const EQUIPMENT_LIST: EquipmentDef[] = [
  { id: "beaker-1", type: "beaker", label: "Beaker" },
  { id: "test-tube-1", type: "test_tube", label: "Test Tube" },
  { id: "burner-1", type: "burner", label: "Burner" },
  { id: "dropper-1", type: "dropper", label: "Dropper" },
];

const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  "beaker-1": { x: 20, y: 20 },
  "test-tube-1": { x: 160, y: 20 },
  "burner-1": { x: 20, y: 160 },
  "dropper-1": { x: 160, y: 160 },
};

export const useLabWorkspace = () => {
  const [positions, setPositions] = useState(INITIAL_POSITIONS);
  const [chemicalIds, setChemicalIds] = useState<Record<string, string[]>>({});
  const [heated, setHeated] = useState<Record<string, boolean>>({});

  const moveEquipment = useCallback((id: string, position: { x: number; y: number }) => {
    setPositions((prev) => ({ ...prev, [id]: position }));
  }, []);

  const addChemicalToEquipment = useCallback((id: string, chemicalId: string) => {
    setChemicalIds((prev) => ({ ...prev, [id]: [...(prev[id] || []), chemicalId] }));
  }, []);

  const clearEquipment = useCallback((id: string) => {
    setChemicalIds((prev) => ({ ...prev, [id]: [] }));
  }, []);

  const toggleHeat = useCallback((id: string) => {
    setHeated((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return {
    equipmentList: EQUIPMENT_LIST,
    positions,
    chemicalIds,
    heated,
    moveEquipment,
    addChemicalToEquipment,
    clearEquipment,
    toggleHeat,
  };
};
