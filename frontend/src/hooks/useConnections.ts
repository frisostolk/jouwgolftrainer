import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionsApi } from "../api/connections";

export function useConnections() {
  return useQuery({ queryKey: ["connections"], queryFn: connectionsApi.list });
}

export function useAssignments() {
  return useQuery({ queryKey: ["assignments"], queryFn: connectionsApi.getAssignments });
}

export function useInvitePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, message }: { email: string; message?: string }) =>
      connectionsApi.invite(email, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useRespondConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "accepted" | "declined" }) =>
      connectionsApi.respond(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => connectionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useAssignExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise_id, player_id, message }: { exercise_id: number; player_id: number; message?: string }) =>
      connectionsApi.assignExercise(exercise_id, player_id, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function usePlayerSessions(player_id: number | null) {
  return useQuery({
    queryKey: ["player-sessions", player_id],
    queryFn: () => connectionsApi.getPlayerSessions(player_id!),
    enabled: !!player_id,
  });
}

export function usePlayerStats(player_id: number | null) {
  return useQuery({
    queryKey: ["player-stats", player_id],
    queryFn: () => connectionsApi.getPlayerStats(player_id!),
    enabled: !!player_id,
  });
}
