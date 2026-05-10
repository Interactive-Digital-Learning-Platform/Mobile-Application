import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlaskConical, Atom, Leaf, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchExperiments } from "@/services/experimentService";
import { ExperimentType } from "@/types";

const SUBJECTS = ["All", "Physics", "Chemistry", "Biology"] as const;
type Subject = (typeof SUBJECTS)[number];

const SUBJECT_META: Record<string, { color: string; bg: string; Icon: any }> = {
  Physics: { color: "#4F8EF7", bg: "#EEF4FF", Icon: Zap },
  Chemistry: { color: "#E74C3C", bg: "#FFEEEE", Icon: FlaskConical },
  Biology: { color: "#27AE60", bg: "#EEFFF4", Icon: Leaf },
  All: { color: "#FC6E20", bg: "#FFF4EE", Icon: Atom },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#27AE60",
  medium: "#F39C12",
  hard: "#E74C3C",
};

function ExperimentCard({ exp }: { exp: ExperimentType }) {
  const meta = SUBJECT_META[exp.subject];
  const Icon = meta.Icon;
  return (
    <Pressable
      onPress={() => router.push(`/(main)/experiment/${exp._id}`)}
      className="w-full bg-white rounded-2xl p-4 mb-3 flex-row items-center"
      style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
    >
      <View
        className="w-14 h-14 rounded-2xl justify-center items-center mr-4"
        style={{ backgroundColor: meta.bg }}
      >
        <Icon size={26} color={meta.color} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-asemibold text-[#0F172A]" numberOfLines={2}>
          {exp.title}
        </Text>
        <View className="flex-row items-center gap-3 mt-1.5">
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: DIFFICULTY_COLOR[exp.difficulty] + "22" }}
          >
            <Text
              className="text-xs font-amedium capitalize"
              style={{ color: DIFFICULTY_COLOR[exp.difficulty] }}
            >
              {exp.difficulty}
            </Text>
          </View>
          <Text className="text-xs font-aregular text-[#979797]">
            ⏱ {exp.estimatedTime} min
          </Text>
          <Text className="text-xs font-aregular text-[#979797]">
            Gr {exp.grades?.join(", ")}
          </Text>
        </View>
      </View>
      {exp.userAttempts !== undefined && exp.userAttempts > 0 && (
        <View className="items-center">
          <Text className="text-xs font-amedium text-[#FC6E20]">Tried</Text>
          <Text className="text-lg font-asemibold text-[#FC6E20]">{exp.userAttempts}x</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function Lab() {
  const [activeSubject, setActiveSubject] = useState<Subject>("All");

  const { data: experiments = [], isLoading, error } = useQuery({
    queryKey: ["experiments", activeSubject],
    queryFn: () =>
      fetchExperiments(activeSubject !== "All" ? { subject: activeSubject } : undefined),
    retry: 1,
  });

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-2xl font-abold text-[#0F172A]">Virtual Lab</Text>
        <Text className="text-sm font-aregular text-[#979797] mt-0.5">
          Select an experiment to begin
        </Text>
      </View>

      {/* Subject Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {SUBJECTS.map((subj) => {
          const isActive = activeSubject === subj;
          const meta = SUBJECT_META[subj];
          return (
            <Pressable
              key={subj}
              onPress={() => setActiveSubject(subj)}
              className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border"
              style={{
                backgroundColor: isActive ? meta.color : "white",
                borderColor: isActive ? meta.color : "#E3E1E1",
              }}
            >
              <Text
                className="text-sm font-amedium"
                style={{ color: isActive ? "white" : "#6B7280" }}
              >
                {subj}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Visualizations Banner */}
        <Pressable
          onPress={() => router.push("/(main)/visualizations")}
          className="mx-4 mb-6 rounded-3xl overflow-hidden h-36 shadow-sm"
        >
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop" }}
            className="flex-1 justify-center px-6"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.6)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <Text className="text-white text-lg font-abold">Interactive Visualizations</Text>
            <Text className="text-white/80 text-xs font-aregular mt-1 mb-3">
              Master complex concepts with 3D animations
            </Text>
            <View className="bg-white px-4 py-2 rounded-full self-start">
              <Text className="text-[#FC6E20] text-xs font-abold">Explore Now</Text>
            </View>
          </ImageBackground>
        </Pressable>

        <View className="px-4 mb-3">
          <Text className="text-[#0F172A] text-lg font-abold">Experiments</Text>
        </View>

        {/* Experiment List */}
        <View className="px-4">
          {isLoading && (
            <View className="items-center justify-center pt-10">
              <ActivityIndicator size="large" color="#FC6E20" />
            </View>
          )}

          {!isLoading && error && (
            <View className="items-center justify-center pt-10">
              <Text className="font-asemibold text-[#0F172A]">Could not load experiments</Text>
            </View>
          )}

          {!isLoading && experiments.map((exp: ExperimentType) => (
            <ExperimentCard key={exp._id} exp={exp} />
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
