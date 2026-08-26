import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen, Home, TrendingDown, TrendingUp,ChevronsRight } from "lucide-react-native";
import { BATTLE_RESULT_STYLES, BattleResultTheme, getLeagueStyle } from "@/constants/battleStyles";
import { ICON_COLORS } from "@/constants/quizStyles";
import { filterTestSubjectNames } from "@/constants/quizHelpers";
import { useAnalyticsMeQuery } from "@/hooks/use-quiz";
import { BattleParticipantResult } from "@/types/battleModuleTypes";

// Best-effort "weakest subject" pick for the Practice Weak Topic action --
// prefers the analytics engine's own top-priority recommendation (already
// ranked, priority 1 = most important) and falls back to the first entry in
// the plain weak_subjects list if no recommendation carries a subject.
// Returns null (hiding the action entirely) if neither signal is available,
// rather than guessing.
function pickWeakSubject(analytics: ReturnType<typeof useAnalyticsMeQuery>["data"]): string | null {
  if (!analytics) return null;
  const topRecommendation = [...(analytics.recommendations ?? [])]
    .sort((a, b) => a.priority - b.priority)
    .find((r) => !!r.subject);
  if (topRecommendation?.subject) return topRecommendation.subject;

  const weakSubjects = filterTestSubjectNames(analytics.weak_subjects ?? []);
  return weakSubjects[0] ?? null;
}

function computeAccuracy(result: BattleParticipantResult): number | null {
  const answered = (result.correct_count ?? 0) + (result.wrong_count ?? 0);
  if (answered === 0) return null;
  return Math.round(((result.correct_count ?? 0) / answered) * 100);
}

function computeAvgResponseSeconds(result: BattleParticipantResult): string | null {
  const answered = (result.correct_count ?? 0) + (result.wrong_count ?? 0);
  if (answered === 0 || result.total_response_time_ms == null) return null;
  return (result.total_response_time_ms / answered / 1000).toFixed(1);
}

function ScoreBar({
  score,
  total,
  emphasise,
}: {
  score: number;
  total: number;
  emphasise: boolean;
}) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  return (
    <View className="items-center gap-1">
      <Text className="text-2xl font-black text-slate-800">{score}</Text>
      <View className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${emphasise ? "bg-primary" : "bg-slate-300"}`}
          style={{ width: `${pct}%` }}
        />
      </View>
      <Text className="text-[10px] text-slate-400">/{total}</Text>
    </View>
  );
}

function RatingDelta({ result }: { result: BattleParticipantResult }) {
  const delta = result.rating_delta ?? 0;
  const isUp = delta >= 0;
  return (
    <View className="items-center">
      <Text className="text-slate-400 text-xs font-medium mb-1">Rating</Text>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-slate-800 font-black text-base">{result.rating_before}</Text>
        <Text className="text-slate-300">→</Text>
        <Text className="text-slate-800 font-black text-base">{result.rating_after ?? result.rating_before}</Text>
      </View>
      <View className="flex-row items-center gap-1 mt-0.5">
        {isUp ? (
          <TrendingUp size={12} color={ICON_COLORS.emerald500} strokeWidth={2.5} />
        ) : (
          <TrendingDown size={12} color={ICON_COLORS.rose500} strokeWidth={2.5} />
        )}
        <Text className={`text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
          {isUp ? "+" : ""}
          {delta}
        </Text>
      </View>
    </View>
  );
}

