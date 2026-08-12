import { FlatList, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MATCH_HISTORY, MatchResult, QuestionRecord } from "@/constants/matchData";
import { ChevronLeft, Check, X } from "lucide-react-native";

const RESULT_HEADER: Record<MatchResult, { bg: string; label: string; sub: string }> = {
  win:  { bg: "bg-emerald-500", label: "You Won",  sub: "Great performance!" },
  loss: { bg: "bg-rose-500",    label: "You Lost", sub: "Better luck next time" },
  tie:  { bg: "bg-slate-600",   label: "Tie",      sub: "An equal match" },
};

function AnswerCell({ answer, correct }: { answer: string; correct: boolean }) {
  return (
    <View className={`flex-1 flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg ${correct ? "bg-emerald-50" : "bg-rose-50"}`}>
      <View className={`w-4 h-4 rounded-full justify-center items-center ${correct ? "bg-emerald-500" : "bg-rose-400"}`}>
        {correct
          ? <Check size={10} color="#fff" strokeWidth={3} />
          : <X size={10} color="#fff" strokeWidth={3} />
        }
      </View>
      <Text className={`text-xs flex-1 flex-wrap ${correct ? "text-emerald-800" : "text-rose-800"}`} numberOfLines={2}>
        {answer}
      </Text>
    </View>
  );
}

function QuestionRow({ item, index }: { item: QuestionRecord; index: number }) {
  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-slate-100 shadow-sm shadow-black/5">
      <View className="flex-row items-start gap-3 mb-3">
        <View className="w-6 h-6 rounded-full bg-slate-100 justify-center items-center mt-0.5 shrink-0">
          <Text className="text-[11px] font-bold text-slate-500">{index + 1}</Text>
        </View>
        <Text className="text-sm font-semibold text-slate-800 flex-1 leading-5">{item.question}</Text>
      </View>

      <View className="bg-slate-50 rounded-xl px-3 py-2 mb-3">
        <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Correct Answer</Text>
        <Text className="text-sm font-bold text-slate-700">{item.correctAnswer}</Text>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">You</Text>
          <AnswerCell answer={item.playerAnswer} correct={item.playerCorrect} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Opponent</Text>
          <AnswerCell answer={item.opponentAnswer} correct={item.opponentCorrect} />
        </View>
      </View>
    </View>
  );
}

export default function MatchDetailsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const match = MATCH_HISTORY.find((m) => m.id === matchId);

  if (!match) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-slate-500">Match not found.</Text>
      </SafeAreaView>
    );
  }

  const header = RESULT_HEADER[match.result];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <View className={`${header.bg} px-5 pt-4 pb-8`}>
        <TouchableOpacity
          className="flex-row items-center gap-1 mb-4"
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
          <Text className="text-white text-sm font-semibold">Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-black">{header.label}</Text>
        <Text className="text-white/70 text-sm mt-0.5">{header.sub}</Text>

        <View className="flex-row items-center justify-between mt-5 bg-white/15 rounded-2xl p-4">
          <View className="items-center flex-1">
            <Text className="text-white/70 text-xs font-medium mb-1">You</Text>
            <Text className="text-white text-3xl font-black">{match.playerScore}</Text>
            <Text className="text-white/50 text-xs">/{match.totalQuestions}</Text>
          </View>

          <View className="items-center px-6">
            <Text className="text-white/40 text-lg font-black">VS</Text>
          </View>

          <View className="items-center flex-1">
            <Text className="text-white/70 text-xs font-medium mb-1">{match.opponent}</Text>
            <Text className="text-white text-3xl font-black">{match.opponentScore}</Text>
            <Text className="text-white/50 text-xs">/{match.totalQuestions}</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mt-3">
          <View className="bg-white/15 px-3 py-1.5 rounded-xl">
            <Text className="text-white/80 text-xs font-medium">{match.subject}</Text>
          </View>
          <View className="bg-white/15 px-3 py-1.5 rounded-xl">
            <Text className="text-white/80 text-xs font-medium">{match.topic}</Text>
          </View>
          <View className="bg-white/15 px-3 py-1.5 rounded-xl">
            <Text className="text-white/80 text-xs font-medium">{match.duration}</Text>
          </View>
        </View>
      </View>

      <View className="-mt-4 bg-slate-50 rounded-t-[28px] flex-1">
        <Text className="text-slate-800 text-sm font-bold px-5 pt-5 pb-3">
          Questions & Answers
        </Text>
        <FlatList
          data={match.questions}
          keyExtractor={(q) => q.id}
          renderItem={({ item, index }) => <QuestionRow item={item} index={index} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}
