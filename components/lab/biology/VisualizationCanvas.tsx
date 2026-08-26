import { ComponentType } from "react";
import { Text, View } from "react-native";
import { BiologyCanvasProps } from "@/types/lab";
import PhotosynthesisCanvas from "./canvases/PhotosynthesisCanvas";
import WaterCycleCanvas from "./canvases/WaterCycleCanvas";
import GasExchangeCanvas from "./canvases/GasExchangeCanvas";

// One canvas component per concept, keyed by the visualization's `animationKey` — adding a new
// concept means writing one new canvas + one new data entry here, never touching the player.
const CANVAS_REGISTRY: Record<string, ComponentType<BiologyCanvasProps>> = {
  photosynthesis: PhotosynthesisCanvas,
  water_cycle: WaterCycleCanvas,
  gas_exchange: GasExchangeCanvas,
};

type VisualizationCanvasProps = BiologyCanvasProps & { animationKey: string };

export default function VisualizationCanvas({ animationKey, ...canvasProps }: VisualizationCanvasProps) {
  const Canvas = CANVAS_REGISTRY[animationKey];

  if (!Canvas) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="font-aregular text-muted">This visualization isn&apos;t available yet.</Text>
      </View>
    );
  }

  return <Canvas {...canvasProps} />;
}
