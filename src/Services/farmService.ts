import { api } from "./api";
import type { Farm, FarmPayload } from "../types/farm";

// api/routes/farms.py, prefix="/farms", monté sous /api
export const farmService = {
  list: (): Promise<Farm[]> => api.get<Farm[]>("/api/farms"),

  create: (payload: FarmPayload): Promise<Farm> => api.post<Farm>("/api/farms", payload),

  update: (id: number, payload: Partial<FarmPayload>): Promise<Farm> =>
    api.put<Farm>(`/api/farms/${id}`, payload),

  remove: (id: number): Promise<void> => api.delete<void>(`/api/farms/${id}`),
};