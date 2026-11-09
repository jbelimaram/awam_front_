import { api } from "./api";
import type { MonthConditions, ParcelImpacts, YearComparison } from "../types/conditions";

// api/routes/conditions.py, monté sous /api
export const conditionsService = {
  /** Les mois qui ont de la météo, du plus récent au plus ancien (« AAAA-MM ») */
  months: (farmId: number): Promise<string[]> => api.get<string[]>(`/api/farms/${farmId}/conditions/months`),

  /** Les 9 paramètres d'un mois, leur normale 2020-2025 et leur écart */
  month: (farmId: number, month?: string): Promise<MonthConditions> =>
    api.get<MonthConditions>(`/api/farms/${farmId}/conditions${month ? `?month=${month}` : ""}`),

  /** Le même mois (1 à 12) pour chaque année depuis 2020, et sa normale */
  years: (farmId: number, month: number): Promise<YearComparison> =>
    api.get<YearComparison>(`/api/farms/${farmId}/conditions/years?month=${month}`),

  /** Onglet Impacts : stades et climat comparé à la normale, et eau, pour chaque culture */
  impacts: (parcelId: number, month: string): Promise<ParcelImpacts> =>
    api.get<ParcelImpacts>(`/api/parcels/${parcelId}/impacts?month=${month}`),
};