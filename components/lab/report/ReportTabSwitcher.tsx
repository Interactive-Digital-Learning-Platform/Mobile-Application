import { useCallback } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { REPORT_TABS } from "@/constants/lab/report.constants";
import { ReportTabKey } from "@/types/lab";

const PAD = 4;

// Segmented control beneath the hero (spec: 3 tabs, clearly-selected, smooth switch).
export default function ReportTabSwitcher({
  value,
  onChange,
}: {
  value: ReportTabKey;
  onChange: (tab: ReportTabKey) => void;
}) {
  const reduceMotion = useReducedMotion();
  const trackW = useSharedValue(0);
  const activeIndex = REPORT_TABS.findIndex((t) => t.key === value);
  const progress = useSharedValue(activeIndex);

  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackW.value = e.nativeEvent.layout.width;
    },
    [trackW]
  );

  const select = useCallback(
    (tab: ReportTabKey, index: number) => {
      if (tab === value) return;
      progress.value = reduceMotion ? index : withTiming(index, { duration: 200 });
      onChange(tab);
    },
    [value, onChange, progress, reduceMotion]
  );

  const thumbStyle = useAnimatedStyle(() => {
    const seg = Math.max(0, (trackW.value - PAD * 2) / REPORT_TABS.length);
    return {
      width: seg,
      opacity: seg > 0 ? 1 : 0,
      transform: [
        { translateX: interpolate(progress.value, [0, REPORT_TABS.length - 1], [0, seg * (REPORT_TABS.length - 1)]) },
      ],
    };
  });

  return (
    <View
      className="flex-row h-12 rounded-2xl bg-slate-100 p-1 relative"
      onLayout={onTrackLayout}
      accessibilityRole="tablist"
    >
      <Animated.View className="absolute top-1 left-1 h-10 rounded-xl bg-white shadow-sm" style={thumbStyle} />
      {REPORT_TABS.map((tab, i) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => select(tab.key, i)}
            className="flex-1 items-center justify-center z-10 min-h-[44px]"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              numberOfLines={1}
              className={`text-[12.5px] ${active ? "font-black text-slate-900" : "font-semibold text-slate-400"}`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
