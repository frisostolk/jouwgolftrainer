import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../api/stats";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: statsApi.get,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExerciseProgress() {
  return useQuery({
    queryKey: ["exercise-progress"],
    queryFn: statsApi.exerciseProgress,
    staleTime: 1000 * 60 * 5,
  });
}
