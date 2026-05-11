/**
 * Profile tab — analytics dashboard + AI feedback.
 *
 * Sections:
 *   1. Header with user info (useUserMeQuery)
 *   2. Overview: accuracy donut ring + sessions/speed tiles
 *   3. Horizontal bar chart — subject accuracy
 *   4. Strong / weak subject pills
 *   5. Per-subject detail cards
 *   6. AI feedback section with refresh (useAnalyticsFeedbackQuery)
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
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
  CheckCircle2,
  Lightbulb,
  Target,
  Heart,
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  useUserMeQuery,
  useAnalyticsMeQuery,
  useAnalyticsFeedbackQuery,
  quizKeys,
} from "@/src/modules/quiz/quizHooks";
import { useQueryClient } from "@tanstack/react-query";

// ── Primary palette ───────────────────────────────────────────────────────────

const C = {
  p50:  "#FFF3EC",
  p100: "#FFE4CF",
  p200: "#FFCCA8",
  p300: "#FFA87A",
  p400: "#FF8C50",
  p500: "#FC6E20",
  p600: "#E55B10",
  p700: "#CC4D08",
  p800: "#A33C06",
};


// ── Shared stylesheet ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    color: "#1e293b",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pillStrong: {
    backgroundColor: C.p100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillWeak: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});

// ── Accuracy donut ring ───────────────────────────────────────────────────────

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
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
        <Circle
          cx={cx} cy={cy} r={R}
          stroke={C.p100} strokeWidth={SW} fill="transparent"
        />
        <Circle
          cx={cx} cy={cy} r={R}
          stroke={C.p500} strokeWidth={SW} fill="transparent"
          strokeDasharray={`${filled} ${CIRC - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.p700, fontSize: 22, fontWeight: "900", lineHeight: 26 }}>
          {Math.round(pct)}%
        </Text>
        <Text style={{ color: C.p400, fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Accuracy
        </Text>
      </View>
    </View>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────

function SubjectBarChart({
  subjects,
}: {
  subjects: { subject: string; accuracy: number }[];
}) {
  if (!subjects.length) return null;

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <View style={[styles.iconBadge, { backgroundColor: C.p100 }]}>
          <BarChart2 size={14} color={C.p500} strokeWidth={2} />
        </View>
        <Text style={styles.sectionLabel}>Subject Accuracy</Text>
      </View>

      <View style={{ gap: 10 }}>
        {subjects.map((s) => {
          const pct = Math.min(Math.max(s.accuracy, 0), 100);
          const isStrong = pct >= 70;

          return (
            <View key={s.subject} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{ width: 80, fontSize: 11, fontWeight: "600", color: "#64748b" }}
                numberOfLines={1}
              >
                {s.subject}
              </Text>
              <View style={{ flex: 1, height: 14, backgroundColor: C.p50, borderRadius: 7, overflow: "hidden" }}>
                <View style={{
                  width: `${pct}%`,
                  height: "100%",
                  backgroundColor: isStrong ? C.p500 : C.p300,
                  borderRadius: 7,
                }} />
              </View>
              <Text style={{ width: 36, fontSize: 11, fontWeight: "800", textAlign: "right", color: isStrong ? C.p600 : C.p400 }}>
                {Math.round(pct)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Small stat tile ───────────────────────────────────────────────────────────

function StatTile({
  icon: Icon, iconColor, iconBg, label, value,
}: {
  icon: any; iconColor: string; iconBg: string; label: string; value: string | number;
}) {
  return (
    <View style={[styles.card, { flex: 1, alignItems: "center", paddingVertical: 14 }]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg, width: 40, height: 40, borderRadius: 20 }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={{ color: "#1e293b", fontWeight: "900", fontSize: 16, marginTop: 6 }}>{value}</Text>
      <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1.2, height: 140, backgroundColor: C.p50, borderRadius: 18 }} />
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.p50, borderRadius: 18 }} />
          <View style={{ flex: 1, backgroundColor: C.p50, borderRadius: 18 }} />
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={{ height: 72, backgroundColor: C.p50, borderRadius: 18 }} />
      ))}
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}>
      <View style={[styles.iconBadge, { backgroundColor: "#FEE2E2", width: 56, height: 56, borderRadius: 28, marginBottom: 16 }]}>
        <AlertCircle size={24} color="#EF4444" strokeWidth={2} />
      </View>
      <Text style={{ color: "#1e293b", fontWeight: "900", fontSize: 16, textAlign: "center", marginBottom: 4 }}>
        Could not load analytics
      </Text>
      <Text style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginBottom: 20 }}>{message}</Text>
      <TouchableOpacity
        style={{ backgroundColor: C.p500, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>Try Again</Text>
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
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }} className="bg-primary">
      <View className="bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.p500} />
        }
        className="bg-primary"
      >
        <View className="bg-white">

        
      

      
        {/* ── Header ── */}
        <View style={{
          backgroundColor: C.p500,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 44,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          overflow: "hidden",
        }}>
          
          

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center", justifyContent: "center",
            }}>
              <User size={26} color="#fff" strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 20, lineHeight: 24 }}>
                {displayName}
              </Text>
              {joinDate && (
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 3 }}>
                  Member since {joinDate}
                </Text>
              )}
            </View>
            {analytics && (
              <View style={{
                backgroundColor: "rgba(255,255,255,0.18)",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.25)",
              }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18, lineHeight: 22 }}>
                  {analytics.total_sessions}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sessions
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={{ marginTop: -22 }}>

          {analyticsLoading ? (
            <StatsSkeleton />
          ) : analyticsError ? (
            <ErrorState
              message={(analyticsError as Error)?.message ?? "Something went wrong."}
              onRetry={refetchAnalytics}
            />
          ) : analytics ? (
            <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 16 }}>

              {/* Accuracy ring + quick tiles */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <View style={[styles.card, { flex: 1.15, alignItems: "center", justifyContent: "center", paddingVertical: 18 }]}>
                  <AccuracyRing accuracy={analytics.overall_accuracy} />
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                  <StatTile
                    icon={Trophy}
                    iconColor={C.p500}
                    iconBg={C.p100}
                    label="Sessions"
                    value={analytics.total_sessions}
                  />
                  <StatTile
                    icon={Clock}
                    iconColor={C.p600}
                    iconBg={C.p100}
                    label="Avg / Q"
                    value={`${analytics.overall_avg_response_time.toFixed(1)}s`}
                  />
                </View>
              </View>

              {/* Bar chart */}
              {analytics.subjects.length > 0 && (
                <SubjectBarChart subjects={analytics.subjects} />
              )}

              {/* Strong / weak pills */}
              {(analytics.strong_subjects.length > 0 || analytics.weak_subjects.length > 0) && (
                <View style={[styles.card, { marginBottom: 12 }]}>
                  {analytics.strong_subjects.length > 0 && (
                    <View style={{ marginBottom: analytics.weak_subjects.length > 0 ? 12 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <TrendingUp size={14} color={C.p500} strokeWidth={2} />
                        <Text style={[styles.sectionLabel, { color: C.p600 }]}>Strong</Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {analytics.strong_subjects.map((s) => (
                          <View key={s} style={styles.pillStrong}>
                            <Text style={{ color: C.p700, fontSize: 11, fontWeight: "600" }}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {analytics.weak_subjects.length > 0 && (
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <TrendingDown size={14} color="#EF4444" strokeWidth={2} />
                        <Text style={[styles.sectionLabel, { color: "#DC2626" }]}>Needs Work</Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {analytics.weak_subjects.map((s) => (
                          <View key={s} style={styles.pillWeak}>
                            <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "600" }}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {analytics.total_sessions === 0 && (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 36 }]}>
                  <Target size={32} color={C.p500} strokeWidth={1.8} />
                  <Text style={{ color: "#1e293b", fontWeight: "900", fontSize: 15, marginTop: 12, marginBottom: 4 }}>
                    No quiz data yet
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                    Complete a quiz to see your analytics here.
                  </Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ── AI Feedback ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} color={C.p500} strokeWidth={2} />
                <Text style={styles.sectionLabel}>AI Feedback</Text>
              </View>
              <TouchableOpacity
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 12, backgroundColor: C.p100,
                }}
                activeOpacity={0.8}
                onPress={() => refetchFeedback()}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? (
                  <ActivityIndicator size="small" color={C.p500} />
                ) : (
                  <RefreshCw size={11} color={C.p600} strokeWidth={2.5} />
                )}
                <Text style={{ color: C.p700, fontSize: 11, fontWeight: "700" }}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {feedbackLoading ? (
              <View style={[styles.card, { alignItems: "center", paddingVertical: 36 }]}>
                <ActivityIndicator size="large" color={C.p500} />
                <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>Generating AI feedback…</Text>
              </View>
            ) : feedbackError ? (
              <View style={[styles.card, { borderColor: "#FEE2E2" }]}>
                <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "500", textAlign: "center" }}>
                  Could not load feedback. Pull to refresh or tap Refresh.
                </Text>
              </View>
            ) : feedback ? (
              <Animated.View entering={FadeIn.duration(300)} style={{ gap: 10 }}>
                {/* Motivational note */}
                <View style={{ backgroundColor: C.p500, borderRadius: 18, padding: 16, overflow: "hidden" }}>
                  <View style={{
                    position: "absolute", top: -16, right: -16,
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: C.p600, opacity: 0.4,
                  }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Heart size={13} color="#fff" strokeWidth={2} />
                    <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                      Motivation
                    </Text>
                  </View>
                  <Text style={{ color: "white", fontSize: 13, lineHeight: 20, fontWeight: "500" }}>
                    {feedback.motivational_note}
                  </Text>
                  {feedback.generated_at && (
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 8 ,fontWeight: "500"}}>
                      Generated {new Date(feedback.generated_at).toLocaleTimeString([], {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>

                

                {/* Suggestions */}
                {feedback.suggestions.length > 0 && (
                  <View style={[styles.card, { borderColor: "#FEF3C7" }]} className="mb-5">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Lightbulb size={14} color="#F59E0B" strokeWidth={2} />
                      <Text style={[styles.sectionLabel, { color: "#D97706" }]}>Suggestions</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      {feedback.suggestions.map((tip, i) => (
                        <View key={i} style={{
                          flexDirection: "row", alignItems: "flex-start", gap: 10,
                          backgroundColor: C.p50, borderRadius: 12,
                          paddingHorizontal: 12, paddingVertical: 10,
                        }}>
                          <Text style={{ color: C.p500, fontWeight: "900", fontSize: 11, marginTop: 2 }}>{i + 1}</Text>
                          <Text style={{ color: "#334155", fontSize: 13, lineHeight: 20, flex: 1 }}>{tip}</Text>
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
    </View>
    </SafeAreaView>
  );
}
