import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exercisesApi, type LogExercisePayload } from "../api/exercises";
import type { Exercise } from "../types";

export function useExercises(params?: { category?: string; difficulty?: string; library?: string }) {
  return useQuery({
    queryKey: ["exercises", params],
    queryFn: () => exercisesApi.list(params),
  });
}

export function useExercise(id: number) {
  return useQuery({
    queryKey: ["exercises", id],
    queryFn: () => exercisesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Exercise>) => exercisesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Exercise> }) =>
      exercisesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useLogExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: LogExercisePayload }) =>
      exercisesApi.log(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => exercisesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}
