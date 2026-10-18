import { ComponentType } from "react";
import { Text, View } from "react-native";
import { BiologyCanvasProps, BiologyVisualizationStageType } from "@/types/lab";
import PhotosynthesisCanvas from "./canvases/PhotosynthesisCanvas";
import WaterCycleCanvas from "./canvases/WaterCycleCanvas";
import GasExchangeCanvas from "./canvases/GasExchangeCanvas";
import GenericSceneCanvas from "./GenericSceneCanvas";

// One canvas component per curated concept, keyed by the visualization's `animationKey` — adding
// a new predefined concept means writing one new canvas + one new data entry here, never
// touching the player. AI-generated visualizations never have a matching animationKey; they fall
// through to GenericSceneCanvas below, which interprets their stages' `sceneElements` instead.
const CANVAS_REGISTRY: Record<string, ComponentType<BiologyCanvasProps>> = {
  photosynthesis: PhotosynthesisCanvas,
  water_cycle: WaterCycleCanvas,
  gas_exchange: GasExchangeCanvas,
};

type VisualizationCanvasProps = BiologyCanvasProps & {
  animationKey: string;
  // Only consumed by GenericSceneCanvas — the predefined canvases drive everything off
  // `timelinePosition` alone and don't need the current stage's raw data.
  currentStage: BiologyVisualizationStageType | undefined;
  currentStageIndex: number;
};

export default function VisualizationCanvas({ animationKey, currentStage, currentStageIndex, ...canvasProps }: VisualizationCanvasProps) {
  const Canvas = CANVAS_REGISTRY[animationKey];

  if (Canvas) {
    return <Canvas {...canvasProps} />;
  }

  if (currentStage?.sceneElements?.length) {
    return (
      <GenericSceneCanvas
        stage={currentStage}
        stageIndex={currentStageIndex}
        timelinePosition={canvasProps.timelinePosition}
        showLabels={canvasProps.showLabels}
        onTapComponent={canvasProps.onTapComponent}
      />
    );
  }

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="font-aregular text-muted">This visualization isn&apos;t available yet.</Text>
    </View>
  );
}
