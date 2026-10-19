import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Pressable, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/ui/AppText";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardingSlide from "@/components/onboarding/OnboardingSlide";
import PageDots from "@/components/onboarding/PageDots";
import images from "@/constants/images";
import { ONBOARDING_SLIDES } from "@/constants/onboarding";
import { markOnboardingSeen } from "@/utils/onboardingStorage";

const LOGO_HEIGHT = 30;
const LOGO_ASPECT = 1565 / 611;
// Fixed so the pill keeps its size when the label changes from "Next" to "Get Started".
const NEXT_BUTTON_WIDTH = 200;

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Follow the page under the middle of the screen, so the button label flips as soon as a swipe passes halfway.
  useAnimatedReaction(
    () => Math.round(scrollX.value / width),
    (page, previous) => {
      if (page !== previous) runOnJS(setIndex)(page);
    },
    [width],
  );

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    router.replace("/(auth)/sign-in");
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  }, [finish, index, isLast, scrollRef, width]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-2 h-12">
        <Image
          source={images.nousLogo}
          resizeMode="contain"
          style={{ height: LOGO_HEIGHT, width: LOGO_HEIGHT * LOGO_ASPECT }}
          accessibilityLabel="Nous"
        />
        {!isLast && (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
            <Text className="text-base font-amedium text-[#64748B]">Skip</Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {ONBOARDING_SLIDES.map((slide, i) => (
          <OnboardingSlide key={slide.key} slide={slide} index={i} width={width} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View className="px-6 pb-4 gap-6">
        <PageDots count={ONBOARDING_SLIDES.length} width={width} scrollX={scrollX} />
        <Pressable
          onPress={next}
          accessibilityRole="button"
          className="self-center flex-row items-center justify-center gap-2 h-12 rounded-full bg-[#FC6E20] active:bg-[#E55B10]"
          style={{ width: NEXT_BUTTON_WIDTH }}
        >
          <Text className="text-base font-amedium text-white">{isLast ? "Get Started" : "Next"}</Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
