import { useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Crown, User } from "lucide-react-native";
import { SUBJECTS, getSubjectIcon, ICON_COLORS } from "@/constants/quizStyles";
import { getLeagueStyle } from "@/constants/battleStyles";
import { useLeaderboardQuery } from "@/hooks/use-battle";
import { LeaderboardEntry } from "@/types/battleModuleTypes";
import Skeleton from "@/components/Skeleton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PODIUM_RANK_STYLE: Record<1 | 2 | 3, { circle: string; size: number }> = {
  1: { circle: "bg-amber-400",  size: 92 },
  2: { circle: "bg-slate-300",  size: 72 },
  3: { circle: "bg-orange-300", size: 72 },
};

function PodiumSlot({ rank, entry, isMe }: { rank: 1 | 2 | 3; entry?: LeaderboardEntry; isMe: boolean }) {
  // Keeps the slot's width reserved even with < 3 ranked players, so the
  // remaining slot(s) don't collapse and throw the #1 circle off-center.
  if (!entry) return <View style={{ width: 104 }} />;

  const style = PODIUM_RANK_STYLE[rank];
  const league = getLeagueStyle(entry.league);

  return (
    <View className="items-center" style={{ width: 104 }}>
      {rank === 1 && (
        <Crown size={22} color={ICON_COLORS.amber500} fill={ICON_COLORS.amber500} style={{ marginBottom: 4 }} />
      )}
      <View
        className={`rounded-full items-center justify-center ${style.circle} ${isMe ? "border-4 border-primary" : ""}`}
        style={{ width: style.size, height: style.size }}
      >
        <User size={style.size * 0.42} color={ICON_COLORS.white} strokeWidth={1.8} />
      </View>
      <View className="bg-slate-800 rounded-full px-2 py-0.5 -mt-3 border-2 border-white">
        <Text className="text-white text-[10px] font-black">#{rank}</Text>
      </View>
      <Text className="mt-1.5 font-black text-slate-800 text-xs text-center" numberOfLines={1} style={{ width: 96 }}>
        {entry.username ?? "Player"}
      </Text>
      <View className={`mt-1 px-2 py-0.5 rounded-full ${league.bg}`}>
        <Text className={`text-[9px] font-bold ${league.text}`}>{entry.league}</Text>
      </View>
      <Text className="mt-1 font-black text-primary text-sm">{entry.rating}</Text>
    </View>
  );
}

function Podium({ top3, myRank }: { top3: LeaderboardEntry[]; myRank: number | null | undefined }) {
  if (top3.length === 0) return null;
  const [first, second, third] = top3;

  return (
    <View className="flex-row items-end justify-center gap-2 pt-2 pb-7">
      <PodiumSlot rank={2} entry={second} isMe={second?.rank === myRank} />
      <PodiumSlot rank={1} entry={first} isMe={first?.rank === myRank} />
      <PodiumSlot rank={3} entry={third} isMe={third?.rank === myRank} />
    </View>
  );
}

function PodiumSkeleton() {
  return (
    <View className="flex-row items-end justify-center gap-2 pt-2 pb-7">
      {([2, 1, 3] as const).map((rank) => {
        const size = PODIUM_RANK_STYLE[rank].size;
        return (
          <View key={rank} className="items-center" style={{ width: 104 }}>
            <Skeleton width={size} height={size} borderRadius={size / 2} color={ICON_COLORS.primary100} />
            <Skeleton width={72} height={12} style={{ marginTop: 10 }} color={ICON_COLORS.primary100} />
            <Skeleton width={48} height={14} borderRadius={999} style={{ marginTop: 6 }} color={ICON_COLORS.primary100} />
            <Skeleton width={34} height={14} style={{ marginTop: 6 }} color={ICON_COLORS.primary100} />
          </View>
        );
      })}
    </View>
  );
}

function LeaderboardRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-100 bg-white">
      <View className="w-8 items-center">
        <Skeleton width={16} height={14} />
      </View>
      <View className="flex-1 gap-1.5">
        <Skeleton width="55%" height={13} />
        <View className="flex-row items-center gap-1.5">
          <Skeleton width={46} height={14} borderRadius={999} />
          <Skeleton width={50} height={11} />
        </View>
      </View>
      <Skeleton width={32} height={16} />
    </View>
  );
}

