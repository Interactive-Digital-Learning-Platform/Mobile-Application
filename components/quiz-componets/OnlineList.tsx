import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Globe } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { SUBJECTS, ICON_COLORS } from "@/constants/quizStyles";
import { BATTLE_RESULT_STYLES, BattleResultTheme, getLeagueStyle } from "@/constants/battleStyles";
import { useBattleAvailabilityQuery, useBattleHistoryQuery } from "@/hooks/use-battle";
import { BattleHistoryEntry } from "@/types/battleModuleTypes";
import BattleSubjectModal from "@/components/quiz-componets/BattleSubjectModal";
import Skeleton from "@/components/Skeleton";

type ResultFilter = "All" | BattleResultTheme;
const RESULT_FILTERS: ResultFilter[] = ["All", "win", "loss", "draw", "forfeit"];
const SUBJECT_FILTERS = ["All", ...SUBJECTS];

function resultFilterLabel(value: ResultFilter): string {
  return value === "All" ? "All" : BATTLE_RESULT_STYLES[value].label;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function HistoryRow({ entry }: { entry: BattleHistoryEntry }) {
  const theme: BattleResultTheme = (entry.me.result as BattleResultTheme) ?? "draw";
  const style = BATTLE_RESULT_STYLES[theme];
  const league = getLeagueStyle(entry.me.league);
  const delta = entry.me.rating_delta ?? 0;

  return (
    <View className="mx-4 mb-2.5 px-4 py-3.5 rounded-2xl border border-slate-100 bg-white shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className={`px-2.5 py-1 rounded-full ${style.bg}`}>
            <Text className="text-[10px] font-bold text-white">{style.label}</Text>
          </View>
          <Text className="text-slate-500 text-xs font-semibold">{entry.subject}</Text>
        </View>
        <Text className="text-[11px] text-slate-400">{formatDate(entry.finished_at)}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-slate-800 font-bold text-sm flex-1" numberOfLines={1}>
          vs {entry.opponent_username ?? `Player #${entry.opponent_user_id ?? "?"}`}
        </Text>
        {entry.me.league && (
          <View className={`px-2 py-0.5 rounded-full mr-2 ${league.bg}`}>
            <Text className={`text-[10px] font-bold ${league.text}`}>{entry.me.league}</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
        <View className="items-start">
          <Text className="text-[10px] text-slate-400">Correct</Text>
          <Text className="text-slate-800 font-black text-sm">
            {entry.me.correct_count ?? 0}
            <Text className="text-slate-300 text-xs"> / {(entry.me.correct_count ?? 0) + (entry.me.wrong_count ?? 0)}</Text>
          </Text>
        </View>
        <View className="items-start">
          <Text className="text-[10px] text-slate-400">Score</Text>
          <Text className="text-slate-800 font-black text-sm">{entry.me.final_score ?? 0}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-slate-400">Rating</Text>
          <Text className={`font-black text-sm ${delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {delta >= 0 ? "+" : ""}
            {delta}
          </Text>
        </View>
      </View>
    </View>
  );
}

function HistoryRowSkeleton() {
  return (
    <View className="mx-4 mb-2.5 px-4 py-3.5 rounded-2xl border border-slate-100 bg-white shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Skeleton width={62} height={20} borderRadius={999} />
          <Skeleton width={72} height={12} />
        </View>
        <Skeleton width={64} height={11} />
      </View>

      <View className="flex-row items-center justify-between">
        <Skeleton width={140} height={14} />
        <Skeleton width={50} height={18} borderRadius={999} />
      </View>

      <View className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
        <View className="items-start gap-1.5">
          <Skeleton width={42} height={10} />
          <Skeleton width={32} height={16} />
        </View>
        <View className="items-start gap-1.5">
          <Skeleton width={36} height={10} />
          <Skeleton width={24} height={16} />
        </View>
        <View className="items-end gap-1.5">
          <Skeleton width={36} height={10} />
          <Skeleton width={28} height={16} />
        </View>
      </View>
    </View>
  );
}

function HistoryListSkeleton() {
  return (
    <View className="pt-1">
      {[0, 1, 2, 3].map((i) => (
        <HistoryRowSkeleton key={i} />
      ))}
    </View>
  );
}

type ActiveDropdown = "subject" | "result" | null;

function FilterChip({
  label, value, isOpen, onPress,
}: {
  label: string; value: string; isOpen: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
        isOpen ? "border-primary bg-primary-50" : "border-slate-200 bg-white"
      }`}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${isOpen ? "text-primary" : "text-slate-600"}`}>
        {label}: {value}
      </Text>
      <ChevronDown
        size={12}
        color={isOpen ? ICON_COLORS.primary500 : ICON_COLORS.slate400}
        strokeWidth={2.5}
        style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
      />
    </TouchableOpacity>
  );
}

function DropdownMenu<T extends string>({
  options, selected, onSelect, getLabel, getDotClass,
}: {
  options: T[];
  selected: T;
  onSelect: (val: T) => void;
  getLabel?: (val: T) => string;
  getDotClass?: (val: T) => string | null;
}) {
  return (
    <View className="mx-4 mt-1 mb-2 bg-white rounded-2xl border border-slate-100 shadow-md shadow-black/10 overflow-hidden">
      {options.map((opt, i) => {
        const isSelected = opt === selected;
        const label = getLabel ? getLabel(opt) : opt;
        const dotClass = getDotClass ? getDotClass(opt) : null;
        return (
          <TouchableOpacity
            key={opt}
            className={`flex-row items-center justify-between px-4 py-3 ${
              isSelected ? "bg-primary-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
            }`}
            activeOpacity={0.75}
            onPress={() => onSelect(opt)}
          >
            <View className="flex-row items-center gap-2">
              {dotClass && <View className={`w-2 h-2 rounded-full ${dotClass}`} />}
              <Text className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-700"}`}>
                {label}
              </Text>
            </View>
            {isSelected && <Check size={14} color={ICON_COLORS.primary500} strokeWidth={2.5} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function OnlineList() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("All");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useBattleHistoryQuery(subject, page);

  // Watched from the moment this screen mounts (not just after a failed
  // join attempt) so the FAB can visibly reflect "you can't search yet"
  // instead of only discovering that after tapping it and getting a 409.
  const { data: availability } = useBattleAvailabilityQuery(true);
  const isWrappingUp = availability?.status === "matched";
  const wasWrappingUpRef = useRef(false);

  useEffect(() => {
    if (isWrappingUp) {
      wasWrappingUpRef.current = true;
    } else if (wasWrappingUpRef.current) {
      wasWrappingUpRef.current = false;
      Toast.show({
        type: "success",
        text1: "Ready to Battle!",
        text2: "Your last match has wrapped up — you can search for a new one now.",
      });
    }
  }, [isWrappingUp]);

  const handleFindMatch = (subject: string) => {
    setModalVisible(false);
    router.push({ pathname: "/(main)/battle/queue", params: { subject } } as any);
  };

  const handleSubjectChange = (s: string) => {
    setSubject(s === "All" ? null : s);
    setPage(1);
    setActiveDropdown(null);
  };

  const handleResultChange = (r: ResultFilter) => {
    setResultFilter(r);
    setActiveDropdown(null);
  };

  const toggleDropdown = (type: "subject" | "result") =>
    setActiveDropdown((prev) => (prev === type ? null : type));

  const entries = (data?.entries ?? []).filter(
    (entry) => resultFilter === "All" || entry.me.result === resultFilter
  );

  return (
    <View className="flex-1 w-full relative">
      <View className="pt-3 pb-1">
        <View className="flex-row gap-2 px-4 pb-2 justify-center items-center">
          <FilterChip
            label="Subject"
            value={subject === null ? "All" : subject.split(" ")[0]}
            isOpen={activeDropdown === "subject"}
            onPress={() => toggleDropdown("subject")}
          />
          <FilterChip
            label="Result"
            value={resultFilterLabel(resultFilter)}
            isOpen={activeDropdown === "result"}
            onPress={() => toggleDropdown("result")}
          />
        </View>

        {activeDropdown === "subject" && (
          <DropdownMenu
            options={SUBJECT_FILTERS}
            selected={subject === null ? "All" : subject}
            onSelect={handleSubjectChange}
          />
        )}
        {activeDropdown === "result" && (
          <DropdownMenu
            options={RESULT_FILTERS}
            selected={resultFilter}
            onSelect={handleResultChange}
            getLabel={resultFilterLabel}
            getDotClass={(val) => (val === "All" ? null : BATTLE_RESULT_STYLES[val].bg)}
          />
        )}

        {(subject !== null || resultFilter !== "All") && (
          <TouchableOpacity
            className="mx-4 mb-1"
            onPress={() => {
              setSubject(null);
              setResultFilter("All");
              setPage(1);
            }}
          >
            <Text className="text-xs text-slate-400 font-medium">Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <HistoryListSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <AlertTriangle size={28} color={ICON_COLORS.slate400} strokeWidth={2} />
          <Text className="text-slate-500 text-sm text-center mt-3">
            Couldn&apos;t load your battle history. Check your connection and try again.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => refetch()}
            className="mt-4 px-5 py-2.5 rounded-full bg-slate-100"
          >
            <Text className="text-slate-600 font-bold text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.match_id}`}
          renderItem={({ item }) => <HistoryRow entry={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={ICON_COLORS.primary500} />
          }
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Text className="text-slate-400 text-sm text-center">
                No completed battles yet{subject ? ` for ${subject}` : ""}
                {resultFilter !== "All" ? ` marked as ${resultFilterLabel(resultFilter)}` : ""}. Tap the globe
                button to find your first match.
              </Text>
            </View>
          }
          ListFooterComponent={
            data && data.total_pages > 1 ? (
              <View className="flex-row items-center justify-center gap-4 mt-2">
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  className={`w-8 h-8 rounded-full items-center justify-center ${page <= 1 ? "opacity-30" : "bg-slate-100"}`}
                >
                  <ChevronLeft size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="text-xs text-slate-400 font-medium">
                  Page {data.page} / {data.total_pages}
                </Text>
                <TouchableOpacity
                  disabled={page >= data.total_pages}
                  onPress={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    page >= data.total_pages ? "opacity-30" : "bg-slate-100"
                  }`}
                >
                  <ChevronRight size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        className={`absolute bottom-6 right-6 w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-primary/40 ${
          isWrappingUp ? "bg-slate-300" : "bg-primary"
        }`}
        activeOpacity={0.85}
        disabled={isWrappingUp}
        onPress={() => setModalVisible(true)}
      >
        {isWrappingUp ? (
          <ActivityIndicator size="small" color={ICON_COLORS.white} />
        ) : (
          <Globe size={26} color={ICON_COLORS.white} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isWrappingUp && (
        <View className="absolute bottom-24 right-6 bg-slate-800 px-3 py-2 rounded-xl max-w-[200px]">
          <Text className="text-white text-[11px] font-semibold text-center">
            Finishing up your last battle…
          </Text>
        </View>
      )}

      <BattleSubjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onFindMatch={handleFindMatch}
      />
    </View>
  );
}
