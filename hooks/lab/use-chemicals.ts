import { useQuery } from "@tanstack/react-query";
import { fetchChemicals, ChemicalFilters } from "@/api/lab";

export const useChemicals = (filters: ChemicalFilters = {}) => {
  return useQuery({
    queryKey: ["chemicals", filters],
    queryFn: () => fetchChemicals(filters),
  });
};
