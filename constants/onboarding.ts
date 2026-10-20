import type { ImageSourcePropType } from "react-native";
import images from "@/constants/images";

export type OnboardingSlide = {
  key: string;
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: "ai",
    image: images.onboarding1,
    title: "Learn with your AI tutor",
    subtitle: "Ask anything about your lessons and get clear, step-by-step answers.",
  },
  {
    key: "quiz",
    image: images.onboarding2,
    title: "Quiz, compete, climb",
    subtitle: "Personalised quizzes that adapt to you, plus live 1v1 battles with friends.",
  },
  {
    key: "lab",
    image: images.onboarding3,
    title: "Experiments in your pocket",
    subtitle: "Try science experiments safely, anytime, in the virtual lab.",
  },
  {
    key: "notes",
    image: images.onboarding4,
    title: "Turn notes into knowledge",
    subtitle: "Scan your handwritten notes and get summaries and study materials.",
  },
];
