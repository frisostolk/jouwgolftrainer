import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi, type CreateSessionPayload, type UpdateExercisePayload, type FinishSessionPayload } from "../api/sessions";

export function useSessions() {
  return useQuery({ queryKey: ["sessions"], queryFn: sessionsApi.list });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: () => sessionsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionPayload) => sessionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSessionPayload> }) =>
      sessionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["sessions", id] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sessionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateSessionExercise(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exerciseId, data }: { exerciseId: number; data: UpdateExercisePayload }) =>
      sessionsApi.updateExercise(sessionId, exerciseId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", sessionId] }),
  });
}

export function useFinishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FinishSessionPayload }) =>
      sessionsApi.finish(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["sessions", id] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
