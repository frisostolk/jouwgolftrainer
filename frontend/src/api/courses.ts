import api from "./client";
import type { CourseTemplate, CourseTemplateSummary, CourseHoleBunker, CourseHoleHazard, HazardType } from "../types";

export interface CourseHoleUpdate {
  par?: number;
  distance_yards?: number | null;
  stroke_index?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  green_front_latitude?: number | null;
  green_front_longitude?: number | null;
  green_middle_latitude?: number | null;
  green_middle_longitude?: number | null;
  green_back_latitude?: number | null;
  green_back_longitude?: number | null;
}

export interface BunkerCreate {
  label?: string | null;
  front_latitude: number;
  front_longitude: number;
  back_latitude: number;
  back_longitude: number;
}

export interface HazardCreate {
  hazard_type: HazardType;
  label?: string | null;
  latitude: number;
  longitude: number;
  radius_meters?: number | null;
}

export const coursesApi = {
  list: () => api.get<CourseTemplateSummary[]>("/courses").then((r) => r.data),
  get: (id: number) => api.get<CourseTemplate>(`/courses/${id}`).then((r) => r.data),
  create: (name: string, total_holes: number) =>
    api.post<CourseTemplate>("/courses", { name, total_holes }).then((r) => r.data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  updateHole: (courseId: number, holeNumber: number, data: CourseHoleUpdate) =>
    api.put(`/courses/${courseId}/holes/${holeNumber}`, data).then((r) => r.data),
  addBunker: (courseId: number, holeNumber: number, data: BunkerCreate) =>
    api.post<CourseHoleBunker>(`/courses/${courseId}/holes/${holeNumber}/bunkers`, data).then((r) => r.data),
  deleteBunker: (courseId: number, holeNumber: number, bunkerId: number) =>
    api.delete(`/courses/${courseId}/holes/${holeNumber}/bunkers/${bunkerId}`),
  addHazard: (courseId: number, holeNumber: number, data: HazardCreate) =>
    api.post<CourseHoleHazard>(`/courses/${courseId}/holes/${holeNumber}/hazards`, data).then((r) => r.data),
  deleteHazard: (courseId: number, holeNumber: number, hazardId: number) =>
    api.delete(`/courses/${courseId}/holes/${holeNumber}/hazards/${hazardId}`),
  lookup: (name: string) =>
    api.get<CourseTemplate>(`/courses/lookup`, { params: { name } }).then((r) => r.data),
};
