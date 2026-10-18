import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, CloudOff, Globe, Trophy } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { SUBJECTS, ICON_COLORS } from "@/constants/quizStyles";
import { BATTLE_RESULT_STYLES, BattleResultTheme } from "@/constants/battleStyles";
import { useBattleAvailabilityQuery, useBattleHistoryQuery } from "@/hooks/use-battle";
import { useIsOnline, showOfflineToast, OFFLINE_COPY } from "@/hooks/use-online-status";
import { BattleHistoryEntry } from "@/types/battleModuleTypes";
import { usePendingBattleResult } from "@/hooks/use-pending-battle-result";
import BattleSubjectModal from "@/components/quiz-componets/BattleSubjectModal";
import { openBattleResults } from "@/components/quiz-componets/BattleResultWatcher";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
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
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function HistoryRow({ entry }: { entry: BattleHistoryEntry }) {
  const theme: BattleResultTheme = (entry.me.result as BattleResultTheme) ?? "draw";
  const style = BATTLE_RESULT_STYLES[theme];
  const delta = entry.me.rating_delta ?? 0;

  return (
    <View className="mx-4 mb-2.5 px-4 py-3.5 rounded-2xl bg-white shadow-sm shadow-primary/15">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className={`px-2.5 py-1 rounded-full ${style.bg}`}>
            <Text className="text-[10px] font-bold text-white">{style.label}</Text>
          </View>
          <Text className="text-primary-700 text-xs font-semibold">{entry.subject}</Text>
        </View>
        <Text className="text-[11px] text-primary-700">{formatDate(entry.finished_at)}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-primary-800 font-bold text-sm flex-1" numberOfLines={1}>
          vs {entry.opponent_username ?? `Player #${entry.opponent_user_id ?? "?"}`}
        </Text>
        {entry.me.league && (
          <View className="mr-2">
            <LeagueBadge league={entry.me.league} />
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-primary-100">
        <View className="items-start">
          <Text className="text-[10px] text-primary-700">Correct</Text>
          <Text className="text-primary-800 font-black text-sm">
            {entry.me.correct_count ?? 0}
            <Text className="text-primary-300 text-xs"> / {(entry.me.correct_count ?? 0) + (entry.me.wrong_count ?? 0)}</Text>
          </Text>
        </View>
        <View className="items-start">
          <Text className="text-[10px] text-primary-700">Score</Text>
          <Text className="text-primary-800 font-black text-sm">{entry.me.final_score ?? 0}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-primary-700">Rating</Text>
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
    <View className="mx-4 mb-2.5 px-4 py-3.5 rounded-2xl bg-white shadow-sm shadow-primary/15">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Skeleton color={ICON_COLORS.primary100} width={62} height={20} borderRadius={999} />
          <Skeleton color={ICON_COLORS.primary100} width={72} height={12} />
        </View>
        <Skeleton color={ICON_COLORS.primary100} width={64} height={11} />
      </View>

      <View className="flex-row items-center justify-between">
        <Skeleton color={ICON_COLORS.primary100} width={140} height={14} />
        <Skeleton color={ICON_COLORS.primary100} width={50} height={18} borderRadius={999} />
      </View>

      <View className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-primary-100">
        <View className="items-start gap-1.5">
          <Skeleton color={ICON_COLORS.primary100} width={42} height={10} />
          <Skeleton color={ICON_COLORS.primary100} width={32} height={16} />
        </View>
        <View className="items-start gap-1.5">
          <Skeleton color={ICON_COLORS.primary100} width={36} height={10} />
          <Skeleton color={ICON_COLORS.primary100} width={24} height={16} />
        </View>
        <View className="items-end gap-1.5">
          <Skeleton color={ICON_COLORS.primary100} width={36} height={10} />
          <Skeleton color={ICON_COLORS.primary100} width={28} height={16} />
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
        isOpen ? "border-primary bg-primary-50" : "border-primary-200 bg-white"
      }`}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${isOpen ? "text-primary" : "text-primary-700"}`}>
        {label}: {value}
      </Text>
      <ChevronDown
        size={12}
        color={isOpen ? ICON_COLORS.primary500 : ICON_COLORS.primary500}
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
    <View className="mx-4 mt-1 mb-2 bg-white rounded-2xl border border-primary-100 shadow-md shadow-primary/20 overflow-hidden">
      {options.map((opt, i) => {
        const isSelected = opt === selected;
        const label = getLabel ? getLabel(opt) : opt;
        const dotClass = getDotClass ? getDotClass(opt) : null;
        return (
          <TouchableOpacity
            key={opt}
            className={`flex-row items-center justify-between px-4 py-3 ${
              isSelected ? "bg-primary-50" : i % 2 === 0 ? "bg-white" : "bg-primary-50/60"
            }`}
            activeOpacity={0.75}
            onPress={() => onSelect(opt)}
          >
            <View className="flex-row items-center gap-2">
              {dotClass && <View className={`w-2 h-2 rounded-full ${dotClass}`} />}
              <Text className={`text-sm font-medium ${isSelected ? "text-primary" : "text-primary-800"}`}>
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
  const { data, isLoading, isError, refetch } = useBattleHistoryQuery(subject, page);
  const isOnline = useIsOnline();

  // Deliberately NOT wired to the query's own `isFetching` -- that flips
  // true for ANY fetch against this query (changing the subject/result
  // filter, paging, or even another screen invalidating this list after a
  // match finishes), none of which the user triggered by pulling down. Once
  // gesture-driven, it stuck this RefreshControl visually pulled down since
  // the native control isn't expecting a "refreshing" state with no
  // matching pull gesture. Tracking it explicitly, set only by this
  // handler and always cleared once the refetch settles, ties it to
  // nothing but an actual pull.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    // Offline the refetch is paused until reconnecting, so awaiting it would leave the spinner stuck.
    if (!isOnline) {
      showOfflineToast(OFFLINE_COPY.battle);
      return;
    }
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Watched from the moment this screen mounts (not just after a failed
  // join attempt) so the FAB can visibly reflect "you can't search yet"
  // instead of only discovering that after tapping it and getting a 409.
  const { data: availability } = useBattleAvailabilityQuery(true);
  // Finished a battle first and left it to wait: until those results are
  // opened once, the matchmaking button becomes "Show Results".
  const pendingResult = usePendingBattleResult();
  const awaitingOpponent = availability?.status === "matched" && !!availability.awaiting_opponent;
  const resultsMatchId = pendingResult?.matchId ?? (awaitingOpponent ? availability?.match_id ?? null : null);
  // "Ready" only once the server has confirmed the match completed (see
  // BattleResultWatcher) -- not inferred from matchmaking status.
  const opponentStillPlaying = pendingResult ? !pendingResult.completed : awaitingOpponent;
  const isWrappingUp = availability?.status === "matched" && resultsMatchId == null;
  const wasWrappingUpRef = useRef(false);

  useEffect(() => {
    if (isWrappingUp) {
      wasWrappingUpRef.current = true;
    } else if (wasWrappingUpRef.current) {
      wasWrappingUpRef.current = false;
      // BattleResultWatcher has its own toast for a battle waiting to be viewed.
      if (resultsMatchId != null) return;
      Toast.show({
        type: "success",
        text1: "Ready to Battle!",
        text2: "Your last match has wrapped up — you can search for a new one now.",
      });
    }
  }, [isWrappingUp, resultsMatchId]);

  // Matchmaking is live, so the subject picker closes if the connection drops while it's open.
  useEffect(() => {
    if (!isOnline && modalVisible) {
      setModalVisible(false);
      showOfflineToast(OFFLINE_COPY.battle);
    }
  }, [isOnline, modalVisible]);

  const handleFindMatch = (subject: string) => {
    setModalVisible(false);
    if (!isOnline) {
      showOfflineToast(OFFLINE_COPY.battle);
      return;
    }
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
            <Text className="text-xs text-primary-700 font-medium">Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <HistoryListSkeleton />
      ) : !data && (isError || !isOnline) ? (
        // Battle history isn't saved on the device, so offline there's nothing to show until reconnecting.
        <View className="flex-1 items-center justify-center px-8">
          {isOnline
            ? <AlertTriangle size={28} color={ICON_COLORS.primary500} strokeWidth={2} />
            : <CloudOff size={28} color={ICON_COLORS.primary500} strokeWidth={2} />}
          <Text className="text-primary-700 text-sm text-center mt-3">
            {isOnline
              ? "Couldn't load your battle history. Check your connection and try again."
              : "You're offline. Your battle history will load when you reconnect."}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => refetch()}
            className="mt-4 px-5 py-2.5 rounded-full bg-primary-50"
          >
            <Text className="text-primary-700 font-bold text-xs">Retry</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ICON_COLORS.primary500} />
          }
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Text className="text-primary-700 text-sm text-center">
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
                  className={`w-8 h-8 rounded-full items-center justify-center ${page <= 1 ? "opacity-30" : "bg-primary-50"}`}
                >
                  <ChevronLeft size={16} color={ICON_COLORS.primary600} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="text-xs text-primary-700 font-medium">
                  Page {data.page} / {data.total_pages}
                </Text>
                <TouchableOpacity
                  disabled={page >= data.total_pages}
                  onPress={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    page >= data.total_pages ? "opacity-30" : "bg-primary-50"
                  }`}
                >
                  <ChevronRight size={16} color={ICON_COLORS.primary600} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {resultsMatchId != null ? (
        <View className="absolute bottom-6 self-center items-center">
          <View className="mb-2 bg-slate-800 px-3 py-1.5 rounded-xl">
            <Text className="text-white text-[11px] font-semibold text-center">
              {opponentStillPlaying ? "Your opponent is still competing…" : "Your battle results are ready"}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-2 h-14 px-6 rounded-full bg-primary shadow-lg shadow-primary/40"
            activeOpacity={0.85}
            onPress={() => openBattleResults(router, resultsMatchId)}
            accessibilityRole="button"
            accessibilityLabel="Show results of your last battle"
          >
            <Trophy size={20} color={ICON_COLORS.white} strokeWidth={2.25} />
            <Text className="text-white font-black text-base">Show Results</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <>
      {/* Offline it looks disabled but stays tappable, so tapping explains why instead of doing nothing. */}
      <TouchableOpacity
        className={`absolute bottom-6 self-center w-14 h-14 rounded-full justify-center items-center shadow-lg ${
          isWrappingUp || !isOnline ? "bg-slate-300 shadow-black/10" : "bg-primary shadow-primary/40"
        }`}
        activeOpacity={0.85}
        disabled={isWrappingUp}
        onPress={() => (isOnline ? setModalVisible(true) : showOfflineToast(OFFLINE_COPY.battle))}
        accessibilityRole="button"
        accessibilityLabel={isOnline ? "Find a battle" : "Find a battle, unavailable offline"}
      >
        {!isOnline ? (
          <CloudOff size={24} color={ICON_COLORS.white} strokeWidth={2.25} />
        ) : isWrappingUp ? (
          <ActivityIndicator size="small" color={ICON_COLORS.white} />
        ) : (
          <Globe size={26} color={ICON_COLORS.white} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isWrappingUp && isOnline && (
        <View className="absolute bottom-24 self-center bg-slate-800 px-3 py-2 rounded-xl max-w-[200px]">
          <Text className="text-white text-[11px] font-semibold text-center">
            Finishing up your last battle…
          </Text>
        </View>
      )}
      </>
      )}

      <BattleSubjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onFindMatch={handleFindMatch}
      />
    </View>
  );
}
