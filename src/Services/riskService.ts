import { api } from "./api";
import type { AlertRiskFactors } from "../types/risk";

// Correspond à app/api/routes/alerts.py, monté sous /api
export const riskService = {
  /** Les alertes ouvertes pendant le mois, avec leur fiche des facteurs de risque */
  list: (month: string, farmId?: number | null, parcelId?: number | null): Promise<AlertRiskFactors[]> => {
    const params = new URLSearchParams({ month });
    if (farmId) params.set("farm_id", String(farmId));
    if (parcelId) params.set("parcel_id", String(parcelId));
    return api.get<AlertRiskFactors[]>(`/api/risk-factors?${params.toString()}`);
  },

  /** La fiche des facteurs de risque d'une alerte */
  forAlert: (alertId: number): Promise<AlertRiskFactors> => api.get<AlertRiskFactors>(`/api/alerts/${alertId}/factors`),
};