import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { MATCH_HISTORY, MatchRecord, MatchResult } from "@/constants/matchData";

const RESULT_STYLES: Record<MatchResult, { card: string; badge: string; badgeText: string; label: string }> = {
  win:  { card: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-500",  badgeText: "text-white", label: "Win"  },
  loss: { card: "bg-rose-50 border-rose-200",       badge: "bg-rose-500",     badgeText: "text-white", label: "Loss" },
  tie:  { card: "bg-white border-slate-200",         badge: "bg-slate-400",    badgeText: "text-white", label: "Tie"  },
};

const WIN_REASON_LABEL: Record<string, string> = {
  correct_answers: "Won by correct answers",
  timeout:         "Won by timeout",
};

function ScoreBar({ score, total, isPlayer, result }: { score: number; total: number; isPlayer: boolean; result: MatchResult }) {
  const fillColor = isPlayer
    ? result === "win" ? "bg-emerald-500" : result === "loss" ? "bg-rose-400" : "bg-slate-400"
    : "bg-slate-300";
  return (
    <View className="items-center gap-1">
      <Text className="text-2xl font-bold text-slate-800">{score}</Text>
      <View className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <View className={`h-full ${fillColor} rounded-full`} style={{ width: `${(score / total) * 100}%` }} />
      </View>
      <Text className="text-[10px] text-slate-400">/{total}</Text>
    </View>
  );
}

function MatchCard({ item }: { item: MatchRecord }) {
  const router = useRouter();
  const style = RESULT_STYLES[item.result];

  return (
    <View className={`mx-4 mb-3 rounded-2xl border p-4 ${style.card}`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-slate-500">{item.subject}</Text>
          <Text className="text-sm font-bold text-slate-800">{item.topic}</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${style.badge}`}>
          <Text className={`text-xs font-bold ${style.badgeText}`}>{style.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View className="items-center gap-1 flex-1">
          <View className="w-10 h-10 rounded-full bg-slate-200 justify-center items-center">
            <Text className="text-xs font-bold text-slate-600">You</Text>
          </View>
          <ScoreBar score={item.playerScore} total={item.totalQuestions} isPlayer result={item.result} />
        </View>

        <View className="items-center px-4">
          <Text className="text-lg font-black text-slate-300">VS</Text>
        </View>

        <View className="items-center gap-1 flex-1">
          <View className="w-10 h-10 rounded-full bg-slate-200 justify-center items-center">
            <Text className="text-[10px] font-bold text-slate-600 text-center">{item.opponent.split(" ")[0]}</Text>
          </View>
          <ScoreBar score={item.opponentScore} total={item.totalQuestions} isPlayer={false} result={item.result} />
        </View>
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-black/5">
        <View className="flex-row items-center gap-3">
          <Text className="text-[11px] text-slate-400">{item.date}</Text>
          <Text className="text-[11px] text-slate-400">{item.duration}</Text>
          {item.winReason && item.result !== "tie" && (
            <View className="bg-slate-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] text-slate-500 font-medium">
                {WIN_REASON_LABEL[item.winReason]}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          className="bg-slate-800 px-4 py-2 rounded-xl"
          activeOpacity={0.8}
          onPress={() => router.push(`/(tabs)/quiz/${item.id}` as any)}
        >
          <Text className="text-white text-xs font-bold">Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OnlineList() {
  return (
    <FlatList
      data={MATCH_HISTORY}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MatchCard item={item} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
      className="w-full"
    />
  );
}
