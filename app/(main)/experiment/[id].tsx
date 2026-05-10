import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator, Pressable, ScrollView, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Clock, Target, FlaskConical, CheckCircle } from "lucide-react-native";
import { fetchExperimentById } from "@/services/experimentService";
import { ExperimentType } from "@/types";
import { LinearGradient } from "expo-linear-gradient";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#27AE60", medium: "#F39C12", hard: "#E74C3C",
};
const SUBJECT_COLOR: Record<string, string> = {
  Physics: "#4F8EF7", Chemistry: "#E74C3C", Biology: "#27AE60",
};

export default function ExperimentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: experiment, isLoading } = useQuery<ExperimentType>({
    queryKey: ["experiment", id],
    queryFn: () => fetchExperimentById(id!),
    enabled: !!id,
  });

  if (isLoading || !experiment) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC6E20" />
      </SafeAreaView>
    );
  }

  const subjectColor = SUBJECT_COLOR[experiment.subject] || "#4F8EF7";

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      {/* Header Banner */}
      <LinearGradient
        colors={[subjectColor, subjectColor + "CC"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
      >
        <Pressable onPress={() => router.back()} className="flex-row items-center mb-4">
          <ChevronLeft size={22} color="white" />
          <Text className="text-white font-amedium text-sm ml-1">Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-2 mb-2">
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-amedium">{experiment.subject}</Text>
          </View>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: DIFFICULTY_COLOR[experiment.difficulty] + "33" }}
          >
            <Text className="text-white text-xs font-amedium capitalize">{experiment.difficulty}</Text>
          </View>
        </View>
        <Text className="text-white text-2xl font-abold">{experiment.title}</Text>
        <View className="flex-row gap-4 mt-3">
          <View className="flex-row items-center gap-1">
            <Clock size={14} color="white" />
            <Text className="text-white/80 text-sm font-aregular">{experiment.estimatedTime} min</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Target size={14} color="white" />
            <Text className="text-white/80 text-sm font-aregular">{experiment.steps?.length} steps</Text>
          </View>
          {(experiment.userAttempts ?? 0) > 0 && (
            <View className="flex-row items-center gap-1">
              <CheckCircle size={14} color="white" />
              <Text className="text-white/80 text-sm font-aregular">
                {experiment.userAttempts} attempt{experiment.userAttempts! > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 -mt-4" showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View className="bg-white rounded-2xl p-4 mb-3 mt-2">
          <Text className="text-[#0F172A] font-amedium text-base mb-1">About</Text>
          <Text className="text-[#6B7280] font-aregular text-sm leading-5">
            {experiment.description}
          </Text>
        </View>

        {/* Objectives */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="text-[#0F172A] font-amedium text-base mb-2">🎯 Objectives</Text>
          {experiment.objectives?.map((obj, i) => (
            <View key={i} className="flex-row gap-2 mb-1.5">
              <Text style={{ color: subjectColor }} className="font-abold">•</Text>
              <Text className="text-[#374151] font-aregular text-sm flex-1">{obj}</Text>
            </View>
          ))}
        </View>

        {/* Materials */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="text-[#0F172A] font-amedium text-base mb-2">🧪 Materials</Text>
          <View className="flex-row flex-wrap gap-2">
            {experiment.materials?.map((mat, i) => (
              <View key={i} className="bg-[#f0f5fb] px-3 py-1.5 rounded-full">
                <Text className="text-[#374151] font-aregular text-xs">{mat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Steps Preview */}
        <View className="bg-white rounded-2xl p-4 mb-6">
          <Text className="text-[#0F172A] font-amedium text-base mb-3">📋 Steps Overview</Text>
          {experiment.steps?.map((step, i) => (
            <View key={step.stepId} className="flex-row gap-3 mb-2.5">
              <View
                className="w-7 h-7 rounded-full justify-center items-center flex-shrink-0"
                style={{ backgroundColor: subjectColor + "22" }}
              >
                <Text className="text-xs font-abold" style={{ color: subjectColor }}>
                  {i + 1}
                </Text>
              </View>
              <Text className="text-[#374151] font-aregular text-sm flex-1 mt-0.5">
                {step.title}
              </Text>
            </View>
          ))}
        </View>

        <View className="h-32" />
      </ScrollView>

      {/* Start Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-4 pt-3 pb-8 border-t border-[#E3E1E1]">
        <Pressable
          onPress={() => router.push(`/(main)/experiment/run/${experiment._id}`)}
          className="w-full h-14 rounded-2xl justify-center items-center"
          style={{ backgroundColor: subjectColor }}
        >
          <Text className="text-white text-lg font-asemibold">
            {(experiment.userAttempts ?? 0) > 0 ? "Try Again" : "Start Experiment"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
