import { Text, View } from "react-native";
import { GenericSceneCanvasProps } from "@/types/lab";
import AnimatedSceneAsset from "./assets/AnimatedSceneAsset";

// Renders any AI-generated stage by placing one AnimatedSceneAsset per sceneElement — the
// declarative counterpart to the hand-coded predefined canvases (PhotosynthesisCanvas etc.),
// used whenever a visualization's stages carry `sceneElements` (see VisualizationCanvas.tsx's
// registry lookup). Only needs the current stage's own data, not the full stage list, since each
// AI-generated stage is self-contained.
export default function GenericSceneCanvas({ stage, stageIndex, timelinePosition, showLabels, onTapComponent }: GenericSceneCanvasProps) {
  if (!stage) return null;

  return (
    <View className="flex-1">
      {stage.sceneElements?.map((element) => (
        <AnimatedSceneAsset
          key={element.elementId}
          element={element}
          timelinePosition={timelinePosition}
          stageIndex={stageIndex}
          active={stage.componentIds.includes(element.elementId)}
          showLabel={showLabels}
          onPress={onTapComponent}
        />
      ))}
      {!stage.sceneElements?.length && (
        <View className="flex-1 items-center justify-center">
          <Text className="font-aregular text-muted">Nothing to show for this stage.</Text>
        </View>
      )}
    </View>
  );
}
