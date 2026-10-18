import { Pressable, Text, View } from "react-native";
import { Cloud, Droplet, Leaf, LucideIcon, Sprout, Sun } from "lucide-react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { AnimatedSceneAssetProps, GeneratedAssetType } from "@/types/lab";

// Controlled-vocabulary asset -> visual treatment. Icons are used where a recognizable one
// exists (lucide); everything else falls back to a short colored "chip" label, same dot styling
// as InteractiveBiologyElement so predefined and generated content read as one visual language.
// Keep in lockstep with ASSET_TYPES in the backend's src/utils/generatedVisualizationSchema.js.
const ASSET_VISUALS: Record<GeneratedAssetType, { Icon?: LucideIcon; chip?: string; color: string; label: string }> = {
  sun: { Icon: Sun, color: "#F7C948", label: "Sun" },
  cloud: { Icon: Cloud, color: "#90B4D9", label: "Cloud" },
  plant: { Icon: Sprout, color: "#7CB342", label: "Plant" },
  leaf: { Icon: Leaf, color: "#7CB342", label: "Leaf" },
  root: { chip: "Rt", color: "#8D6E63", label: "Root" },
  stem: { chip: "St", color: "#8D6E63", label: "Stem" },
  xylem: { chip: "Xy", color: "#8D6E63", label: "Xylem" },
  stomata: { chip: "•", color: "#33691E", label: "Stomata" },
  water_particle: { Icon: Droplet, color: "#4FC3F7", label: "Water" },
  water_vapour: { Icon: Droplet, color: "#B3E5FC", label: "Water vapour" },
  oxygen_molecule: { chip: "O2", color: "#EF5350", label: "Oxygen" },
  co2_molecule: { chip: "CO2", color: "#90A4AE", label: "Carbon dioxide" },
  blood_cell: { chip: "RBC", color: "#C62828", label: "Blood cell" },
  alveolus: { chip: "Al", color: "#F08A80", label: "Alveolus" },
  food_particle: { chip: "Fd", color: "#C9A16A", label: "Food" },
  enzyme: { chip: "En", color: "#AB47BC", label: "Enzyme" },
};

const FADE_PADDING = 0.15;

// Generalizes AnimatedFlowArrow: instead of one hand-picked icon/direction per call site, this
// derives x/y/opacity/scale/rotation from a data-driven `action` so the same component renders
// any controlled-vocabulary element the AI pipeline produces. `stageIndex` + `timelinePosition`
// give a local 0..1 progress within just this stage, same technique as StageLabelOverlay.
export default function AnimatedSceneAsset({ element, timelinePosition, stageIndex, active, showLabel, onPress }: AnimatedSceneAssetProps) {
  const visual = ASSET_VISUALS[element.assetType];
  const { action, fromX, fromY, toX, toY } = element;

  const style = useAnimatedStyle(() => {
    const t = timelinePosition.value - stageIndex;
    let x = fromX;
    let y = fromY;
    let opacity = interpolate(t, [0, FADE_PADDING, 1 - FADE_PADDING, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
    let scale = 1;
    let rotation = 0;

    switch (action) {
      case "move":
      case "flow":
      case "particleFlow":
      case "arrowFlow":
        x = interpolate(t, [0, 1], [fromX, toX], Extrapolation.CLAMP);
        y = interpolate(t, [0, 1], [fromY, toY], Extrapolation.CLAMP);
        break;
      case "fadeIn":
      case "appear":
        opacity = interpolate(t, [0, FADE_PADDING], [0, 1], Extrapolation.CLAMP);
        break;
      case "fadeOut":
      case "disappear":
        opacity = interpolate(t, [1 - FADE_PADDING, 1], [1, 0], Extrapolation.CLAMP);
        break;
      case "grow":
        scale = interpolate(t, [0, 1], [0.6, 1.2], Extrapolation.CLAMP);
        break;
      case "shrink":
        scale = interpolate(t, [0, 1], [1.2, 0.6], Extrapolation.CLAMP);
        break;
      case "rotate":
        rotation = interpolate(t, [0, 1], [0, 180], Extrapolation.CLAMP);
        break;
      case "pulse":
      case "highlight":
        scale = interpolate(t, [0, 0.5, 1], [0.85, 1.25, 0.85], Extrapolation.CLAMP);
        break;
    }

    return {
      left: `${x}%`,
      top: `${y}%`,
      opacity,
      transform: [{ translateX: -14 }, { translateY: -14 }, { scale }, { rotate: `${rotation}deg` }],
    };
  });

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: "absolute", alignItems: "center" }, style]}>
      <Pressable
        onPress={() => onPress(element.elementId)}
        hitSlop={10}
        className={`w-7 h-7 rounded-full items-center justify-center border-2 ${active ? "border-primary" : "border-white/60"}`}
        style={{ backgroundColor: `${visual.color}33` }}
      >
        {visual.Icon ? (
          <visual.Icon size={14} color={visual.color} />
        ) : (
          <Text style={{ fontSize: 8, fontWeight: "700", color: visual.color }}>{visual.chip}</Text>
        )}
      </Pressable>
      {showLabel && (
        <View className="mt-1 bg-ink/80 rounded-full px-2 py-0.5">
          <Text className="text-white text-[10px] font-amedium">{visual.label}</Text>
        </View>
      )}
    </Animated.View>
  );
}
