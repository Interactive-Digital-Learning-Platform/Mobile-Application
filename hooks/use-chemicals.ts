import { useQuery } from "@tanstack/react-query";
import { fetchChemicals, ChemicalFilters } from "@/services/chemicalService";

export const useChemicals = (filters: ChemicalFilters = {}) => {
  return useQuery({
    queryKey: ["chemicals", filters],
    queryFn: () => fetchChemicals(filters),
  });
};
