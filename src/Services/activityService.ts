import { api } from "./api";
import type {
  Activity,
  ActivityCompletePayload,
  ActivityCreatePayload,
  ActivityUpdatePayload,
} from "../types/activity";

// api/routes/activities.py, monté sous /api
export const activityService = {
  /**
   * Historique : tâches FAITES de la parcelle. `days` limite aux N derniers
   * jours calendaires (5 pour l'historique du dashboard) ; omis : tout.
   */
  listByParcel: (parcelId: number, days?: number): Promise<Activity[]> =>
    api.get<Activity[]>(
      `/api/parcels/${parcelId}/activities${days ? `?days=${days}` : ""}`
    ),

  /** Planification d'une parcelle entre deux dates (AAAA-MM-JJ) */
  planning: (parcelId: number, start: string, end: string): Promise<Activity[]> =>
    api.get<Activity[]>(`/api/parcels/${parcelId}/planning?start=${start}&end=${end}`),

  /** Tâches en cours d'un employé : à réaliser et à entretenir */
  employeeTasks: (employeeId: number): Promise<Activity[]> =>
    api.get<Activity[]>(`/api/employees/${employeeId}/tasks`),

  create: (payload: ActivityCreatePayload): Promise<Activity> =>
    api.post<Activity>("/api/activities", payload),

  update: (id: number, payload: ActivityUpdatePayload): Promise<Activity> =>
    api.put<Activity>(`/api/activities/${id}`, payload),

  /** Marque une tâche comme faite (ou à entretenir) */
  complete: (id: number, payload: ActivityCompletePayload): Promise<Activity> =>
    api.post<Activity>(`/api/activities/${id}/complete`, payload),

  /** Supprime la tâche, et ses tâches attachées */
  remove: (id: number): Promise<void> => api.delete<void>(`/api/activities/${id}`),
};