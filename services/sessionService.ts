import axiosInstance from "@/providers/axios";
import { getToken } from "./authService";

const authHeader = async () => {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
};

export const startSession = async (experimentId: string) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.post("/sessions/start", { experimentId }, { headers });
  return data.data;
};

export const logAction = async (
  sessionId: string,
  payload: {
    stepId: number;
    actionType: "correct" | "incorrect" | "skipped" | "repeated" | "hint_requested" | "step_started" | "step_completed";
    actionDetail?: string;
    expectedAction?: string;
    timeTaken?: number;
    hintLevel?: number;
    conceptViolated?: string;
  }
) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.post(`/sessions/${sessionId}/action`, payload, { headers });
  return data;
};

export const requestHint = async (sessionId: string, stepId: number) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.post(`/sessions/${sessionId}/hint`, { stepId }, { headers });
  return data.data;
};

export const completeSession = async (sessionId: string) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.post(`/sessions/${sessionId}/complete`, {}, { headers });
  return data.data;
};

export const fetchSessionFeedback = async (sessionId: string) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.get(`/feedback/${sessionId}`, { headers });
  return data.data;
};

export const fetchMyAnalytics = async () => {
  const headers = await authHeader();
  const { data } = await axiosInstance.get("/analytics/me", { headers });
  return data.data;
};
