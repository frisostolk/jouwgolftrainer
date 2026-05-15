import api from "./client";
import type { Video, UploadUrlResponse } from "../types";

export const videosApi = {
  list: () => api.get<Video[]>("/videos").then((r) => r.data),

  get: (id: number) => api.get<Video>(`/videos/${id}`).then((r) => r.data),

  getUploadUrl: (contentType: string = "video/mp4") =>
    api
      .post<UploadUrlResponse>("/videos/upload-url", null, { params: { content_type: contentType } })
      .then((r) => r.data),

  registerAfterUpload: (data: {
    title: string;
    description?: string;
    swing_type?: string;
    club?: string;
    session_id?: number;
    storage_key: string;
    file_size_bytes?: number;
  }) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
    return api.post<Video>("/videos", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },

  uploadDirect: (
    file: File,
    meta: { title: string; description?: string; swing_type?: string; club?: string; session_id?: number }
  ) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(meta).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
    return api
      .post<Video>("/videos/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },

  update: (id: number, data: Partial<Video>) =>
    api.patch<Video>(`/videos/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/videos/${id}`),
};
