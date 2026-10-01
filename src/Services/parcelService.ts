import { api } from "./api";
import type {
  Parcel,
  ParcelCreatePayload,
  ParcelUpdatePayload,
  ParcelRasterStatusResponse,
  ParcelRefreshResponse,
} from "../types/parcel";

// api/routes/parcels.py, prefix="/parcels", monté sous /api
export const parcelService = {
  list: (): Promise<Parcel[]> => api.get<Parcel[]>("/api/parcels"),

  get: (id: number): Promise<Parcel> => api.get<Parcel>(`/api/parcels/${id}`),

  create: (payload: ParcelCreatePayload): Promise<Parcel> =>
    api.post<Parcel>("/api/parcels", payload),

  update: (id: number, payload: ParcelUpdatePayload): Promise<Parcel> =>
    api.put<Parcel>(`/api/parcels/${id}`, payload),

  remove: (id: number): Promise<void> => api.delete<void>(`/api/parcels/${id}`),

  // fetch n'ajoute pas les query params tout seul : on les construit ici.
  refresh: (id: number, forceRefresh = false): Promise<ParcelRefreshResponse> =>
    api.post<ParcelRefreshResponse>(`/api/parcels/${id}/refresh?force_refresh=${forceRefresh}`),

  rasterStatus: (id: number): Promise<ParcelRasterStatusResponse> =>
    api.get<ParcelRasterStatusResponse>(`/api/parcels/${id}/raster_status`),
};