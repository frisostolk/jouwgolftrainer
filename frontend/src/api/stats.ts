import api from "./client";
import type { OverallStats } from "../types";

export const statsApi = {
  get: () => api.get<OverallStats>("/stats").then((r) => r.data),
};
