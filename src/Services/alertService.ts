import { api } from "./api";
import type { Alert } from "../types/alert";

// Correspond à app/api/routes/alerts.py, monté sous /api
export const alertService = {
  /** Alertes de toutes les parcelles de l'utilisateur */
  list: (state: "open" | "closed" | "all" = "open"): Promise<Alert[]> =>
    api.get<Alert[]>(`/api/alerts?state=${state}`),

  /** Historique : alertes créées, mises à jour ou fermées ces derniers jours,
   *  sur toutes les fermes et parcelles */
  recent: (days = 5): Promise<Alert[]> => api.get<Alert[]>(`/api/alerts/recent?days=${days}`),

  /** Nombre d'alertes ouvertes, pour la cloche */
  count: (): Promise<{ open: number }> => api.get<{ open: number }>("/api/alerts/count"),

  /** Ferme une alerte : problème vérifié et traité, ou fausse alerte */
  resolve: (id: number, resolution: "treated" | "false_alarm"): Promise<Alert> =>
    api.patch<Alert>(`/api/alerts/${id}`, { resolution }),
};