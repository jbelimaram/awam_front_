import { api } from "./api";
import type { ParcelAnalysis, ParcelAnalysisPayload } from "../types/parcelAnalysis";

// api/routes/parcel_analyses.py, monté sous /api
export const parcelAnalysisService = {
  /** Analyses d'une parcelle, de la plus récente à la plus ancienne. */
  listByParcel: (parcelId: number): Promise<ParcelAnalysis[]> =>
    api.get<ParcelAnalysis[]>(`/api/parcels/${parcelId}/analyses`),

  create: (parcelId: number, payload: ParcelAnalysisPayload): Promise<ParcelAnalysis> =>
    api.post<ParcelAnalysis>(`/api/parcels/${parcelId}/analyses`, payload),

  update: (analysisId: number, payload: ParcelAnalysisPayload): Promise<ParcelAnalysis> =>
    api.put<ParcelAnalysis>(`/api/analyses/${analysisId}`, payload),

  remove: (analysisId: number): Promise<void> =>
    api.delete<void>(`/api/analyses/${analysisId}`),
};