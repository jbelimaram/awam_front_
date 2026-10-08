import { api } from "./api";
import type {
  Crop,
  CropCreatePayload,
  CropObservation,
  CropUpdatePayload,
  SpeciesOption,
} from "../types/crop";

// api/routes/crops.py, monté sous /api
export const cropService = {
  /** Espèces du référentiel agronomique, pour la liste déroulante. */
  listSpecies: (): Promise<SpeciesOption[]> =>
    api.get<SpeciesOption[]>("/api/crops/species"),

  /** Cultures d'une parcelle, de la plus récente à la plus ancienne. */
  listByParcel: (parcelId: number): Promise<Crop[]> =>
    api.get<Crop[]>(`/api/parcels/${parcelId}/crops`),

  get: (cropId: number): Promise<Crop> => api.get<Crop>(`/api/crops/${cropId}`),

  create: (payload: CropCreatePayload): Promise<Crop> =>
    api.post<Crop>("/api/crops", payload),

  update: (cropId: number, payload: CropUpdatePayload): Promise<Crop> =>
    api.put<Crop>(`/api/crops/${cropId}`, payload),

  remove: (cropId: number): Promise<void> => api.delete<void>(`/api/crops/${cropId}`),

  listObservations: (cropId: number): Promise<CropObservation[]> =>
    api.get<CropObservation[]>(`/api/crops/${cropId}/observations`),

  addObservation: (cropId: number, content: string): Promise<CropObservation> =>
    api.post<CropObservation>(`/api/crops/${cropId}/observations`, { content }),

  removeObservation: (observationId: number): Promise<void> =>
    api.delete<void>(`/api/observations/${observationId}`),
};