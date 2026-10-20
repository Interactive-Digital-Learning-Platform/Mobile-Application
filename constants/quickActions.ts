import { QuickActionType } from "@/types/chatModuleTypes";
import { Atom, Route, LibraryBig, Lightbulb, FlaskConical } from "lucide-react-native";

// Starters are worded for the assistant's intent classifier: "Explain the science
// concept of …" lands on course-material RAG, and "Create a downloadable study
// sheet on …" matches its generate_pdf examples, so the reply comes back as a PDF.
export const quickActions: QuickActionType[] = [
  {
    id: "study-guidance",
    icon: Route,
    title: "Study Guidance",
    starter: "Guide me step by step on how to study ",
  },
  {
    id: "science-concepts",
    icon: Atom,
    title: "Science Concepts",
    starter: "Explain the science concept of ",
  },
  {
    id: "solve-problem",
    icon: Lightbulb,
    title: "Solve a Problem",
    starter: "Help me solve this problem step by step: ",
    attach: true,
  },
  {
    id: "subject-materials",
    icon: LibraryBig,
    title: "Subject Materials",
    starter: "Create a downloadable study sheet on ",
  },
  {
    id: "explore-experiments",
    icon: FlaskConical,
    title: "Explore Experiments",
    starter: "Walk me through the experiment on ",
  },
];
