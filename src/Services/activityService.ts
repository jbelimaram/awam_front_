import { api } from "./api";
import type { Activity, ActivityCreatePayload, ActivityUpdatePayload } from "../types/activity";

// api/routes/activities.py, monté sous /api
export const activityService = {
  listByParcel: (parcelId: number): Promise<Activity[]> =>
    api.get<Activity[]>(`/api/parcels/${parcelId}/activities`),

  create: (payload: ActivityCreatePayload): Promise<Activity> =>
    api.post<Activity>("/api/activities", payload),

  update: (id: number, payload: ActivityUpdatePayload): Promise<Activity> =>
    api.put<Activity>(`/api/activities/${id}`, payload),

  remove: (id: number): Promise<void> => api.delete<void>(`/api/activities/${id}`),
};