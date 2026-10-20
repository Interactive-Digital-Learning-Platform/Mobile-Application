import { useCallback, useRef, useState } from "react";
import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from "react-native";
import { Text } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalyticsMeQuery, quizKeys } from "@/hooks/use-quiz";
import { filterTestSubjects } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import DailyActivitySection from "@/components/profile/DailyActivitySection";
import ProgressTrendSection from "@/components/profile/ProgressTrendSection";
import TopicPerformanceSection from "@/components/profile/TopicPerformanceSection";
import SkillMasterySection from "@/components/profile/SkillMasterySection";
import DifficultyProgressSection from "@/components/profile/DifficultyProgressSection";
import GrowthSection from "@/components/profile/GrowthSection";
import BattleDetailsSection from "@/components/profile/BattleDetailsSection";
import { battleKeys } from "@/hooks/use-battle";

const PAGE_BG = "#F5F6F8"; // same light page as the Profile tab

// Detailed analytics: the in-depth sections moved off the student-facing Profile tab (daily score breakdown, the
// full trend chart, per-topic status, BKT skill mastery, adaptive-difficulty mastery details and growth). Same data
// and components as before -- just one tap deeper.
export default function DetailedAnalyticsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: analytics, isLoading, refetch } = useAnalyticsMeQuery();
  // Opened from the Profile "Battles" card: jump straight to the battle section once it has laid out.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToSection = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle: "dark-content" });
      return () => StatusBar.popStackEntry(entry);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe }),
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsDailyAll }),
      queryClient.invalidateQueries({ queryKey: battleKeys.analytics }),
    ]);
    setRefreshing(false);
  };

  const subjects = analytics ? filterTestSubjects(analytics.subjects) : [];

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1" style={{ backgroundColor: PAGE_BG }}>
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm shadow-black/5"
          activeOpacity={0.8}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={6}
        >
          <ChevronLeft size={20} color={ICON_COLORS.slate600} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-slate-800 font-black text-lg mr-10">Detailed analytics</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
        </View>
      ) : !analytics ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-sm text-center mb-4">Couldn&apos;t load your analytics.</Text>
          <TouchableOpacity onPress={() => refetch()} className="px-5 py-2.5 rounded-full bg-primary-100">
            <Text className="text-primary-700 text-sm font-bold">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ICON_COLORS.primary500} />}
        >
          <DailyActivitySection />
          <ProgressTrendSection trend={analytics.performance_trend} history={analytics.accuracy_history} />
          <TopicPerformanceSection subjects={subjects} />
          <SkillMasterySection subjects={subjects} />
          <DifficultyProgressSection subjects={subjects} />
          <GrowthSection growth={analytics.growth} />
          <View
            onLayout={(e) => {
              // Wait for the section to actually render (its data loads separately) before scrolling to it.
              if (section !== "battles" || scrolledToSection.current || e.nativeEvent.layout.height === 0) return;
              scrolledToSection.current = true;
              scrollRef.current?.scrollTo({ y: e.nativeEvent.layout.y - 8, animated: true });
            }}
          >
            <BattleDetailsSection practiceAccuracy={analytics.overall_accuracy} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
