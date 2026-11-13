import { api } from "./api";
import type { MonthConditions, ParcelImpacts, ParcelReport, ParcelVegetation, YearComparison } from "../types/conditions";

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

  /** Onglet Végétation : images du mois, indices interprétés, climat entre deux images */
  vegetation: (parcelId: number, month: string): Promise<ParcelVegetation> =>
    api.get<ParcelVegetation>(`/api/parcels/${parcelId}/vegetation?month=${month}`),

  /** Onglet Rapports : le rapport mensuel d'une parcelle */
  report: (parcelId: number, month: string): Promise<ParcelReport> =>
    api.get<ParcelReport>(`/api/parcels/${parcelId}/report?month=${month}`),

  /** Le même rapport, en PDF */
  reportPdf: (parcelId: number, month: string) => api.download(`/api/parcels/${parcelId}/report.pdf?month=${month}`),
};