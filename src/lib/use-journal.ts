import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadDay, updateDay, type DayEntry } from "./journal";

const key = (date: string) => ["journal", date] as const;

export function useDay(date: string) {
  return useQuery({
    queryKey: key(date),
    queryFn: () => loadDay(date),
    staleTime: 1000,
  });
}

export function useUpdateDay(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<DayEntry>) => updateDay(date, patch),
    onSuccess: (data) => qc.setQueryData(key(date), data),
  });
}
