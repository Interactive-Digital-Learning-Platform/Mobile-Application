import { Pressable, Text, View } from "react-native";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, type LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { VisualizationControlsProps } from "@/types/lab";

function Control({
  icon: Icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center justify-center ${disabled ? "opacity-30" : ""}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className={`items-center justify-center ${
          primary ? "h-14 w-14 rounded-full bg-primary shadow-sm shadow-primary/30" : "h-10 w-10"
        }`}
      >
        <Icon size={primary ? 25 : 23} color={primary ? ICON_COLORS.white : ICON_COLORS.slate800} strokeWidth={2.2} />
      </View>
      <Text className={`mt-1 text-[11px] font-semibold ${primary ? "text-primary" : "text-slate-500"}`}>{label}</Text>
    </Pressable>
  );
}

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
    <View className="mt-3 flex-row items-center rounded-3xl border border-slate-100 bg-white px-2 py-3 shadow-sm shadow-black/10">
      <Control icon={SkipBack} label="Previous" onPress={onStepBack} disabled={!canStepBack} />
      <Control icon={isPlaying ? Pause : Play} label={isPlaying ? "Pause" : "Play"} onPress={onPlayPause} primary />
      <Control icon={SkipForward} label="Next" onPress={onStepForward} disabled={!canStepForward} />
      <Control icon={RotateCcw} label="Replay" onPress={onReplay} />
    </View>
  );
}
