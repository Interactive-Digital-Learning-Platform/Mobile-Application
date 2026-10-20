import { Image, View } from "react-native";
import { Text } from "@/components/ui/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { OnboardingSlide as Slide } from "@/constants/onboarding";

type Props = {
  slide: Slide;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
};

export default function OnboardingSlide({ slide, index, width, scrollX }: Props) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  // The illustration shrinks and fades as it scrolls away; the text drifts slightly faster than the page.
  const imageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollX.value, range, [0.85, 1, 0.85], Extrapolation.CLAMP) }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.25, 0, -width * 0.25], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ width }} className="flex-1 px-6">
      <Animated.View style={imageStyle} className="flex-1 items-center justify-center">
        <Image source={slide.image} resizeMode="contain" className="w-full h-full" />
      </Animated.View>
      <Animated.View style={textStyle} className="items-center pt-2 pb-6">
        <Text className="text-3xl font-abold text-[#0F172A] text-center">{slide.title}</Text>
        <Text className="text-base font-aregular text-[#64748B] text-center mt-3 leading-6 px-2">
          {slide.subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}
