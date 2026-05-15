import api from "./client";
import type { AuthResponse, User } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),

  register: (email: string, name: string, password: string, role?: string) =>
    api.post<AuthResponse>("/auth/register", { email, name, password, role }).then((r) => r.data),

  me: () => api.get<User>("/auth/me").then((r) => r.data),

  updateMe: (data: Partial<User>) =>
    api.patch<User>("/auth/me", data).then((r) => r.data),
};
