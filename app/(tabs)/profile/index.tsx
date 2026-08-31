import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  User,
  Trophy,
  Clock,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  Target,
  Heart,
  LogOut,
  CalendarDays,
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useUser, useClerk } from "@clerk/expo";
import {
  useUserMeQuery,
  useAnalyticsMeQuery,
  useAnalyticsFeedbackQuery,
  quizKeys,
} from "@/hooks/use-quiz";
import { useQueryClient } from "@tanstack/react-query";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import Skeleton from "@/components/Skeleton";
import { filterTestSubjects, filterTestSubjectNames } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import StatTile from "@/components/profile/StatTile";
import SectionHeader from "@/components/profile/SectionHeader";
import PerformanceSummarySection from "@/components/profile/PerformanceSummarySection";
import ProgressTrendSection from "@/components/profile/ProgressTrendSection";
import TopicPerformanceSection from "@/components/profile/TopicPerformanceSection";
import SkillMasterySection from "@/components/profile/SkillMasterySection";
import GrowthSection from "@/components/profile/GrowthSection";
import RecommendationsSection from "@/components/profile/RecommendationsSection";
import DifficultyProgressSection from "@/components/profile/DifficultyProgressSection";

const CARD_CLASS = "bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3";

// Twitter-style profile header: a banner strip with the avatar overlapping
// its bottom-left corner, half sunk into the banner and half into the white
// content below -- AVATAR_SIZE / 2 of it sits below BANNER_HEIGHT.
const BANNER_HEIGHT = 60;
const AVATAR_SIZE = 88;

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const SIZE = 114;
  const SW = 11;
  const R = (SIZE - SW) / 2;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(Math.max(accuracy, 0), 100);
  const filled = (pct / 100) * CIRC;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <View className="items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
        <Circle
          cx={cx} cy={cy} r={R}
          stroke={ICON_COLORS.primary100} strokeWidth={SW} fill="transparent"
        />
        <Circle
          cx={cx} cy={cy} r={R}
          stroke={ICON_COLORS.primary500} strokeWidth={SW} fill="transparent"
          strokeDasharray={`${filled} ${CIRC - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>
      <View className="items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <Text className="text-primary-700 text-[22px] font-black leading-[26px]">
          {Math.round(pct)}%
        </Text>
        <Text className="text-primary-400 text-[8px] font-bold uppercase tracking-widest">
          Accuracy
        </Text>
      </View>
    </View>
  );
}

function SubjectBarChart({
  subjects,
}: {
  subjects: { subject: string; accuracy: number; current_difficulty: string }[];
}) {
  if (!subjects.length) return null;

  return (
    <View className={CARD_CLASS}>
      <SectionHeader icon={BarChart2} label="Subject Accuracy & Difficulty" />

      <View className="gap-3">
        {subjects.map((s) => {
          const pct = Math.min(Math.max(s.accuracy, 0), 100);
          const isStrong = pct >= 70;

          return (
            <View key={s.subject} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text
                  className="flex-1 text-[11px] font-semibold text-slate-500"
                  numberOfLines={1}
                >
                  {s.subject}
                </Text>
                <DifficultyBadge difficulty={s.current_difficulty} size="xs" showDot={false} />
              </View>
              <View className="flex-row items-center gap-2">
                <View className="flex-1 h-3.5 bg-primary-50 rounded-[7px] overflow-hidden">
                  <View
                    className={`h-full rounded-[7px] ${isStrong ? "bg-primary-500" : "bg-primary-300"}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
                <Text
                  className={`w-9 text-[11px] font-extrabold text-right ${isStrong ? "text-primary-600" : "text-primary-400"}`}
                >
                  {Math.round(pct)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatsSkeleton() {
  return (
    <View className="px-4 mt-4 gap-3">
      <View className="flex-row gap-2.5">
        <Skeleton width="100%" height={140} borderRadius={18} color={ICON_COLORS.primary50} style={{ flex: 1.2 }} />
        <View className="flex-1 gap-2.5">
          <Skeleton width="100%" height="100%" borderRadius={18} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
          <Skeleton width="100%" height="100%" borderRadius={18} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
        </View>
      </View>
      <View className="bg-white rounded-[18px] p-3.5 gap-3">
        <Skeleton width={140} height={14} />
        {[0, 1, 2].map((i) => (
          <View key={i} className="gap-1">
            <View className="flex-row justify-between">
              <Skeleton width={90} height={11} />
              <Skeleton width={40} height={16} borderRadius={999} />
            </View>
            <Skeleton width="100%" height={14} borderRadius={7} />
          </View>
        ))}
      </View>
      <Skeleton width="100%" height={72} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={160} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={130} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={180} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={160} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={180} borderRadius={18} color={ICON_COLORS.primary50} />
      <Skeleton width="100%" height={130} borderRadius={18} color={ICON_COLORS.primary50} />
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

function FeedbackSkeleton() {
  return (
    <View className="gap-2.5">
      <View className="bg-primary-100 rounded-[18px] p-4 gap-2.5">
        <Skeleton width={90} height={11} color={ICON_COLORS.primary200} />
        <Skeleton width="100%" height={13} color={ICON_COLORS.primary200} />
        <Skeleton width="70%" height={13} color={ICON_COLORS.primary200} />
      </View>
      <View className={CARD_CLASS.replace("mb-3", "")}>
        <Skeleton width={100} height={12} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={38} borderRadius={12} color={ICON_COLORS.primary50} style={{ marginTop: 10 }} />
        ))}
      </View>
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
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
  const {
    data: feedback,
    isLoading: feedbackLoading,
    error: feedbackError,
    refetch: refetchFeedback,
  } = useAnalyticsFeedbackQuery(true);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: quizKeys.analyticsMe }),
      queryClient.invalidateQueries({ queryKey: quizKeys.aiFeedback }),
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
              // Clears every other user's cached queries out of memory so a
              // different account signing in on this device never briefly
              // sees stale data belonging to whoever was logged in before.
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
  const visibleStrongSubjects = analytics ? filterTestSubjectNames(analytics.strong_subjects) : [];
  const visibleWeakSubjects = analytics ? filterTestSubjectNames(analytics.weak_subjects) : [];

  const displayName = clerkUser?.username ?? user?.username ?? "...";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  // The gradient is drawn from the true top of the screen (y=0, behind the
  // notch/status bar) down through BANNER_HEIGHT of "real" banner below it,
  // so the primary color fills the notch area instead of leaving it white --
  // position: absolute ignores ancestor padding in RN, so this can't rely on
  // a SafeAreaView's own inset padding to reach up there; insets.top is
  // added into the gradient's height explicitly instead. The avatar and the
  // ScrollView content's top margin are then both anchored to where the
  // banner actually visually ends (bannerVisualHeight), not to BANNER_HEIGHT
  // alone, so they land in the right place regardless of device notch size.
  const bannerVisualHeight = insets.top + BANNER_HEIGHT;

  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-white">
      <View className="absolute top-0 left-0 right-0 z-20">
        <LinearGradient
          colors={[ICON_COLORS.primary400, ICON_COLORS.primary600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: bannerVisualHeight }}
        />
        {/* A translucent fill (like the Quiz tab's avatar) only reads well
            against one solid background -- this avatar straddles the
            colored banner AND the white content below it, so it needs an
            opaque fill + a solid white ring instead, or the half sitting on
            white content would be nearly invisible. */}
        <View
          className="absolute left-5 rounded-full bg-primary-100 border-[4px] border-white items-center justify-center shadow-md shadow-black/10"
          style={{ top: bannerVisualHeight - AVATAR_SIZE / 2, width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          <User size={36} color={ICON_COLORS.primary500} strokeWidth={1.8} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ICON_COLORS.primary500} />} className="bg-white">

        <View style={{ marginTop: bannerVisualHeight + AVATAR_SIZE / 2 + 12 }} className="bg-white">

          <View className="px-5 mb-4">
            <Text className="text-slate-800 text-xl font-black">{displayName}</Text>
            {joinDate && (
              <View className="flex-row items-center gap-1.5 mt-1">
                <CalendarDays size={13} color={ICON_COLORS.slate400} strokeWidth={2} />
                <Text className="text-slate-400 text-[13px] font-medium">Joined {joinDate}</Text>
              </View>
            )}
          </View>

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
                      
              

              <View className="flex-row gap-2.5 mb-3">
                <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 items-center justify-center py-4.5" style={{ flex: 1.15 }}>
                  <AccuracyRing accuracy={analytics.overall_accuracy} />
                </View>
                <View className="flex-1 gap-2.5">
                  <StatTile
                    icon={Trophy}
                    iconColor={ICON_COLORS.primary500}
                    iconBgClass="bg-primary-100"
                    label="Sessions"
                    value={analytics.total_sessions}
                  />
                  <StatTile
                    icon={Clock}
                    iconColor={ICON_COLORS.primary600}
                    iconBgClass="bg-primary-100"
                    label="Avg / Q"
                    value={`${analytics.overall_avg_response_time.toFixed(1)}s`}
                  />
                </View>
              </View>

              {visibleSubjects.length > 0 && (
                <SubjectBarChart subjects={visibleSubjects} />
              )}

              {(visibleStrongSubjects.length > 0 || visibleWeakSubjects.length > 0) && (
                <View className={CARD_CLASS}>
                  {visibleStrongSubjects.length > 0 && (
                    <View className={visibleWeakSubjects.length > 0 ? "mb-3" : ""}>
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <TrendingUp size={14} color={ICON_COLORS.primary500} strokeWidth={2} />
                        <Text className="text-primary-600 font-black text-xs uppercase tracking-wider">Strong</Text>
                      </View>
                      <View className="flex-row flex-wrap gap-1.5">
                        {visibleStrongSubjects.map((s) => (
                          <View key={s} className="bg-primary-100 px-3 py-1.5 rounded-full">
                            <Text className="text-primary-700 text-[11px] font-semibold">{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {visibleWeakSubjects.length > 0 && (
                    <View>
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <TrendingDown size={14} color={ICON_COLORS.rose500} strokeWidth={2} />
                        <Text className="text-rose-600 font-black text-xs uppercase tracking-wider">Needs Work</Text>
                      </View>
                      <View className="flex-row flex-wrap gap-1.5">
                        {visibleWeakSubjects.map((s) => (
                          <View key={s} className="bg-rose-100 px-3 py-1.5 rounded-full">
                            <Text className="text-rose-600 text-[11px] font-semibold">{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              <PerformanceSummarySection
                totalQuestionsAttempted={analytics.total_questions_attempted}
                totalCorrectAnswers={analytics.total_correct_answers}
                completionRate={analytics.completion_rate}
                avgResponseTime={analytics.overall_avg_response_time}
              />

              <ProgressTrendSection trend={analytics.performance_trend} />

              <TopicPerformanceSection subjects={visibleSubjects} />

              <SkillMasterySection subjects={visibleSubjects} />

              <GrowthSection growth={analytics.growth} />

              <RecommendationsSection recommendations={analytics.recommendations} />

              <DifficultyProgressSection subjects={visibleSubjects} />

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

          <View className="px-4 mt-1">
            <View className="flex-row items-center justify-between mb-2.5 pl-0.5">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={16} color={ICON_COLORS.primary500} strokeWidth={2} />
                <Text className="text-slate-800 font-black text-xs uppercase tracking-wider">AI Feedback</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-100"
                activeOpacity={0.8}
                onPress={() => refetchFeedback()}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? (
                  <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
                ) : (
                  <RefreshCw size={11} color={ICON_COLORS.primary600} strokeWidth={2.5} />
                )}
                <Text className="text-primary-700 text-[11px] font-bold">Refresh</Text>
              </TouchableOpacity>
            </View>

            {feedbackLoading ? (
              <FeedbackSkeleton />
            ) : feedbackError ? (
              <View className={`${CARD_CLASS} border-rose-100`}>
                <Text className="text-rose-500 text-[13px] font-medium text-center">
                  Could not load feedback. Pull to refresh or tap Refresh.
                </Text>
              </View>
            ) : feedback ? (
              <Animated.View entering={FadeIn.duration(300)} className="gap-2.5">
                <View className="bg-primary-500 rounded-[18px] p-4 overflow-hidden">
                  <View className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-primary-600 opacity-40" />
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Heart size={13} color={ICON_COLORS.white} strokeWidth={2} />
                    <Text className="text-white/85 font-black text-[10px] uppercase tracking-widest">
                      Motivation
                    </Text>
                  </View>
                  <Text className="text-white text-[13px] leading-5 font-medium">
                    {feedback.motivational_note}
                  </Text>
                  {feedback.generated_at && (
                    <Text className="text-white/70 text-[11px] mt-2 font-medium">
                      Generated {new Date(feedback.generated_at).toLocaleTimeString([], {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>

                {feedback.suggestions.length > 0 && (
                  <View className={`${CARD_CLASS.replace("mb-3", "mb-5")} border-amber-100`}>
                    <View className="flex-row items-center gap-1.5 mb-2.5">
                      <Lightbulb size={14} color={ICON_COLORS.amber500} strokeWidth={2} />
                      <Text className="text-amber-600 font-black text-xs uppercase tracking-wider">Suggestions</Text>
                    </View>
                    <View className="gap-2">
                      {feedback.suggestions.map((tip, i) => (
                        <View key={i} className="flex-row items-start gap-2.5 bg-primary-50 rounded-xl px-3 py-2.5">
                          <Text className="text-primary-500 font-black text-[11px] mt-0.5">{i + 1}</Text>
                          <Text className="text-slate-600 text-[13px] leading-5 flex-1">{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Animated.View>
            ) : null}
          </View>

          <View className="px-4 mt-1 mb-6">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 bg-white border border-rose-100 rounded-2xl py-3.5"
              activeOpacity={0.8}
              disabled={signingOut}
              onPress={handleLogout}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={ICON_COLORS.rose500} />
              ) : (
                <LogOut size={16} color={ICON_COLORS.rose500} strokeWidth={2.2} />
              )}
              <Text className="text-rose-500 font-black text-[13px]">
                {signingOut ? "Logging out…" : "Log Out"}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
