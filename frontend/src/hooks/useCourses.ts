import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi, type CourseHoleUpdate } from "../api/courses";

export function useCourses() {
  return useQuery({ queryKey: ["courses"], queryFn: coursesApi.list });
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: () => coursesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, total_holes }: { name: string; total_holes: number }) =>
      coursesApi.create(name, total_holes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourseHole(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, data }: { holeNumber: number; data: CourseHoleUpdate }) =>
      coursesApi.updateHole(courseId, holeNumber, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId] }),
  });
}