export default function BattleResultsScreen() {
  const router = useRouter();
  const { subject, meJson, opponentJson } = useLocalSearchParams<{
    subject: string;
    meJson: string;
    opponentJson: string;
  }>();

  const me: BattleParticipantResult = JSON.parse(meJson);
  const opponent: BattleParticipantResult | null = opponentJson ? JSON.parse(opponentJson) : null;

  const theme: BattleResultTheme = (me.result as BattleResultTheme) ?? "draw";
  const style = BATTLE_RESULT_STYLES[theme];
  const totalQuestions = Math.max(me.correct_count ?? 0, opponent?.correct_count ?? 0, 1);

  const { data: analytics } = useAnalyticsMeQuery();
  const weakSubject = pickWeakSubject(analytics);

  const handleRematch = () => {
    router.replace({ pathname: "/(main)/battle/queue", params: { subject } } as any);
  };

  const handlePracticeWeakTopic = () => {
    if (!weakSubject) return;
    router.push({
      pathname: "/(main)/quiz/quiz-session",
      params: { subject: weakSubject, questionCount: "10", timer: "10", grade: "10" },
    } as any);
  };

  return (
    <SafeAreaView edges={["top"]} className={`flex-1 ${style.bg}`}>
      <View className="px-5 pt-8 pb-8">
        <Text className="text-white text-3xl font-black text-center">{style.label}</Text>
        <Text className="text-white/70 text-sm text-center mt-1">{style.sub}</Text>

        <View className="flex-row items-center justify-between mt-6 bg-white/15 rounded-2xl p-4">
          <View className="items-center flex-1">
            <Text className="text-white/70 text-xs font-medium mb-1">You</Text>
            <ScoreBar score={me.final_score ?? 0} total={totalQuestions * 100} emphasise={theme === "win"} />
          </View>
          <View className="items-center px-4">
            <Text className="text-white/40 text-lg font-black">VS</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-white/70 text-xs font-medium mb-1">Opponent</Text>
            <ScoreBar
              score={opponent?.final_score ?? 0}
              total={totalQuestions * 100}
              emphasise={theme === "loss"}
            />
          </View>
        </View>

        <View className="bg-white/15 px-3 py-1.5 rounded-xl self-center mt-3">
          <Text className="text-white/80 text-xs font-medium">{subject}</Text>
        </View>
      </View>

      <View className="-mt-4 bg-slate-50 rounded-t-[28px] flex-1 px-5 pt-6">
        <View className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm shadow-black/5 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="items-center flex-1">
              <Text className="text-slate-400 text-xs font-medium mb-1">Correct Answers</Text>
              <Text className="text-slate-800 text-xl font-black">
                {me.correct_count ?? 0} <Text className="text-slate-300 text-sm">vs</Text>{" "}
                {opponent?.correct_count ?? 0}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-around mt-4 pt-4 border-t border-slate-100">
            <View className="items-center">
              <Text className="text-slate-400 text-xs font-medium mb-1">Accuracy</Text>
              <Text className="text-slate-800 font-black text-base">
                {computeAccuracy(me) != null ? `${computeAccuracy(me)}%` : "—"}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-xs font-medium mb-1">Avg Time</Text>
              <Text className="text-slate-800 font-black text-base">
                {computeAvgResponseSeconds(me) != null ? `${computeAvgResponseSeconds(me)}s` : "—"}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-xs font-medium mb-1">Best Streak</Text>
              <Text className="text-slate-800 font-black text-base">{me.best_streak ?? 0}</Text>
            </View>
            {me.league && (
              <View className="items-center">
                <Text className="text-slate-400 text-xs font-medium mb-1">League</Text>
                <View className={`px-2.5 py-1 rounded-full ${getLeagueStyle(me.league).bg}`}>
                  <Text className={`text-xs font-bold ${getLeagueStyle(me.league).text}`}>{me.league}</Text>
                </View>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-around mt-4 pt-4 border-t border-slate-100">
            <RatingDelta result={me} />
            {opponent && <RatingDelta result={opponent} />}
          </View>
        </View>

        <TouchableOpacity
          className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl mb-3"
          activeOpacity={0.85}
          onPress={handleRematch}
        >
          <ChevronsRight size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
          <Text className="text-white font-black text-base">Next Match</Text>
        </TouchableOpacity>

        {/* dismissTo (not replace): this crosses from the (main) group's
            nested battle stack (queue -> match-session -> battle-results)
            back into the sibling (tabs) group. replace() only swaps the
            visible screen and doesn't guarantee that nested stack actually
            unmounts, so a later re-entry into battle for a different subject
            could resume inside the same stale stack -- surfacing as this
            exact results screen, with this match's data, reappearing before
            a new match ever starts. dismissTo explicitly pops back to the
            existing quiz screen, removing everything pushed on top of it. */}
        <TouchableOpacity
          className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
          activeOpacity={0.85}
          onPress={() => router.dismissTo("/(tabs)/quiz")}
        >
          <Home size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
          <Text className="text-slate-600 font-black text-base">Home</Text>
        </TouchableOpacity>

        {weakSubject && (
          <TouchableOpacity
            className="w-full flex-row justify-center items-center gap-2 py-4 mt-3"
            activeOpacity={0.85}
            onPress={handlePracticeWeakTopic}
          >
            <BookOpen size={16} color={ICON_COLORS.primary500} strokeWidth={2.5} />
            <Text className="text-primary font-bold text-sm">Practice {weakSubject}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
    
  );
}
