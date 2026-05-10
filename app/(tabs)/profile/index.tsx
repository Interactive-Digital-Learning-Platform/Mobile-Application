/**
 * Profile tab — analytics dashboard + AI feedback.
 *
 * Sections:
 *   1. Header with user info (useUserMeQuery)
 *   2. Overview stats: accuracy, sessions, avg response time
 *   3. Subject breakdown cards
 *   4. Strong / weak subject pills
 *   5. AI feedback section with refresh (useAnalyticsFeedbackQuery)
 */

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
import {
  User,
  Trophy,
  Clock,
  BarChart2,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  Heart,
} from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useUserMeQuery } from "@/src/modules/quiz/quizHooks";
import { useAnalyticsMeQuery } from "@/src/modules/quiz/quizHooks";
import { useAnalyticsFeedbackQuery } from "@/src/modules/quiz/quizHooks";
import { useQueryClient } from "@tanstack/react-query";
import { quizKeys } from "@/src/modules/quiz/quizHooks";

// ── Small reusable stat tile ──────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-slate-100 shadow-sm shadow-black/5">
      <View className={`w-10 h-10 rounded-full justify-center items-center mb-2 ${iconBg}`}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <Text className="text-slate-800 font-black text-lg">{value}</Text>
      <Text className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mt-0.5">
        {label}
      </Text>
    </View>
  );
}

// ── Subject accuracy card ─────────────────────────────────────────────────────

