import api from "./client";
import type { Connection, ExerciseAssignment } from "../types";

export const connectionsApi = {
  list: () => api.get<Connection[]>("/connections").then((r) => r.data),

  invite: (player_email: string, message?: string) =>
    api.post<Connection>("/connections/invite", { player_email, message: message ?? "" }).then((r) => r.data),

  respond: (id: number, status: "accepted" | "declined") =>
    api.patch<Connection>(`/connections/${id}/respond`, { status }).then((r) => r.data),

  remove: (id: number) => api.delete(`/connections/${id}`),

  assignExercise: (exercise_id: number, player_id: number, message?: string) =>
    api.post<ExerciseAssignment>(`/connections/assign`, { player_id, message: message ?? "" }, { params: { exercise_id } }).then((r) => r.data),

  getAssignments: () => api.get<ExerciseAssignment[]>("/connections/assignments").then((r) => r.data),

  getPlayerSessions: (player_id: number) =>
    api.get(`/coach/players/${player_id}/sessions`).then((r) => r.data),

  getPlayerStats: (player_id: number) =>
    api.get(`/coach/players/${player_id}/stats`).then((r) => r.data),
};
