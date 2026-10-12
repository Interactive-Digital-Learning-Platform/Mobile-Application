import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  AlertCircle,
  Target,
  LogOut,
  BarChart3,
  ChevronRight,
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useUser, useClerk } from "@clerk/expo";
import {
  useUserMeQuery,
  useAnalyticsMeQuery,
  quizKeys,
} from "@/hooks/use-quiz";
import { useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import { filterTestSubjects } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import OverviewBento from "@/components/profile/OverviewBento";
import SubjectsSection from "@/components/profile/SubjectsSection";
import PractiseNextSection from "@/components/profile/PractiseNextSection";
import CoachCard from "@/components/profile/CoachCard";
import WeeklyChips from "@/components/profile/WeeklyChips";


const AVATAR_SIZE = 44;
// Light grey page so the white bento / section cards read as separate surfaces.
const PAGE_BG = "#F5F6F8";

// Mirrors the page's own layout (bento -> weekly chips -> Subjects -> Practise next) so nothing jumps on load.
function StatsSkeleton() {
  return (
    <View className="px-4 pt-1 gap-3">
      {[0, 1].map((row) => (
        <View key={row} className="flex-row gap-3">
          <Skeleton width="100%" height={178} borderRadius={24} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
          <Skeleton width="100%" height={178} borderRadius={24} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
        </View>
      ))}
      <Skeleton width={190} height={16} style={{ marginTop: 8 }} />
      <View className="flex-row gap-3">
        <Skeleton width={150} height={112} borderRadius={22} color={ICON_COLORS.primary50} />
        <Skeleton width={150} height={112} borderRadius={22} color={ICON_COLORS.primary50} />
        <Skeleton width={150} height={112} borderRadius={22} color={ICON_COLORS.primary50} />
      </View>
      <View className="bg-white rounded-[24px] p-4 gap-4">
        <Skeleton width={120} height={14} />
        {[0, 1, 2].map((i) => (
          <View key={i} className="gap-1.5">
            <View className="flex-row justify-between">
              <Skeleton width={100} height={12} />
              <Skeleton width={48} height={16} borderRadius={999} />
            </View>
            <Skeleton width="100%" height={10} borderRadius={5} />
            <Skeleton width={150} height={10} />
          </View>
        ))}
      </View>
      <View className="bg-white rounded-[24px] p-4 gap-2.5">
        <Skeleton width={130} height={14} />
        <Skeleton width="100%" height={58} borderRadius={16} color={ICON_COLORS.primary50} />
        <Skeleton width="100%" height={58} borderRadius={16} color={ICON_COLORS.primary50} />
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="bg-rose-100 w-14 h-14 rounded-full items-center justify-center mb-4">
        <AlertCircle size={24} color={ICON_COLORS.rose500} strokeWidth={2} />
      </View>
      <Text className="text-slate-800 font-black text-base text-center mb-1">
        Could not load analytics
      </Text>
      <Text className="text-slate-400 text-[13px] text-center mb-5">{message}</Text>
      <TouchableOpacity
        className="bg-primary-500 px-6 py-3 rounded-2xl"
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text className="text-white font-black text-[13px]">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: user } = useUserMeQuery();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useAnalyticsMeQuery();

  // Light page: dark status-bar text while this tab is focused, then hand back the previous style.
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
      queryClient.invalidateQueries({ queryKey: quizKeys.aiFeedback }),
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsDailyAll }),
    ]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              queryClient.clear();
              router.replace("/");
            } catch {
              setSigningOut(false);
              Alert.alert("Couldn't log out", "Please check your connection and try again.");
            }
          },
        },
      ],
    );
  };

  const visibleSubjects = analytics ? filterTestSubjects(analytics.subjects) : [];

  const displayName = clerkUser?.username ?? user?.username ?? "...";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1" style={{ backgroundColor: PAGE_BG }}>
      {/* Compact header: avatar, name + join date, and the single log-out control. */}
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <View
          className="rounded-full bg-primary-100 items-center justify-center mr-3"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          <User size={22} color={ICON_COLORS.primary600} strokeWidth={1.8} />
        </View>
        <View className="flex-1 mr-3">
          <Text className="text-slate-800 text-lg font-black" numberOfLines={1}>{displayName}</Text>
          {joinDate && <Text className="text-slate-400 text-xs">Member since {joinDate}</Text>}
        </View>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm shadow-black/5"
          activeOpacity={0.8}
          disabled={signingOut}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          hitSlop={6}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={ICON_COLORS.rose500} />
          ) : (
            <LogOut size={18} color={ICON_COLORS.rose500} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ICON_COLORS.primary500} />}>

        <View className="pt-1">

        <View >
          {analyticsLoading ? (
            <StatsSkeleton />
          ) : analyticsError ? (
            <ErrorState
              message={(analyticsError as Error)?.message ?? "Something went wrong."}
              onRetry={refetchAnalytics}
            />
          ) : analytics ? (
              <Animated.View entering={FadeIn.duration(300)} className="px-4">
                      
              

              <View className="mb-3">
                <OverviewBento
                  accuracy={analytics.overall_accuracy}
                  trend={analytics.performance_trend}
                  history={analytics.accuracy_history}
                />
              </View>

              <Text className="text-slate-800 font-black text-base mt-2 mb-2.5 px-1">Compared with last week</Text>
              <View className="mb-4">
                <WeeklyChips />
              </View>

              <SubjectsSection subjects={visibleSubjects} />

              <PractiseNextSection subjects={visibleSubjects} />

              <CoachCard subjects={visibleSubjects} recommendations={analytics.recommendations} />

              <TouchableOpacity
                className="flex-row items-center bg-white rounded-[24px] px-4 py-4 shadow-sm shadow-black/5 mb-3"
                activeOpacity={0.85}
                onPress={() => router.push("/(main)/profile/details" as any)}
                accessibilityRole="button"
              >
                <View className="w-9 h-9 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <BarChart3 size={16} color={ICON_COLORS.primary600} strokeWidth={2.25} />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-bold text-[14px]">See detailed analytics</Text>
                  <Text className="text-slate-400 text-[12px] mt-0.5">Daily scores, topics, skills and growth</Text>
                </View>
                <ChevronRight size={18} color={ICON_COLORS.slate400} strokeWidth={2.5} />
              </TouchableOpacity>


              {analytics.total_sessions === 0 && (
                <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 items-center py-9">
                  <Target size={32} color={ICON_COLORS.primary500} strokeWidth={1.8} />
                  <Text className="text-slate-800 font-black text-[15px] mt-3 mb-1">
                    No quiz data yet
                  </Text>
                  <Text className="text-slate-400 text-[13px] text-center">
                    Complete a quiz to see your analytics here.
                  </Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          <View className="h-6" />

        </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
