import api from "./client";
import type { CourseTemplate, CourseTemplateSummary } from "../types";

export interface CourseHoleUpdate {
  par?: number;
  distance_yards?: number | null;
  stroke_index?: number | null;
  tee_latitude?: number | null;
  tee_longitude?: number | null;
}

export const coursesApi = {
  list: () => api.get<CourseTemplateSummary[]>("/courses").then((r) => r.data),
  get: (id: number) => api.get<CourseTemplate>(`/courses/${id}`).then((r) => r.data),
  create: (name: string, total_holes: number) =>
    api.post<CourseTemplate>("/courses", { name, total_holes }).then((r) => r.data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  updateHole: (courseId: number, holeNumber: number, data: CourseHoleUpdate) =>
    api.put<{ id: number; hole_number: number; par: number; distance_yards: number | null; stroke_index: number | null; tee_latitude: number | null; tee_longitude: number | null }>(
      `/courses/${courseId}/holes/${holeNumber}`,
      data
    ).then((r) => r.data),
  lookup: (name: string) =>
    api.get<CourseTemplate>(`/courses/lookup`, { params: { name } }).then((r) => r.data),
};
