import api from "./client";
import type { CourseTemplate, CourseTemplateSummary, CourseHoleBunker } from "../types";

export interface CourseHoleUpdate {
  par?: number;
  distance_yards?: number | null;
  stroke_index?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
  green_latitude?: number | null;
  green_longitude?: number | null;
}

export interface BunkerCreate {
  label?: string | null;
  front_latitude: number;
  front_longitude: number;
  back_latitude: number;
  back_longitude: number;
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
  lookup: (name: string) =>
    api.get<CourseTemplate>(`/courses/lookup`, { params: { name } }).then((r) => r.data),
};
