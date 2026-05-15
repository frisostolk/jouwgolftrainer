import api from "./client";
import type { TrainingSession } from "../types";

export interface CreateSessionPayload {
  title: string;
  notes?: string;
  duration_minutes?: number;
  location?: string;
  weather?: string;
  mood?: number;
  overall_score?: number;
  status?: "planned" | "completed";
  exercises?: {
    exercise_id: number;
    sets?: number;
    reps?: number;
    score?: number;
    notes?: string;
    completed?: boolean;
  }[];
}

export interface UpdateExercisePayload {
  completed?: boolean;
  score?: number;
  notes?: string;
  scoring_data?: Record<string, number>;
}

export interface FinishSessionPayload {
  duration_minutes?: number;
  overall_score?: number;
  mood?: number;
  notes?: string;
}

export const sessionsApi = {
  list: () => api.get<TrainingSession[]>("/sessions").then((r) => r.data),

  get: (id: number) => api.get<TrainingSession>(`/sessions/${id}`).then((r) => r.data),

  create: (data: CreateSessionPayload) =>
    api.post<TrainingSession>("/sessions", data).then((r) => r.data),

  update: (id: number, data: Partial<CreateSessionPayload>) =>
    api.patch<TrainingSession>(`/sessions/${id}`, data).then((r) => r.data),

  updateExercise: (sessionId: number, exerciseId: number, data: UpdateExercisePayload) =>
    api.patch(`/sessions/${sessionId}/exercises/${exerciseId}`, data).then((r) => r.data),

  finish: (id: number, data: FinishSessionPayload) =>
    api.post<TrainingSession>(`/sessions/${id}/finish`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/sessions/${id}`),
};
