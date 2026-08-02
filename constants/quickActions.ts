import { QuickActionType } from "@/types/chatModuleTypes";
import { Atom, Route, LibraryBig, Lightbulb, FlaskConical } from "lucide-react-native";

export const quickActions: QuickActionType[] = [
  {
    icon: Route,
    title: "Study Guidance",
    prompt: "Provide step-by-step solution",
  },
  {
    icon: Atom,
    title: "Science Concepts",
    prompt: "Help me understand this science concept",
  },
  {
    icon: Lightbulb,
    title: "Solve a Problem",
    prompt: "Help me understand something",
  },
  {
    icon: LibraryBig,
    title: "Subject Materials",
    prompt: "Help me understand this science concept",
  },
  {
    icon: FlaskConical,
    title: "Explore Experiments",
    prompt: "Explain this experiment and how it works",
  },
];
