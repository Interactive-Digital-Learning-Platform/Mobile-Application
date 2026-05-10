import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useState, useCallback } from "react";
import { Plus, ChevronDown, Check, Brain } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import CreateQuizModal, { QuizConfig } from "@/components/quiz-componets/CreateQuizModal";
import { DIFF_DOT } from "@/constants/quizStyles";
import type { Difficulty } from "@/components/quiz-componets/QuizPracticeCard";
import QuizPracticeCard, { type PracticeItem } from "@/components/quiz-componets/QuizPracticeCard";
import { useQuizSessionsQuery } from "@/src/modules/quiz/quizHooks";

const DIFFICULTIES: Array<"All" | Difficulty> = ["All", "Easy", "Medium", "Hard"];
const SUBJECTS = ["All", "Mathematics", "Science", "History", "English", "Geography", "Programming"];

type ActiveDropdown = "difficulty" | "subject" | null;

function FilterChip({
  label, value, isOpen, onPress,
}: {
  label: string; value: string; isOpen: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
        isOpen ? "border-primary bg-orange-50" : "border-slate-200 bg-white"
      }`}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${isOpen ? "text-primary" : "text-slate-600"}`}>
        {label}: {value}
      </Text>
      <ChevronDown
        size={12}
        color={isOpen ? "#FC6E20" : "#94A3B8"}
        strokeWidth={2.5}
        style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
      />
    </TouchableOpacity>
  );
}

function DropdownMenu<T extends string>({
  options, selected, onSelect,
}: {
  options: T[]; selected: T; onSelect: (val: T) => void;
}) {
  return (
    <View className="mx-4 mt-1 mb-2 bg-white rounded-2xl border border-slate-100 shadow-md shadow-black/10 overflow-hidden">
      {options.map((opt, i) => {
        const isSelected = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            className={`flex-row items-center justify-between px-4 py-3 ${
              isSelected ? "bg-orange-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
            }`}
            activeOpacity={0.75}
            onPress={() => onSelect(opt)}
          >
            <View className="flex-row items-center gap-2">
              {DIFF_DOT[opt] && (
                <View className={`w-2 h-2 rounded-full ${DIFF_DOT[opt] ?? "bg-slate-300"}`} />
              )}
              <Text className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-700"}`}>
                {opt}
              </Text>
            </View>
            {isSelected && <Check size={14} color="#FC6E20" strokeWidth={2.5} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PracticeList() {
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [subject, setSubject] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);

  const { data: sessions, isLoading: loadingSessions, isFetching, refetch } = useQuizSessionsQuery();

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch])
  );

  const handleGenerate = (config: QuizConfig) => {
    // Collect question IDs from all existing sessions for the same subject + difficulty
    // so the backend can serve unseen questions instead of repeating the same pool.
    const seenIds = (sessions ?? [])
      .filter(
        (s) =>
          s.subject.toLowerCase() === config.subject.toLowerCase() &&
          s.difficulty.toLowerCase() === config.difficulty.toLowerCase(),
      )
      .flatMap((s) => s.question_ids ?? []);

    const uniqueExcluded = [...new Set(seenIds)];

    router.push({
      pathname: "/(tabs)/quiz/quiz-session",
      params: {
        subject:       config.subject,
        lesson:        config.subject,
        difficulty:    config.difficulty.toLowerCase(),
        questionCount: String(config.questions),
        timer:         String(config.timer),
        grade:         "10",
        ...(uniqueExcluded.length > 0
          ? { excludedQuestionIds: JSON.stringify(uniqueExcluded) }
          : {}),
      },
    } as any);
  };

  const toggle = (type: "difficulty" | "subject") =>
    setActiveDropdown((prev) => (prev === type ? null : type));

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const items: PracticeItem[] = (sessions ?? []).map((s) => ({
    id:         String(s.session_id),
    session_id: s.session_id,
    subject:    s.subject,
    difficulty: capitalize(s.difficulty) as Difficulty,
    questions:  s.question_count,
    timer:      `${s.question_count} min`,
    progress:   s.is_completed
      ? 100
      : s.question_count > 0
      ? Math.min(Math.round((s.answered_count / s.question_count) * 100), 99)
      : 0,
    accuracy:   s.accuracy,
    created_at: s.created_at,
  }));

  const filtered = items.filter((item) => {
    const diffMatch = difficulty === "All" || item.difficulty === difficulty;
    const subMatch  = subject === "All" || item.subject === subject;
    return diffMatch && subMatch;
  });

  return (
    <View className="flex-1 w-full relative">
      {/* Filters */}
      <View className="pt-3 pb-1">
        <View className="flex-row gap-2 px-4 pb-2 justify-center items-center">
          <FilterChip
            label="Difficulty"
            value={difficulty}
            isOpen={activeDropdown === "difficulty"}
            onPress={() => toggle("difficulty")}
          />
          <FilterChip
            label="Subject"
            value={subject === "All" ? "All" : subject.split(" ")[0]}
            isOpen={activeDropdown === "subject"}
            onPress={() => toggle("subject")}
          />
          {isFetching && !loadingSessions && (
            <ActivityIndicator size="small" color="#FC6E20" />
          )}
        </View>

        {activeDropdown === "difficulty" && (
          <DropdownMenu
            options={DIFFICULTIES}
            selected={difficulty}
            onSelect={(val) => { setDifficulty(val); setActiveDropdown(null); }}
          />
        )}
        {activeDropdown === "subject" && (
          <DropdownMenu
            options={SUBJECTS as string[]}
            selected={subject}
            onSelect={(val) => { setSubject(val); setActiveDropdown(null); }}
          />
        )}

        {(difficulty !== "All" || subject !== "All") && (
          <TouchableOpacity
            className="mx-4 mb-2"
            onPress={() => { setDifficulty("All"); setSubject("All"); }}
          >
            <Text className="text-xs text-slate-400 font-medium">Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loadingSessions ? (
        <View className="flex-1 justify-center items-center pb-16">
          <ActivityIndicator size="large" color="#FC6E20" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8 pb-16">
          <View className="w-16 h-16 rounded-full bg-orange-100 justify-center items-center mb-4">
            <Brain size={28} color="#FC6E20" strokeWidth={1.8} />
          </View>
          <Text className="text-slate-800 font-black text-base text-center mb-1">
            {items.length === 0 ? "Start your first quiz" : "No quizzes match filters"}
          </Text>
          <Text className="text-slate-400 text-sm text-center leading-5">
            {items.length === 0
              ? "Tap the + button below to generate a personalised AI quiz on any subject."
              : "Try changing the difficulty or subject filter."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QuizPracticeCard item={item} disabled={isFetching} />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-primary/40"
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>

      <CreateQuizModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGenerate={handleGenerate}
      />
    </View>
  );
}
