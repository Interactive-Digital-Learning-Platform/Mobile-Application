import { Text, TouchableOpacity, View } from "react-native";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAnalyticsMeQuery } from "@/hooks/use-quiz";
import Skeleton from "@/components/Skeleton";

function StatCell({
  value,
  label,
  bordered,
}: {
  value: string | number;
  label: string;
  bordered?: "left" | "right";
}) {
  return (
    <View
      className={`w-[33%] h-[80%] flex justify-center items-center flex-col ${
        bordered === "right" ? "border-r-[1px] border-primary" : ""
      }${bordered === "left" ? "border-l-[1px] border-primary" : ""}`}
    >
      <Text className="text-3xl font-bold color-primary">{value}</Text>
      <Text className="text-orange-500 text-xs">{label}</Text>
    </View>
  );
}

function StatCellSkeleton({ bordered }: { bordered?: "left" | "right" }) {
  return (
    <View
      className={`w-[33%] h-[80%] flex justify-center items-center flex-col gap-2 ${
        bordered === "right" ? "border-r-[1px] border-primary" : ""
      }${bordered === "left" ? "border-l-[1px] border-primary" : ""}`}
    >
      <Skeleton width={36} height={22} color="#FFE4CF" />
      <Skeleton width={48} height={10} color="#FFE4CF" />
    </View>
  );
}

export default function StatisticButton() {
  const { data: analytics, isLoading, refetch } = useAnalyticsMeQuery();

  // Belt-and-suspenders: the generate/submit/delete mutations already
  // invalidate this query, but refetching on focus too (same pattern as
  // PracticeList) keeps this in sync even if a screen is reached some other
  // way, without requiring an app restart.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const sessions  = analytics?.total_sessions ?? 0;
  const accuracy  = analytics ? `${Math.round(analytics.overall_accuracy)}%` : "—";
  const avgTime   = analytics
    ? `${analytics.overall_avg_response_time.toFixed(1)}s`
    : "—";

  return (
    <TouchableOpacity
      className="w-full h-[60%] justify-center items-center flex"
      activeOpacity={0.85}
    >
      <View className="w-full h-full bg-white flex-row justify-between items-center rounded-3xl px-1">
        {isLoading ? (
          <>
            <StatCellSkeleton bordered="right" />
            <StatCellSkeleton />
            <StatCellSkeleton bordered="left" />
          </>
        ) : (
          <>
            <StatCell value={sessions}  label="Sessions"  bordered="right" />
            <StatCell value={accuracy}  label="Accuracy" />
            <StatCell value={avgTime}   label="Avg / Q"   bordered="left" />
          </>
        )}
        
      </View>
    </TouchableOpacity>
  );
}
