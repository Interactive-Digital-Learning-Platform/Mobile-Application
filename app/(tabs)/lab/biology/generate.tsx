import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Activity,
  Brain,
  ChevronRight,
  Leaf,
  Lightbulb,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useGenerateBiologyVisualization } from "@/hooks/lab/use-biology-visualizations";
import { GenerateVisualizationResponseType } from "@/types/lab";
import BiologyHeader from "@/components/lab/biology/BiologyHeader";
import VisualizationPlayer from "@/components/lab/biology/VisualizationPlayer";

const STATUS_MESSAGES = [
  "Understanding your question...",
  "Checking the Grade 10/11 curriculum...",
  "Planning the explanation...",
  "Creating animation scenes...",
  "Preparing your visualization...",
];

const EXAMPLE_TOPICS: { question: string; icon: LucideIcon; tint: string; color: string }[] = [
  { question: "How does transpiration happen in plants?", icon: Leaf, tint: "bg-lime-50", color: "#65A30D" },
  {
    question: "How does digestion happen in the small intestine?",
    icon: Activity,
    tint: "bg-blue-50",
    color: ICON_COLORS.blue500,
  },
  { question: "Explain the menstrual cycle.", icon: RefreshCw, tint: "bg-fuchsia-50", color: "#C026D3" },
];

export default function GenerateBiologyVisualizationScreen() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<GenerateVisualizationResponseType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const mutation = useGenerateBiologyVisualization();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mutation.isPending) {
      setStatusIndex(0);
      intervalRef.current = setInterval(() => {
        setStatusIndex((index) => Math.min(index + 1, STATUS_MESSAGES.length - 1));
      }, 1800);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mutation.isPending]);

  const handleGenerate = (text?: string) => {
    const trimmed = (text ?? question).trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setResult(null);
    mutation.mutate(trimmed, {
      onSuccess: (data) => setResult(data),
      onError: (error) => {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setErrorMessage(message || "Sorry, something went wrong. Please try again.");
      },
    });
  };

  if (result?.status !== "unsupported" && result?.visualization) {
    const visualization = {
      ...result.visualization,
      _id: "generated",
      animationKey: "generated",
      grades: [10, 11],
    };

    return (
      <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <BiologyHeader title={visualization.title} subtitle={visualization.syllabusTopic} onBack={() => setResult(null)} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <VisualizationPlayer visualization={visualization} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const canGenerate = !!question.trim() && !mutation.isPending;

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <BiologyHeader title="Understand a Concept" onBack={() => router.back()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mutation.isPending ? (
            <View className="flex-1 items-center justify-center px-6 py-16">
              <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles size={34} color={ICON_COLORS.primary500} strokeWidth={1.8} />
              </View>
              <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
              <Text className="mt-4 text-center text-base font-black text-slate-800">Building your visual lesson</Text>
              <Text className="mt-1 text-center text-[13px] font-medium text-slate-500">{STATUS_MESSAGES[statusIndex]}</Text>
              <View className="mt-5 flex-row gap-2">
                {STATUS_MESSAGES.map((_, index) => (
                  <View key={index} className={`h-1.5 w-6 rounded-full ${index <= statusIndex ? "bg-primary" : "bg-slate-200"}`} />
                ))}
              </View>
            </View>
          ) : (
            <>
              <View className="relative mb-5 pr-16">
                <Text className="text-[27px] font-black leading-[34px] text-slate-900">
                  What Biology concept do you want to understand?
                </Text>
                <Brain size={48} color={ICON_COLORS.primary200} strokeWidth={1.5} style={{ position: "absolute", right: 2, top: 4 }} />
                <Leaf
                  size={30}
                  color={ICON_COLORS.primary100}
                  strokeWidth={1.5}
                  style={{ position: "absolute", right: 38, bottom: -12 }}
                />
              </View>

              <View className="min-h-[178px] rounded-3xl border border-primary bg-white p-4 shadow-sm shadow-primary/10">
                <View className="flex-row items-start gap-2">
                  <Sparkles size={19} color={ICON_COLORS.primary500} strokeWidth={2.1} style={{ marginTop: 2 }} />
                  <TextInput
                    className="min-h-[108px] flex-1 p-0 text-[15px] leading-5 text-slate-800"
                    placeholder="e.g. How does transpiration happen in plants?"
                    placeholderTextColor={ICON_COLORS.slate400}
                    value={question}
                    onChangeText={setQuestion}
                    multiline
                    maxLength={200}
                    textAlignVertical="top"
                    accessibilityLabel="Biology concept question"
                  />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Leaf size={17} color={ICON_COLORS.primary500} strokeWidth={1.9} />
                  </View>
                  <Text className="text-[12px] font-medium text-slate-400">{question.length}/200</Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center gap-2 px-1">
                <Lightbulb size={18} color={ICON_COLORS.primary500} strokeWidth={2} />
                <Text className="text-[12px] text-slate-500">
                  <Text className="font-black text-slate-600">Tip: </Text>Be specific for a better explanation.
                </Text>
              </View>

              {result?.status === "unsupported" && (
                <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <Text className="leading-5 text-slate-700">{result.message}</Text>
                </View>
              )}
              {errorMessage && (
                <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <Text className="leading-5 text-slate-700">{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                className="mt-5 overflow-hidden rounded-2xl"
                activeOpacity={0.85}
                disabled={!canGenerate}
                onPress={() => handleGenerate()}
              >
                <LinearGradient
                  colors={canGenerate ? [ICON_COLORS.primary400, ICON_COLORS.primary600] : ["#E2E8F0", "#E2E8F0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="h-14 flex-row items-center justify-center gap-2"
                >
                  <Sparkles size={20} color={canGenerate ? ICON_COLORS.white : ICON_COLORS.slate400} strokeWidth={2.1} />
                  <Text className={`text-base font-black ${canGenerate ? "text-white" : "text-slate-400"}`}>Generate</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text className="mb-3 mt-8 text-xs font-black uppercase tracking-wider text-slate-500">Try asking about</Text>
              <View className="gap-3">
                {EXAMPLE_TOPICS.map((topic) => {
                  const TopicIcon = topic.icon;
                  return (
                    <Pressable
                      key={topic.question}
                      onPress={() => {
                        setQuestion(topic.question);
                        handleGenerate(topic.question);
                      }}
                      className="min-h-[74px] flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-black/5"
                    >
                      <View className={`h-12 w-12 items-center justify-center rounded-xl ${topic.tint}`}>
                        <TopicIcon size={24} color={topic.color} strokeWidth={1.8} />
                      </View>
                      <Text className="flex-1 text-[15px] font-semibold leading-5 text-slate-800">{topic.question}</Text>
                      <ChevronRight size={21} color={ICON_COLORS.slate800} strokeWidth={2.5} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
