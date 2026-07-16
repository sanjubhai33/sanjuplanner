import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loadTasks,
  upsertTask,
  deleteTask,
  toggleTask,
  type Task,
} from "./tasks";

const KEY = ["tasks"] as const;

export function useTasks() {
  return useQuery({
    queryKey: KEY,
    queryFn: loadTasks,
    staleTime: 1000,
  });
}

export function useUpsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => upsertTask(task),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleTask(id),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
