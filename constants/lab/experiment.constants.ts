import { FlaskConical, Leaf, Zap } from "lucide-react-native";

export const LAB_SUBJECTS = [
  { key: "Chemistry", label: "Chemistry Laboratory", Icon: FlaskConical, color: "#4FA8F7", available: true, unitLabel: "practicals" },
  // Biology's first feature is the Concept Visualization module (interactive 2D animations), not
  // the equipment/chemical bench flow the other two subjects use — see app/(tabs)/lab/biology/
  // and its own catalog/count fetched via useBiologyVisualizations, not useExperimentsBySubject.
  { key: "Biology", label: "Biology Laboratory", Icon: Leaf, color: "#7CB342", available: true, unitLabel: "visualizations" },
  { key: "Physics", label: "Physics Laboratory", Icon: Zap, color: "#F7A94F", available: true, unitLabel: "practicals" },
];
