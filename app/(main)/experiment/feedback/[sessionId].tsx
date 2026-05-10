import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator, Pressable, ScrollView, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle, AlertTriangle, Lightbulb, ArrowRight, RotateCcw, Star,
} from "lucide-react-native";
import { fetchSessionFeedback } from "@/services/sessionService";
import { SessionType } from "@/types";
import { LinearGradient } from "expo-linear-gradient";

const SUBJECT_COLOR: Record<string, string> = {
  Physics: "#4F8EF7", Chemistry: "#E74C3C", Biology: "#27AE60",
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#27AE60" : score >= 50 ? "#F39C12" : "#E74C3C";
  const label = score >= 80 ? "Excellent!" : score >= 50 ? "Good Job!" : "Keep Practicing!";
  return (
    <View className="items-center">
      <View
        className="w-28 h-28 rounded-full justify-center items-center border-8"
        style={{ borderColor: color }}
      >
        <Text className="text-3xl font-abold" style={{ color }}>{score}</Text>
        <Text className="text-xs font-aregular text-[#979797]">/ 100</Text>
      </View>
      <Text className="font-asemibold text-base mt-2" style={{ color }}>{label}</Text>
    </View>
  );
}

export default function ExperimentFeedback() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const { data: session, isLoading } = useQuery<SessionType>({
    queryKey: ["feedback", sessionId],
    queryFn: () => fetchSessionFeedback(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading || !session) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC6E20" />
        <Text className="font-amedium text-[#979797] mt-3">Loading your results...</Text>
      </SafeAreaView>
    );
  }

  const subjectColor = SUBJECT_COLOR[session.experimentId?.subject] ?? "#4F8EF7";
  const fb = session.aiFeedback;
  const mins = Math.floor(session.totalTime / 60);
  const secs = session.totalTime % 60;

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      {/* Gradient Header */}
      <LinearGradient
        colors={[subjectColor, subjectColor + "BB"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      >
        <Text className="text-white/70 font-aregular text-sm mb-1">Experiment Complete</Text>
        <Text className="text-white text-xl font-abold mb-1">
          {session.experimentId?.title}
        </Text>
        <Text className="text-white/60 font-aregular text-xs">
          Attempt #{session.attemptNumber}  ·  {mins}m {secs}s
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 -mt-6" showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View className="bg-white rounded-3xl p-6 mb-4 items-center shadow-sm">
          <ScoreRing score={session.score} />
          <View className="flex-row gap-6 mt-5">
            <View className="items-center">
              <Text className="text-xl font-abold text-[#E74C3C]">
                {session.behaviorFeatures?.totalErrors ?? 0}
              </Text>
              <Text className="text-xs font-aregular text-[#979797]">Errors</Text>
            </View>
            <View className="w-px bg-[#E3E1E1]" />
            <View className="items-center">
              <Text className="text-xl font-abold text-[#F39C12]">
                {session.behaviorFeatures?.totalHintsRequested ?? 0}
              </Text>
              <Text className="text-xs font-aregular text-[#979797]">Hints Used</Text>
            </View>
            <View className="w-px bg-[#E3E1E1]" />
            <View className="items-center">
              <Text className="text-xl font-abold text-[#27AE60]">
                {session.behaviorFeatures?.totalRetries ?? 0}
              </Text>
              <Text className="text-xs font-aregular text-[#979797]">Retries</Text>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {fb?.summary && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Star size={16} color="#FC6E20" fill="#FC6E20" />
              <Text className="font-asemibold text-[#0F172A]">AI Feedback</Text>
            </View>
            <Text className="font-aregular text-[#374151] text-sm leading-5">{fb.summary}</Text>
          </View>
        )}

        {/* Strengths */}
        {fb?.strengths && fb.strengths.length > 0 && (
          <View className="bg-[#EEFFF4] border border-[#27AE60]/30 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle size={16} color="#27AE60" />
              <Text className="font-asemibold text-[#27AE60]">Strengths</Text>
            </View>
            {fb.strengths.map((s: string, i: number) => (
              <Text key={i} className="text-sm font-aregular text-[#374151] mb-1">
                ✅ {s}
              </Text>
            ))}
          </View>
        )}

        {/* Misconceptions */}
        {fb?.misconceptionsDetected && fb.misconceptionsDetected.length > 0 && (
          <View className="bg-[#FFF8E7] border border-[#F39C12]/40 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle size={16} color="#F39C12" />
              <Text className="font-asemibold text-[#F39C12]">
                Misconceptions Detected ({fb.misconceptionsDetected.length})
              </Text>
            </View>
            {fb.misconceptionsDetected.map((m: any, i: number) => (
              <View key={i} className="mb-4">
                <Text className="font-amedium text-[#0F172A] text-sm mb-1">
                  {m.code}{m.relatedStep ? ` · Step ${m.relatedStep}` : ""}
                </Text>
                <Text className="font-aregular text-[#374151] text-sm mb-1">{m.description}</Text>
                <View className="flex-row items-start gap-2 bg-white/60 rounded-xl p-2 mt-1">
                  <Lightbulb size={13} color="#F39C12" className="mt-0.5" />
                  <Text className="text-xs font-aregular text-[#6B7280] flex-1">{m.correctionStrategy}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions */}
        {fb?.suggestions && fb.suggestions.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-asemibold text-[#0F172A] mb-2">💡 Suggestions</Text>
            {fb.suggestions.map((s: string, i: number) => (
              <Text key={i} className="text-sm font-aregular text-[#374151] mb-1.5">• {s}</Text>
            ))}
          </View>
        )}

        <View className="h-36" />
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 px-4 pt-3 pb-8 border-t border-[#E3E1E1] flex-row gap-3">
        <Pressable
          onPress={() => router.push(`/(main)/experiment/run/${session.experimentId?._id}`)}
          className="flex-1 h-14 rounded-2xl justify-center items-center flex-row gap-2 border-2"
          style={{ borderColor: subjectColor }}
        >
          <RotateCcw size={18} color={subjectColor} />
          <Text className="font-asemibold" style={{ color: subjectColor }}>Try Again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/lab")}
          className="flex-1 h-14 rounded-2xl justify-center items-center flex-row gap-2"
          style={{ backgroundColor: subjectColor }}
        >
          <Text className="text-white font-asemibold">More Experiments</Text>
          <ArrowRight size={18} color="white" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
