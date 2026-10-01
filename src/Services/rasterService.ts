import { api } from "./api";
import type { Raster, RasterCurrent, RasterType } from "../types/raster";

// api/routes/raster.py, prefix="/raster", monté sous /api
export const rasterService = {
  // ⚠️ url = URL B2 brute, non signée. N'utiliser que pour scene_date.
  listByParcel: (parcelId: number): Promise<Raster[]> =>
    api.get<Raster[]>(`/api/raster/list?parcel_id=${parcelId}`),

  // URL signée valable 1h : à redemander si la page reste ouverte longtemps.
  current: (parcelId: number, type: RasterType): Promise<RasterCurrent> =>
    api.get<RasterCurrent>(`/api/raster/current?parcel_id=${parcelId}&type=${type}`),
};