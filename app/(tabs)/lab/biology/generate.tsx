import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useGenerateBiologyVisualization } from "@/hooks/lab/use-biology-visualizations";
import { GenerateVisualizationResponseType } from "@/types/lab";
import Button from "@/components/ui/Button";
import VisualizationPlayer from "@/components/lab/biology/VisualizationPlayer";

// Cycled on a fixed timer while the single generate request is in flight — there's no
// server-sent progress channel for this (the streaming infra in api/chatAPI.ts is a separate,
// heavier mechanism for token-by-token chat replies, not justified for one screen here), so this
// is an honest, cheap approximation of "what's happening" rather than a bare spinner.
const STATUS_MESSAGES = [
  "Understanding your question...",
  "Checking the Grade 10/11 curriculum...",
  "Planning the explanation...",
  "Creating animation scenes...",
  "Preparing your visualization...",
];

const EXAMPLE_TOPICS = ["How does transpiration happen in plants?", "How does digestion happen in the small intestine?", "Explain the menstrual cycle."];

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
        setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
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

  // A visualization was generated — mount the player full-screen, same treatment as the
  // predefined detail screen. _id/animationKey/grades are synthesized since a generated
  // visualization is never persisted or tied to a predefined canvas.
  if (result?.status !== "unsupported" && result?.visualization) {
    const visualization = { ...result.visualization, _id: "generated", animationKey: "generated", grades: [10, 11] };
    return (
      <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3 mb-4">
            <Pressable onPress={() => setResult(null)} hitSlop={8}>
              <ArrowLeft size={22} color={colors.primaryBlack} />
            </Pressable>
            <Text className="text-lg font-amedium text-ink flex-1" numberOfLines={1}>
              {visualization.title}
            </Text>
          </View>
          <VisualizationPlayer visualization={visualization} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft size={22} color={colors.primaryBlack} />
            </Pressable>
            <Text className="text-lg font-amedium text-ink">Understand a Concept</Text>
          </View>

          {mutation.isPending ? (
            <View className="flex-1 items-center justify-center gap-4 py-16">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="font-amedium text-ink text-center">{STATUS_MESSAGES[statusIndex]}</Text>
            </View>
          ) : (
            <>
              <Text className="text-xl font-amedium text-ink mb-2">What Biology concept do you want to understand?</Text>
              <TextInput
                className="border border-border rounded-2xl px-4 py-3 font-aregular text-ink"
                style={{ minHeight: 90 }}
                placeholder="e.g. How does transpiration happen in plants?"
                placeholderTextColor={colors.muted}
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
              />

              {result?.status === "unsupported" && (
                <View className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <Text className="font-aregular text-ink">{result.message}</Text>
                </View>
              )}
              {errorMessage && (
                <View className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <Text className="font-aregular text-ink">{errorMessage}</Text>
                </View>
              )}

              <View className="mt-4">
                <Button label="Generate" icon={Sparkles} onPress={() => handleGenerate()} disabled={!question.trim()} />
              </View>

              <Text className="font-amedium text-muted text-sm mt-8 mb-2">Try asking about:</Text>
              <View className="gap-2">
                {EXAMPLE_TOPICS.map((topic) => (
                  <Pressable
                    key={topic}
                    onPress={() => {
                      setQuestion(topic);
                      handleGenerate(topic);
                    }}
                    className="border border-border rounded-xl px-4 py-3"
                  >
                    <Text className="font-aregular text-ink">{topic}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
