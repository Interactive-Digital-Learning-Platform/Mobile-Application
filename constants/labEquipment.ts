// Fixed equipment catalog shown during equipment selection. Which items are actually
// required for a given practical is never sent to the client — only the evaluation
// endpoint (POST /api/sessions/:id/equipment-selection) knows, and it responds with a
// non-revealing hint rather than the answer.
export type EquipmentCatalogItem = { key: string; label: string };

export const LAB_EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  { key: "beaker", label: "Beaker" },
  { key: "test_tube", label: "Test Tube" },
  { key: "measuring_cylinder", label: "Measuring Cylinder" },
  { key: "dropper", label: "Dropper" },
  { key: "burette", label: "Burette" },
  { key: "pipette", label: "Pipette" },
  { key: "flask", label: "Flask" },
  { key: "thermometer", label: "Thermometer" },
  { key: "burner", label: "Burner" },
  { key: "stirrer", label: "Stirrer" },
  { key: "ph_meter", label: "pH Meter" },
  { key: "balance", label: "Balance" },
];
