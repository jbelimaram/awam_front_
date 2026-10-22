import { api } from "./api";
import type { CropNeeds, Diagnosis, ParcelInterpretation, StageTimelineItem } from "../types/diagnosis";

// api/routes/diagnosis.py, monté sous /api
export const diagnosisService = {
  /** Diagnostic de la dernière image satellite : stade, verdicts, risques. */
  get: (cropId: number): Promise<Diagnosis> =>
    api.get<Diagnosis>(`/api/crops/${cropId}/diagnosis`),

  /** Frise des stades de l'espèce, avec le stade courant. */
  stages: (cropId: number): Promise<StageTimelineItem[]> =>
    api.get<StageTimelineItem[]>(`/api/crops/${cropId}/stages`),

  /** Besoins : irrigation calculée et lecture de l'analyse de sol. */
  needs: (cropId: number): Promise<CropNeeds> =>
    api.get<CropNeeds>(`/api/crops/${cropId}/needs`),

  /** Interprétations déjà enregistrées des analyses récentes de la parcelle */
  interpretations: (parcelId: number, days = 5): Promise<ParcelInterpretation[]> =>
    api.get<ParcelInterpretation[]>(`/api/parcels/${parcelId}/interpretations?days=${days}`),
};