function LeaderboardListSkeleton() {
  return (
    <View className="pt-1">
      <PodiumSkeleton />
      {[0, 1, 2, 3, 4].map((i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </View>
  );
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const league = getLeagueStyle(entry.league);
  return (
    <View
      className={`flex-row items-center gap-3 mx-4 mb-2 px-4 py-3 rounded-2xl border ${
        isMe ? "bg-primary-50 border-primary-200" : "bg-white border-slate-100"
      }`}
    >
      <View className="w-8 items-center">
        <Text className={`font-black text-sm ${isMe ? "text-primary-700" : "text-slate-500"}`}>
          #{entry.rank}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-slate-800 font-bold text-sm" numberOfLines={1}>
          {entry.username ?? "Player"}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <View className={`px-2 py-0.5 rounded-full ${league.bg}`}>
            <Text className={`text-[10px] font-bold ${league.text}`}>{entry.league}</Text>
          </View>
          <Text className="text-[11px] text-slate-400">
            {entry.wins}W-{entry.losses}L
          </Text>
        </View>
      </View>
      <Text className="font-black text-slate-800 text-base">{entry.rating}</Text>
    </View>
  );
}

// One full subject's leaderboard (podium + ranked list + pagination + "your
// rank" footer), self-contained so every subject keeps its own pagination
// state and query cache entry — all SUBJECTS.length of these are mounted
// side-by-side inside the horizontal pager below, so swiping between them
// is instant with no per-swipe fetch/loading flash.
function SubjectLeaderboardPage({ subject }: { subject: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useLeaderboardQuery(subject, page);

  const myEntry = data?.entries.find((e) => e.rank === data.my_rank);
  const showMyRankFooter = data?.my_rank != null && !myEntry;

  // The podium always reflects the true top 3 (ranks 1-3), which only ever
  // land on page 1 — the row list below excludes them there so nobody is
  // shown twice, but shows every entry as-is on later pages.
  const top3 = page === 1 ? data?.entries.slice(0, 3) ?? [] : [];
  const rest = page === 1 ? data?.entries.slice(3) ?? [] : data?.entries ?? [];
  const isEmpty = (data?.entries.length ?? 0) === 0;

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1">
      {isLoading ? (
        <LeaderboardListSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <AlertTriangle size={28} color={ICON_COLORS.slate400} strokeWidth={2} />
          <Text className="text-slate-500 text-sm text-center mt-3">
            Couldn&apos;t load the leaderboard. Check your connection and try again.
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
          data={rest}
          keyExtractor={(item) => `${item.user_id}`}
          renderItem={({ item }) => <LeaderboardRow entry={item} isMe={item.rank === data?.my_rank} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={ICON_COLORS.primary500} />
          }
          ListHeaderComponent={<Podium top3={top3} myRank={data?.my_rank} />}
          ListEmptyComponent={
            isEmpty ? (
              <View className="items-center py-16 px-8">
                <Text className="text-slate-400 text-sm text-center">
                  No ranked players yet for {subject}.
                </Text>
              </View>
            ) : null
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

      {showMyRankFooter && data?.my_rank != null && (
        <View className="px-4 pb-4 pt-2 border-t border-slate-100">
          <View className="flex-row items-center gap-3 px-4 py-3 rounded-2xl bg-primary-50 border border-primary-200">
            <View className="w-8 items-center">
              <Text className="font-black text-sm text-primary-700">#{data.my_rank}</Text>
            </View>
            <Text className="flex-1 text-primary-700 font-bold text-sm">You</Text>
            <Text className="font-black text-primary-700 text-base">{data.my_rating}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function BattleLeaderboardScreen() {
  const router = useRouter();
  const [subjectIndex, setSubjectIndex] = useState(0);
  const subject = SUBJECTS[subjectIndex];
  const SubjectIcon = getSubjectIcon(subject);

  // The whole body below the header is this horizontal pager — swiping
  // anywhere on the screen (not just a header strip) pages between
  // subjects, snapping one subject at a time.
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setSubjectIndex(Math.max(0, Math.min(SUBJECTS.length - 1, index)));
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Leaderboard</Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <SubjectIcon size={20} color={ICON_COLORS.primary500} strokeWidth={2.2} />
            <Text className="text-xl font-black text-primary">{subject}</Text>
          </View>
        </View>
        {/* Balances the back button's width so the centered content above is truly centered on screen, not just within the remaining space. */}
        <View className="w-9" />
      </View>

      <View className="flex-row items-center justify-center gap-1.5 mb-1">
        {SUBJECTS.map((s, i) => (
          <View
            key={s}
            className={`rounded-full ${i === subjectIndex ? "bg-primary w-4 h-1.5" : "bg-slate-200 w-1.5 h-1.5"}`}
          />
        ))}
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        className="flex-1"
      >
        {SUBJECTS.map((s) => (
          <SubjectLeaderboardPage key={s} subject={s} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
