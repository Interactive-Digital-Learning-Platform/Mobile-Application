import { battleClient } from "@/api/apiClients";
import {
  BattleHistoryResponse,
  BattleMatchStateResponse,
  CompetitiveProfileResponse,
  LeaderboardResponse,
  QueueStatusResponse,
  SubmitBattleAnswerRequest,
  SubmitBattleAnswerResponse,
} from "@/types/battleModuleTypes";

export async function fetchLeaderboard(
  subject: string,
  page = 1,
  pageSize = 20
): Promise<LeaderboardResponse> {
  const { data } = await battleClient.get<LeaderboardResponse>("/battle/leaderboard", {
    params: { subject, page, page_size: pageSize },
  });
  return data;
}

export async function fetchBattleProfile(): Promise<CompetitiveProfileResponse> {
  const { data } = await battleClient.get<CompetitiveProfileResponse>("/battle/profile");
  return data;
}

export async function fetchBattleHistory(
  subject: string | null,
  page = 1,
  pageSize = 20
): Promise<BattleHistoryResponse> {
  const { data } = await battleClient.get<BattleHistoryResponse>("/battle/history", {
    params: { subject: subject ?? undefined, page, page_size: pageSize },
  });
  return data;
}

export async function joinQueue(subject: string): Promise<QueueStatusResponse> {
  const { data } = await battleClient.post<QueueStatusResponse>("/battle/queue/join", {
    subject,
  });
  return data;
}

export async function cancelQueue(): Promise<QueueStatusResponse> {
  const { data } = await battleClient.post<QueueStatusResponse>("/battle/queue/cancel");
  return data;
}

export async function fetchQueueStatus(): Promise<QueueStatusResponse> {
  const { data } = await battleClient.get<QueueStatusResponse>("/battle/queue/status");
  return data;
}

export async function fetchMatchState(matchId: number): Promise<BattleMatchStateResponse> {
  const { data } = await battleClient.get<BattleMatchStateResponse>(
    `/battle/match/${matchId}/state`
  );
  return data;
}

export async function submitBattleAnswer(
  matchId: number,
  payload: SubmitBattleAnswerRequest
): Promise<SubmitBattleAnswerResponse> {
  const { data } = await battleClient.post<SubmitBattleAnswerResponse>(
    `/battle/match/${matchId}/answer`,
    payload
  );
  return data;
}

export async function markReady(matchId: number): Promise<BattleMatchStateResponse> {
  const { data } = await battleClient.post<BattleMatchStateResponse>(
    `/battle/match/${matchId}/ready`
  );
  return data;
}

export async function forfeitMatch(matchId: number): Promise<BattleMatchStateResponse> {
  const { data } = await battleClient.post<BattleMatchStateResponse>(
    `/battle/match/${matchId}/forfeit`
  );
  return data;
}
