import axiosInstance from "@/providers/axios";
import { ChemicalType } from "@/types";

export type ChemicalFilters = {
  search?: string;
  category?: string;
  state?: string;
};

export const fetchChemicals = async (filters: ChemicalFilters = {}): Promise<ChemicalType[]> => {
  const response = await axiosInstance.get("/api/chemicals", { params: filters });
  return response.data.data;
};

export const fetchChemicalById = async (id: string): Promise<ChemicalType> => {
  const response = await axiosInstance.get(`/api/chemicals/${id}`);
  return response.data.data;
};
