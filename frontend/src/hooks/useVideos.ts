import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { videosApi } from "../api/videos";
import type { Video } from "../types";

export function useVideos() {
  return useQuery({ queryKey: ["videos"], queryFn: videosApi.list });
}

export function useVideo(id: number) {
  return useQuery({
    queryKey: ["videos", id],
    queryFn: () => videosApi.get(id),
    enabled: !!id,
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => videosApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Video> }) =>
      videosApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
