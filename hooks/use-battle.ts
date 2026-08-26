import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelQueue,
  fetchBattleHistory,
  fetchBattleProfile,
  fetchLeaderboard,
  fetchQueueStatus,
  forfeitMatch,
  joinQueue,
} from "@/api/battleAPI";
import { QueueStatusResponse } from "@/types/battleModuleTypes";

export const battleKeys = {
  all:        ["battle"] as const,
  leaderboard: (subject: string, page: number) => ["battle", "leaderboard", subject, page] as const,
  profile:    ["battle", "profile"] as const,
  queueStatus: ["battle", "queue", "status"] as const,
  history:    (subject: string | null, page: number) => ["battle", "history", subject, page] as const,
};

export function useLeaderboardQuery(subject: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: battleKeys.leaderboard(subject, page),
    queryFn: () => fetchLeaderboard(subject, page, pageSize),
    enabled: subject.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useBattleProfileQuery() {
  return useQuery({
    queryKey: battleKeys.profile,
    queryFn: fetchBattleProfile,
    staleTime: 30 * 1000,
  });
}

export function useBattleHistoryQuery(subject: string | null, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: battleKeys.history(subject, page),
    queryFn: () => fetchBattleHistory(subject, page, pageSize),
    staleTime: 30 * 1000,
  });
}

export function useJoinQueueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subject: string) => joinQueue(subject),
    onSuccess: (data) => {
      queryClient.setQueryData<QueueStatusResponse>(battleKeys.queueStatus, data);
    },
  });
}

export function useCancelQueueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelQueue(),
    onSuccess: (data) => {
      queryClient.setQueryData<QueueStatusResponse>(battleKeys.queueStatus, data);
    },
  });
}

// REST, not the match WS, is the reliable way to back out of a still-
// "waiting" (matched but not yet both-ready) match on the queue screen: a
// plain request/response round-trips before the caller navigates away,
// unlike firing a WS message and immediately unmounting (which can close
// the socket before the frame is even confirmed sent, silently dropping the
// cancellation and leaving both players' server-side state stuck on the
// dead match).
export function useForfeitMatchMutation() {
  return useMutation({
    mutationFn: (matchId: number) => forfeitMatch(matchId),
  });
}

// Polling fallback for the pre-match "searching" stage — no WS exists until
// a match_id is assigned, mirroring the backend's own REST-polling design
// for this stage (Phase 2).
export function useQueueStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: battleKeys.queueStatus,
    queryFn: fetchQueueStatus,
    enabled,
    refetchInterval: (query) => (query.state.data?.status === "searching" ? 2000 : false),
    staleTime: 0,
  });
}
