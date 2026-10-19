import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { CloudOff } from "lucide-react-native";
import { useAnalyticsMeQuery } from "@/hooks/use-quiz";
import { useIsOnline } from "@/hooks/use-online-status";
import { ICON_COLORS } from "@/constants/quizStyles";

// Only call out a background sync when the stats on screen are noticeably old (e.g. restored from the device
// cache); the routine refetch on every visit stays silent.
const SHOW_UPDATING_AFTER_MS = 5 * 60 * 1000;
const TICK_MS = 60 * 1000;

function timeAgo(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Small status line under the Profile header telling the student whether the numbers are live:
// offline -> "Offline · stats from 2h ago", syncing old data -> "Updating…", sync failed -> "Couldn't sync · …".
// Hidden when the stats are fresh, and when there's nothing cached (the page shows its own empty / error state).
export default function SyncStatusPill() {
  const isOnline = useIsOnline();
  const { data, dataUpdatedAt, isFetching, isError } = useAnalyticsMeQuery();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setNow(Date.now()), [dataUpdatedAt, isFetching, isOnline]);

  if (!data) return null;
  const age = now - dataUpdatedAt;
  const ago = timeAgo(age);

  let label: string;
  let syncing = false;
  if (!isOnline) label = `Offline · stats from ${ago}`;
  else if (isFetching && age > SHOW_UPDATING_AFTER_MS) {
    label = "Updating your stats…";
    syncing = true;
  } else if (isError && !isFetching) label = `Couldn't sync · stats from ${ago}`;
  else return null;

  return (
    <View className="flex-row self-center items-center gap-1.5 bg-white rounded-full px-3 py-1.5 mb-2 shadow-sm shadow-black/5"
      accessibilityLiveRegion="polite" accessibilityLabel={label}>
      {syncing
        ? <ActivityIndicator size="small" color={ICON_COLORS.primary500} style={{ transform: [{ scale: 0.7 }] }} />
        : <CloudOff size={13} color={ICON_COLORS.slate500} strokeWidth={2.25} />}
      <Text className="text-slate-500 text-[11px] font-semibold">{label}</Text>
    </View>
  );
}