function SubjectCard({
  subject,
  accuracy,
  avgResponseTime,
  weakTopic,
}: {
  subject: string;
  accuracy: number;
  avgResponseTime: number;
  weakTopic: string | null;
}) {
  const pct = Math.round(accuracy);
  const isStrong = pct >= 70;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <View className={`w-8 h-8 rounded-full justify-center items-center ${
            isStrong ? "bg-emerald-100" : "bg-rose-100"
          }`}>
            <BookOpen size={16} color={isStrong ? "#10B981" : "#EF4444"} strokeWidth={2} />
          </View>
          <Text className="text-slate-800 font-black text-sm flex-1" numberOfLines={1}>
            {subject}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${isStrong ? "bg-emerald-500" : "bg-rose-500"}`}>
          <Text className="text-white text-xs font-black">{pct}%</Text>
        </View>
      </View>

      {/* Accuracy bar */}
      <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
        <View
          className={`h-full rounded-full ${isStrong ? "bg-emerald-500" : "bg-rose-400"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Clock size={11} color="#94a3b8" strokeWidth={2} />
          <Text className="text-slate-400 text-[11px] font-medium">
            {avgResponseTime.toFixed(1)}s avg
          </Text>
        </View>
        {weakTopic && (
          <Text className="text-slate-400 text-[11px] font-medium" numberOfLines={1}>
            Weak: {weakTopic}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Loading skeleton for stats ────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <View className="px-4 mt-4 gap-4">
      <View className="flex-row gap-3">
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-1 h-24 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      ))}
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <View className="w-14 h-14 rounded-full bg-rose-100 justify-center items-center mb-4">
        <AlertCircle size={24} color="#EF4444" strokeWidth={2} />
      </View>
      <Text className="text-slate-800 font-black text-base text-center mb-1">
        Could not load analytics
      </Text>
      <Text className="text-slate-400 text-sm text-center mb-5">{message}</Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-2xl"
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text className="text-white font-black text-sm">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Profile() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useUserMeQuery();

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

  const displayName = user?.username ?? "Student";
  const joinDate    = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FC6E20"
          />
        }
      >
        {/* ── Profile header ── */}
        <View className="bg-primary px-6 pt-6 pb-10">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 justify-center items-center">
              <User size={28} color="#fff" strokeWidth={1.8} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-black text-xl">{displayName}</Text>
              {joinDate && (
                <Text className="text-white/60 text-xs mt-0.5">Member since {joinDate}</Text>
              )}
            </View>
          </View>
        </View>

        <View className="mt-[-24px]">

          {/* ── Overview stats ── */}
          {analyticsLoading ? (
            <StatsSkeleton />
          ) : analyticsError ? (
            <ErrorState
              message={(analyticsError as Error)?.message ?? "Something went wrong."}
              onRetry={refetchAnalytics}
            />
          ) : analytics ? (
            <Animated.View entering={FadeIn.duration(300)} className="px-4">
              {/* Top 3 stat tiles */}
              <View className="flex-row gap-3 mb-4">
                <StatTile
                  icon={BarChart2}
                  iconColor="#FC6E20"
                  iconBg="bg-orange-100"
                  label="Sessions"
                  value={analytics.total_sessions}
                />
                <StatTile
                  icon={Trophy}
                  iconColor="#F59E0B"
                  iconBg="bg-amber-100"
                  label="Accuracy"
                  value={`${Math.round(analytics.overall_accuracy)}%`}
                />
                <StatTile
                  icon={Clock}
                  iconColor="#3B82F6"
                  iconBg="bg-blue-100"
                  label="Avg / Q"
                  value={`${analytics.overall_avg_response_time.toFixed(1)}s`}
                />
              </View>

              {/* Strong / weak subjects */}
              {(analytics.strong_subjects.length > 0 || analytics.weak_subjects.length > 0) && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-100 shadow-sm shadow-black/5">
                  {analytics.strong_subjects.length > 0 && (
                    <View className="mb-3">
                      <View className="flex-row items-center gap-2 mb-2">
                        <TrendingUp size={16} color="#10B981" strokeWidth={2} />
                        <Text className="text-emerald-700 font-black text-xs uppercase tracking-wide">
                          Strong
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {analytics.strong_subjects.map((s) => (
                          <View key={s} className="bg-emerald-100 px-3 py-1.5 rounded-full">
                            <Text className="text-emerald-700 text-xs font-semibold">{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {analytics.weak_subjects.length > 0 && (
                    <View>
                      <View className="flex-row items-center gap-2 mb-2">
                        <TrendingDown size={16} color="#EF4444" strokeWidth={2} />
                        <Text className="text-rose-600 font-black text-xs uppercase tracking-wide">
                          Needs Work
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {analytics.weak_subjects.map((s) => (
                          <View key={s} className="bg-rose-100 px-3 py-1.5 rounded-full">
                            <Text className="text-rose-600 text-xs font-semibold">{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Per-subject breakdown */}
              {analytics.subjects.length > 0 && (
                <>
                  <Text className="text-slate-800 font-black text-sm mb-3 px-1">
                    Subject Breakdown
                  </Text>
                  {analytics.subjects.map((s, i) => (
                    <Animated.View
                      key={s.subject}
                      entering={FadeInDown.delay(i * 60).duration(250)}
                    >
                      <SubjectCard
                        subject={s.subject}
                        accuracy={s.accuracy}
                        avgResponseTime={s.avg_response_time}
                        weakTopic={s.weak_topic}
                      />
                    </Animated.View>
                  ))}
                </>
              )}

              {analytics.total_sessions === 0 && (
                <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
                  <Target size={32} color="#FC6E20" strokeWidth={1.8} />
                  <Text className="text-slate-800 font-black text-base mt-3 mb-1">
                    No quiz data yet
                  </Text>
                  <Text className="text-slate-400 text-sm text-center">
                    Complete a quiz to see your analytics here.
                  </Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ── AI Feedback ── */}
          <View className="px-4 mt-2">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#7C3AED" strokeWidth={2} />
                <Text className="text-slate-800 font-black text-sm">AI Feedback</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100"
                activeOpacity={0.8}
                onPress={() => refetchFeedback()}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : (
                  <RefreshCw size={12} color="#7C3AED" strokeWidth={2.5} />
                )}
                <Text className="text-violet-700 text-xs font-bold">Refresh</Text>
              </TouchableOpacity>
            </View>

            {feedbackLoading ? (
              <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text className="text-slate-400 text-sm mt-3">Generating AI feedback…</Text>
              </View>
            ) : feedbackError ? (
              <View className="bg-white rounded-2xl p-4 border border-rose-100">
                <Text className="text-rose-500 text-sm font-medium text-center">
                  Could not load feedback. Pull to refresh or tap Refresh.
                </Text>
              </View>
            ) : feedback ? (
              <Animated.View entering={FadeIn.duration(300)} className="gap-3">
                {/* Motivational note */}
                <View className="bg-gradient-to-br from-violet-500 to-purple-600 bg-violet-600 rounded-2xl p-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Heart size={16} color="#fff" strokeWidth={2} />
                    <Text className="text-white font-black text-xs uppercase tracking-wide">
                      Motivation
                    </Text>
                  </View>
                  <Text className="text-white text-sm leading-5 font-medium">
                    {feedback.motivational_note}
                  </Text>
                  {feedback.generated_at && (
                    <Text className="text-white/40 text-[10px] mt-2">
                      Generated {new Date(feedback.generated_at).toLocaleTimeString([], {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>

                {/* Strong areas */}
                {feedback.strong_areas.length > 0 && (
                  <View className="bg-white rounded-2xl p-4 border border-slate-100">
                    <View className="flex-row items-center gap-2 mb-3">
                      <CheckCircle2 size={16} color="#10B981" strokeWidth={2} />
                      <Text className="text-emerald-700 font-black text-xs uppercase tracking-wide">
                        Strong Areas
                      </Text>
                    </View>
                    <View className="gap-2">
                      {feedback.strong_areas.map((area, i) => (
                        <View key={i} className="flex-row items-start gap-2">
                          <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                          <Text className="text-slate-700 text-sm leading-5 flex-1">{area}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Weak areas */}
                {feedback.weak_areas.length > 0 && (
                  <View className="bg-white rounded-2xl p-4 border border-slate-100">
                    <View className="flex-row items-center gap-2 mb-3">
                      <TrendingDown size={16} color="#EF4444" strokeWidth={2} />
                      <Text className="text-rose-600 font-black text-xs uppercase tracking-wide">
                        Focus Areas
                      </Text>
                    </View>
                    <View className="gap-2">
                      {feedback.weak_areas.map((area, i) => (
                        <View key={i} className="flex-row items-start gap-2">
                          <View className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5" />
                          <Text className="text-slate-700 text-sm leading-5 flex-1">{area}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Suggestions */}
                {feedback.suggestions.length > 0 && (
                  <View className="bg-white rounded-2xl p-4 border border-slate-100">
                    <View className="flex-row items-center gap-2 mb-3">
                      <Lightbulb size={16} color="#F59E0B" strokeWidth={2} />
                      <Text className="text-amber-600 font-black text-xs uppercase tracking-wide">
                        Suggestions
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {feedback.suggestions.map((tip, i) => (
                        <View key={i} className="flex-row items-start gap-2.5 bg-amber-50 rounded-xl px-3 py-2.5">
                          <Text className="text-amber-600 font-black text-xs mt-0.5">{i + 1}</Text>
                          <Text className="text-slate-700 text-sm leading-5 flex-1">{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Animated.View>
            ) : null}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
