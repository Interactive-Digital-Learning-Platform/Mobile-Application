import { useEffect } from "react";
import { Rect } from "react-native-svg";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
  clipPathId?: string;
  // A suspended solid / precipitate — drawn as a hazier band settling toward the vessel floor.
  precipitateColor?: string | null;
  cloudiness?: number;
};

// Shared liquid-fill fragment for every container art (test tube, beaker, flask, cylinder).
// Cross-fades `color` and `opacity` over ~420ms whenever the backend's observableState changes
// (spec §14) instead of snapping — so the student clearly notices "something changed because of
// my action". Renders SVG elements only; must be used inside an <Svg>.
export default function AnimatedLiquidRect({
  x,
  y,
  width,
  height,
  color,
  opacity = 0.8,
  clipPathId = "interior",
  precipitateColor,
  cloudiness = 0,
}: Props) {
  const progress = useSharedValue(1);
  const fromColor = useSharedValue(color);
  const toColor = useSharedValue(color);
  const fillOpacity = useSharedValue(opacity);

  useEffect(() => {
    fromColor.value = interpolateColor(progress.value, [0, 1], [fromColor.value, toColor.value]);
    toColor.value = color;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 420 });
  }, [color, progress, fromColor, toColor]);

  useEffect(() => {
    fillOpacity.value = withTiming(opacity, { duration: 420 });
  }, [opacity, fillOpacity]);

  const animatedProps = useAnimatedProps(() => ({
    fill: interpolateColor(progress.value, [0, 1], [fromColor.value, toColor.value]),
    fillOpacity: fillOpacity.value,
  }));

  // Precipitate band opacity tracks cloudiness; sits in the bottom ~38% of the liquid column.
  const precipBand = useDerivedValue(() => withTiming(Math.max(0, Math.min(1, cloudiness)) * 0.75, { duration: 420 }));
  const precipProps = useAnimatedProps(() => ({ fillOpacity: precipBand.value }));
  const precipH = Math.max(4, height * 0.38);

  return (
    <>
      <AnimatedRect
        x={x}
        y={y}
        width={width}
        height={height}
        clipPath={`url(#${clipPathId})`}
        animatedProps={animatedProps}
      />
      {precipitateColor && cloudiness > 0 && (
        <AnimatedRect
          x={x}
          y={y + height - precipH}
          width={width}
          height={precipH}
          fill={precipitateColor}
          clipPath={`url(#${clipPathId})`}
          animatedProps={precipProps}
        />
      )}
    </>
  );
}
