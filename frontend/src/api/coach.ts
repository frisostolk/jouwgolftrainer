import api from "./client";
import type { CoachNote, User } from "../types";

export const coachApi = {
  getPlayers: () => api.get<User[]>("/coach/players").then((r) => r.data),

  getNotes: (playerId?: number) =>
    api.get<CoachNote[]>("/coach/notes", { params: playerId ? { player_id: playerId } : {} }).then((r) => r.data),

  getMyNotes: () => api.get<CoachNote[]>("/coach/my-notes").then((r) => r.data),

  createNote: (data: {
    player_id: number;
    video_id?: number;
    content: string;
    timestamp_seconds?: number;
    category?: string;
  }) => api.post<CoachNote>("/coach/notes", data).then((r) => r.data),

  updateNote: (id: number, data: Partial<CoachNote>) =>
    api.patch<CoachNote>(`/coach/notes/${id}`, data).then((r) => r.data),

  deleteNote: (id: number) => api.delete(`/coach/notes/${id}`),
};
