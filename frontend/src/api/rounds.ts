import api from "./client";
import type { Round, RoundSummary, StrokeGained, LieType, Shot } from "../types";

export interface HoleSetup {
  hole_number: number;
  par: number;
  distance_yards?: number;
  stroke_index?: number;
}

export interface CreateRoundPayload {
  course_name: string;
  tee_color?: string;
  total_holes: number;
  handicap?: number;
  holes: HoleSetup[];
}

export interface AddShotPayload {
  lie_type: LieType;
  latitude?: number;
  longitude?: number;
  club?: string;
  is_hole_out?: boolean;
}

export const roundsApi = {
  list: () => api.get<RoundSummary[]>("/rounds").then((r) => r.data),
  get: (id: number) => api.get<Round>(`/rounds/${id}`).then((r) => r.data),
  create: (data: CreateRoundPayload) =>
    api.post<Round>("/rounds", data).then((r) => r.data),
  update: (id: number, data: Partial<{ status: string; notes: string; handicap: number }>) =>
    api.patch<Round>(`/rounds/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/rounds/${id}`),
  addShot: (roundId: number, holeNumber: number, data: AddShotPayload) =>
    api.post<Shot>(`/rounds/${roundId}/holes/${holeNumber}/shots`, data).then((r) => r.data),
  deleteShot: (roundId: number, holeNumber: number, shotId: number) =>
    api.delete(`/rounds/${roundId}/holes/${holeNumber}/shots/${shotId}`),
  getStrokeGained: (roundId: number) =>
    api.get<StrokeGained>(`/rounds/${roundId}/stroke-gained`).then((r) => r.data),
};
