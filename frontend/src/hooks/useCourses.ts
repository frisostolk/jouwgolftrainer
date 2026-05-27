import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi, type CourseHoleUpdate, type BunkerCreate, type HazardCreate } from "../api/courses";

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

export function useCourseLookup(name: string | undefined) {
  return useQuery({
    queryKey: ["courses", "lookup", name],
    queryFn: () => coursesApi.lookup(name!),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
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

export function useAddBunker(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, data }: { holeNumber: number; data: BunkerCreate }) =>
      coursesApi.addBunker(courseId, holeNumber, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId] }),
  });
}

export function useDeleteBunker(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, bunkerId }: { holeNumber: number; bunkerId: number }) =>
      coursesApi.deleteBunker(courseId, holeNumber, bunkerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId] }),
  });
}

export function useAddHazard(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, data }: { holeNumber: number; data: HazardCreate }) =>
      coursesApi.addHazard(courseId, holeNumber, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId] }),
  });
}

export function useDeleteHazard(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, hazardId }: { holeNumber: number; hazardId: number }) =>
      coursesApi.deleteHazard(courseId, holeNumber, hazardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses", courseId] }),
  });
}
