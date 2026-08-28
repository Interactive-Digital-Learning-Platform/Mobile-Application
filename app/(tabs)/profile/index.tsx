import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useUser } from "@clerk/expo";
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
import GrowthSection from "@/components/profile/GrowthSection";
import RecommendationsSection from "@/components/profile/RecommendationsSection";
import DifficultyProgressSection from "@/components/profile/DifficultyProgressSection";

const CARD_CLASS = "bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3";

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
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useUserMeQuery();
  const { user: clerkUser } = useUser();
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

  const visibleSubjects = analytics ? filterTestSubjects(analytics.subjects) : [];
  const visibleStrongSubjects = analytics ? filterTestSubjectNames(analytics.strong_subjects) : [];
  const visibleWeakSubjects = analytics ? filterTestSubjectNames(analytics.weak_subjects) : [];

  const displayName = clerkUser?.username ?? user?.username ?? "...";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-primary">
      <SafeAreaView className=" px-[30px] bg-primary flex flex-row z-20 rounded-b-[40px] w-[100%] items-center justify-between absolute ">
        <View >
          <Text className="text-white text-2xl  font-bold">
            Hi {displayName}
          </Text>
          {joinDate && (
            <Text className="text-white font-normal">
              Member since {joinDate}
            </Text>
          )}
        </View>
        <View className=" h-[70px] w-[70px] rounded-full bg-white/20 border-2 border-white/40 items-center justify-center">
          <User size={26} color={ICON_COLORS.white} strokeWidth={1.8} />
        </View>
      </SafeAreaView>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ICON_COLORS.primary500} />} className="bg-white">
      
        <View className="bg-white mt-[130px] ">

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

        </View>
        </View>
      </ScrollView>
    
    </SafeAreaView>
  );
}
