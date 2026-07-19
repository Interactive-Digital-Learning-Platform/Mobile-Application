import axiosInstance from "@/providers/axios";
import { PracticalDetailType, PracticalSummaryType } from "@/types";

export const fetchExperiments = async (subject: string): Promise<PracticalSummaryType[]> => {
  const response = await axiosInstance.get("/api/experiments", { params: { subject } });
  return response.data.data;
};

export const fetchExperimentById = async (id: string): Promise<PracticalDetailType> => {
  const response = await axiosInstance.get(`/api/experiments/${id}`);
  return response.data.data;
};
