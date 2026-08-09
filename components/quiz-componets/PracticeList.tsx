import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useState, useCallback } from "react";
import { Plus, ChevronDown, Check, Brain, WifiOff, AlertCircle, RefreshCw, Clock, type LucideIcon } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import CreateQuizModal, { QuizConfig } from "@/components/quiz-componets/CreateQuizModal";
import { DIFF_DOT, SUBJECTS as ALL_SUBJECTS } from "@/constants/quizStyles";
import { capitalize } from "@/constants/quizHelpers";
import QuizPracticeCard, { type Difficulty, type PracticeItem } from "@/components/quiz-componets/QuizPracticeCard";
import Skeleton from "@/components/Skeleton";
import { useQuizSessionsQuery } from "@/hooks/use-quiz";

const DIFFICULTIES: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard"];
const SUBJECTS = ["All", ...ALL_SUBJECTS];

// quizClient's response interceptor re-wraps every rejection into a plain
// Error, so by the time it gets here the message string is the only way to
// tell "offline" apart from "timed out" apart from anything else.
type LoadErrorKind = "network" | "timeout" | "other";

function classifyLoadError(error: unknown): LoadErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout/i.test(message)) return "timeout";
  if (/network/i.test(message)) return "network";
  return "other";
}

const LOAD_ERROR_COPY: Record<LoadErrorKind, { icon: LucideIcon; title: string; message: string }> = {
  network: {
    icon: WifiOff,
    title: "No internet connection",
    message: "Check your connection and try again.",
  },
  timeout: {
    icon: Clock,
    title: "Connection timed out",
    message: "The request took too long — check your connection and try again.",
  },
  other: {
    icon: AlertCircle,
    title: "Couldn't load quizzes",
    message: "Something went wrong loading your quizzes.",
  },
};

type ActiveDropdown = "difficulty" | "subject" | null;

function PracticeCardSkeleton() {
  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-slate-100">
      <View className="flex-row items-start gap-3">
        <Skeleton width={44} height={44} borderRadius={12} />
        <View className="flex-1 gap-2">
          <Skeleton width="55%" height={13} />
          <View className="flex-row gap-2">
            <Skeleton width={50} height={16} borderRadius={999} />
            <Skeleton width={70} height={11} />
          </View>
        </View>
        <Skeleton width={40} height={10} />
      </View>
      <View className="mt-3 gap-1">
        <View className="flex-row justify-between">
          <Skeleton width={90} height={10} />
          <Skeleton width={28} height={10} />
        </View>
        <Skeleton width="100%" height={6} borderRadius={3} />
      </View>
      <Skeleton width="100%" height={38} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

function PracticeListSkeleton() {
  return (
    <View className="pt-1">
      {[0, 1, 2, 3].map((i) => (
        <PracticeCardSkeleton key={i} />
      ))}
    </View>
  );
}

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

  // `isLoading` is only true on the very first fetch; background refetches
  // (focus, post-delete, pull-to-refresh) use `isFetching` instead so the
  // list doesn't flash back to a skeleton every time the tab regains focus.
  const { data: sessions, isLoading, isFetching, isError, error, refetch } = useQuizSessionsQuery();

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch])
  );

  const handleGenerate = (config: QuizConfig) => {
    // Excludes questions already seen in this subject so the backend serves
    // fresh ones; lesson and difficulty are picked automatically server-side.
    const seenIds = (sessions ?? [])
      .filter((s) => s.subject.toLowerCase() === config.subject.toLowerCase())
      .flatMap((s) => s.question_ids ?? []);

    const uniqueExcluded = [...new Set(seenIds)];

    router.push({
      pathname: "/(tabs)/quiz/quiz-session",
      params: {
        subject:       config.subject,
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
    answered_count: s.answered_count,
    accuracy:      s.accuracy,
    correct_count: s.correct_count,
    created_at:    s.created_at,
  }));

  const filtered = items.filter((item) => {
    const diffMatch = difficulty === "All" || item.difficulty === difficulty;
    const subMatch  = subject === "All" || item.subject === subject;
    return diffMatch && subMatch;
  });

  return (
    <View className="flex-1 w-full relative">
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

      {isLoading ? (
        <PracticeListSkeleton />
      ) : isError && items.length === 0 ? (
        // Only takes over the empty state — a failed background refresh with
        // an already-loaded list on screen leaves that list showing as-is.
        (() => {
          const { icon: ErrorIcon, title, message } = LOAD_ERROR_COPY[classifyLoadError(error)];
          return (
            <View className="flex-1 justify-center items-center px-8 pb-16">
              <View className="w-16 h-16 rounded-full bg-rose-100 justify-center items-center mb-4">
                <ErrorIcon size={28} color="#EF4444" strokeWidth={1.8} />
              </View>
              <Text className="text-slate-800 font-black text-base text-center mb-1">
                {title}
              </Text>
              <Text className="text-slate-400 text-sm text-center leading-5 mb-5">
                {message}
              </Text>
              <TouchableOpacity
                className="bg-primary flex-row items-center gap-2 px-6 py-3 rounded-2xl"
                activeOpacity={0.85}
                onPress={() => refetch()}
              >
                <RefreshCw size={16} color="#fff" strokeWidth={2.5} />
                <Text className="text-white font-black text-sm">Try Again</Text>
              </TouchableOpacity>
            </View>
          );
        })()
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
