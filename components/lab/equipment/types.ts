// Shared prop contract for every equipment art component: `size` is interpreted as target
// height, each component computes its own width from its own viewBox aspect ratio — so every
// call site (shelf pill, bench container) can just do `<Visual size={N} color={...} />` with no
// per-type special-casing.
//
// `liquidColor`/`fillLevel` are only meaningful for container-role art (beaker, test tube, etc.)
// — those components render their liquid fill INSIDE their own <Svg>, clipped to their own
// silhouette Path, so liquid can never overflow the equipment's actual shape. Non-container art
// (pH meter, burner, thermometer, stirrer, balance) simply ignores them.
export type EquipmentVisualProps = {
  size?: number;
  color?: string;
  liquidColor?: string;
  fillLevel?: number; // 0 (empty) - 1 (full), fraction of the vessel's usable height
  on?: boolean; // heat_source-role art only (BurnerArt) — whether it's actively lit. Ignored elsewhere.
  temperature?: number; // probe:temp-role art only (ThermometerArt) — instance.temperature in °C. Ignored elsewhere.
};
