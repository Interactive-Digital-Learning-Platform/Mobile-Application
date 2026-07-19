import axiosInstance from "@/providers/axios";
import { TutorResponseType } from "@/types";

export const askLabTutor = async (labRunId: string, question: string): Promise<TutorResponseType> => {
  const response = await axiosInstance.post(`/api/lab/runs/${labRunId}/tutor`, { question });
  return response.data.data;
};
