import { api } from "./api";
import type { MonthConditions } from "../types/conditions";

// api/routes/conditions.py, monté sous /api
export const conditionsService = {
  /** Les mois qui ont de la météo, du plus récent au plus ancien (« AAAA-MM ») */
  months: (farmId: number): Promise<string[]> => api.get<string[]>(`/api/farms/${farmId}/conditions/months`),

  /** Les 9 paramètres d'un mois, leur normale 2020-2025 et leur écart */
  month: (farmId: number, month?: string): Promise<MonthConditions> =>
    api.get<MonthConditions>(`/api/farms/${farmId}/conditions${month ? `?month=${month}` : ""}`),
};