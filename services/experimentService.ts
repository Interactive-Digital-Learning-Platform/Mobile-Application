import axiosInstance from "@/providers/axios";
import { getToken } from "./authService";

const authHeader = async () => {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
};

export const fetchExperiments = async (params?: {
  subject?: string;
  grade?: number;
  difficulty?: string;
}) => {
  try {
    const headers = await authHeader();
    console.log(`[fetchExperiments] Fetching from ${axiosInstance.defaults.baseURL}/experiments with params:`, params);
    const { data } = await axiosInstance.get("/experiments", { params, headers });
    return data.data;
  } catch (error: any) {
    console.error("[fetchExperiments] Error:", error.message);
    if (error.response) {
      console.error("[fetchExperiments] Response data:", error.response.data);
    }
    throw error;
  }
};

export const fetchExperimentById = async (id: string) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.get(`/experiments/${id}`, { headers });
  return data.data;
};

export const fetchExperimentsBySubject = async (subject: string) => {
  const headers = await authHeader();
  const { data } = await axiosInstance.get(`/experiments/subject/${subject}`, { headers });
  return data.data;
};
