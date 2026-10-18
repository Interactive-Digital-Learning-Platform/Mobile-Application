import { Pressable, View } from "react-native";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { VisualizationControlsProps } from "@/types/lab";

export default function VisualizationControls({
  isPlaying,
  onPlayPause,
  onReplay,
  onStepBack,
  onStepForward,
  canStepBack,
  canStepForward,
}: VisualizationControlsProps) {
  return (
    <View className="flex-row items-center justify-center gap-6 py-2">
      <Pressable onPress={onStepBack} disabled={!canStepBack} hitSlop={10} className={!canStepBack ? "opacity-30" : ""}>
        <SkipBack size={22} color={colors.primaryBlack} />
      </Pressable>
      <Pressable onPress={onPlayPause} hitSlop={10} className="w-14 h-14 rounded-full bg-primary items-center justify-center">
        {isPlaying ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
      </Pressable>
      <Pressable onPress={onStepForward} disabled={!canStepForward} hitSlop={10} className={!canStepForward ? "opacity-30" : ""}>
        <SkipForward size={22} color={colors.primaryBlack} />
      </Pressable>
      <Pressable onPress={onReplay} hitSlop={10}>
        <RotateCcw size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}
