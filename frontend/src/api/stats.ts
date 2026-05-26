import api from "./client";
import type { OverallStats, ExerciseProgressEntry } from "../types";

export const statsApi = {
  get: () => api.get<OverallStats>("/stats").then((r) => r.data),
  exerciseProgress: () =>
    api.get<ExerciseProgressEntry[]>("/stats/exercise-progress").then((r) => r.data),
};
