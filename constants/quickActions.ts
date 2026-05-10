import { QuickActionType } from "@/types";
import { Atom, MessageCircleQuestion, Route } from "lucide-react-native";

export const quickActions: QuickActionType[] = [
  {
    icon: Atom,
    title: "Science concept",
    prompt: "Help me understand this science concept",
  },
  {
    icon: Route,
    title: "Step-by-step solution",
    prompt: "Provide step-by-step solution",
  },
  {
    icon: MessageCircleQuestion,
    title: "Help me understand",
    prompt: "Help me understand something",
  },
];
