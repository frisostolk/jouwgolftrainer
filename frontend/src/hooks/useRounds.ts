import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roundsApi, type CreateRoundPayload, type AddShotPayload } from "../api/rounds";

export function useRounds() {
  return useQuery({ queryKey: ["rounds"], queryFn: roundsApi.list });
}

export function useRound(id: number) {
  return useQuery({
    queryKey: ["rounds", id],
    queryFn: () => roundsApi.get(id),
    enabled: !!id,
    refetchInterval: 0,
  });
}

export function useCreateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoundPayload) => roundsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds"] }),
  });
}

export function useUpdateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof roundsApi.update>[1] }) =>
      roundsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
      qc.invalidateQueries({ queryKey: ["rounds", id] });
    },
  });
}

export function useDeleteRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => roundsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds"] }),
  });
}

export function useAddShot(roundId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, data }: { holeNumber: number; data: AddShotPayload }) =>
      roundsApi.addShot(roundId, holeNumber, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds", roundId] }),
  });
}

export function useDeleteShot(roundId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holeNumber, shotId }: { holeNumber: number; shotId: number }) =>
      roundsApi.deleteShot(roundId, holeNumber, shotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds", roundId] }),
  });
}

export function useStrokeGained(roundId: number, enabled = true) {
  return useQuery({
    queryKey: ["rounds", roundId, "sg"],
    queryFn: () => roundsApi.getStrokeGained(roundId),
    enabled: enabled && !!roundId,
  });
}
