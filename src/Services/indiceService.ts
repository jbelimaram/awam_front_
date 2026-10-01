import { api } from "./api";
import type { IndiceReading, IndiceRaster } from "../types/indice";

// api/routes/indices.py, monté sous /api
export const indiceService = {
  listByParcel: (parcelId: number, indiceName?: string): Promise<IndiceReading[]> => {
    const query = indiceName ? `?indice_name=${encodeURIComponent(indiceName)}` : "";
    return api.get<IndiceReading[]>(`/api/parcels/${parcelId}/indices${query}`);
  },

  available: (parcelId: number): Promise<string[]> =>
    api.get<string[]>(`/api/parcels/${parcelId}/indices/available`),

  // 🆕 Affiche n'importe quel indice en calque sur la carte, pas seulement NDVI.
  raster: (parcelId: number, indiceName: string): Promise<IndiceRaster> =>
    api.get<IndiceRaster>(`/api/parcels/${parcelId}/indices/${indiceName}/raster`),
};