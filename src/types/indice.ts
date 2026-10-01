export interface IndiceReading {
  id: number;
  parcel_id: number;
  indice_name: string;
  value: number | null;
  min_value: number | null;
  max_value: number | null;
  std_value: number | null;
  median_value: number | null;
  valid_pixels: number | null;
  cloud_pixels: number | null;
  total_pixels: number | null;
  valid_ratio: number | null;
  theoretical_min: number | null;
  theoretical_max: number | null;
  is_valid: boolean | null;
  validation_error: string | null;
  scene_id: string | null;
  scene_date: string | null;
  cloud_cover: number | null;
  b2_key: string | null;
  recorded_at: string | null;
}

// Réponse de GET /api/parcels/{id}/indices/{nom}/raster (route ajoutée
// côté backend), pour afficher n'importe quel indice sur la carte.
export interface IndiceRaster {
  url: string | null;
  scene_date: string | null;
  band_index: number | null;
}

export const KNOWN_INDICE_NAMES = [
  "NDVI", "NDMI", "NDWI", "NDRE", "EVI", "SAVI", "MSAVI",
  "NBR", "REDEDGE", "VARI", "CARBONATE", "SI_SOIL", "PSRI", "FCOVER",
] as const;

export type KnownIndiceName = (typeof KNOWN_INDICE_NAMES)[number];