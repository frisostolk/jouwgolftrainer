import api from "./client";
import type { Exercise, TrainingSession } from "../types";

export interface LogExercisePayload {
  notes?: string;
  score?: number;
  sets?: number;
  reps?: number;
  duration_minutes?: number;
  scoring_data?: Record<string, number>;
}

export const exercisesApi = {
  list: (params?: { category?: string; difficulty?: string; library?: string }) =>
    api.get<Exercise[]>("/exercises", { params }).then((r) => r.data),

  get: (id: number) => api.get<Exercise>(`/exercises/${id}`).then((r) => r.data),

  log: (id: number, data: LogExercisePayload = {}) =>
    api.post<TrainingSession>(`/exercises/${id}/log`, data).then((r) => r.data),

  create: (data: Partial<Exercise>) =>
    api.post<Exercise>("/exercises", data).then((r) => r.data),

  update: (id: number, data: Partial<Exercise>) =>
    api.patch<Exercise>(`/exercises/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/exercises/${id}`),
};
