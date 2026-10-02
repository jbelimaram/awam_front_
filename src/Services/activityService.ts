import { api } from "./api";
import type { Activity, ActivityCreatePayload, ActivityUpdatePayload } from "../types/activity";

// api/routes/activities.py, monté sous /api
export const activityService = {
  // `days` limite aux N derniers jours calendaires (5 pour l'historique du dashboard).
  // Omis : tout l'historique.
  listByParcel: (parcelId: number, days?: number): Promise<Activity[]> =>
    api.get<Activity[]>(
      `/api/parcels/${parcelId}/activities${days ? `?days=${days}` : ""}`
    ),

  create: (payload: ActivityCreatePayload): Promise<Activity> =>
    api.post<Activity>("/api/activities", payload),

  update: (id: number, payload: ActivityUpdatePayload): Promise<Activity> =>
    api.put<Activity>(`/api/activities/${id}`, payload),

  remove: (id: number): Promise<void> => api.delete<void>(`/api/activities/${id}`),
};