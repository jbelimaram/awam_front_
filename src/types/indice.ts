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

/**
 * Plage habituelle d'un indice pour une parcelle, à la période de sa
 * mesure la plus récente, calculée sur les années précédentes.
 * Réponse de GET /api/parcels/{id}/indices/{nom}/baseline.
 */
export interface IndiceBaseline {
  indice_name: string;
  reference_date: string | null;
  value: number | null;
  /** ok : plage calculée · insufficient : historique trop court · no_data : aucune mesure */
  status: "ok" | "insufficient" | "no_data";
  /** 10e centile, médiane et 90e centile des années précédentes */
  low: number | null;
  median: number | null;
  high: number | null;
  values_count: number;
  /** Années ayant fourni des mesures à cette période */
  years: number[];
  verdict: "below" | "within" | "above" | null;
  message: string;
  window_days: number;
}

export const KNOWN_INDICE_NAMES = [
  "NDVI", "NDMI", "NDWI", "NDRE", "EVI", "SAVI", "MSAVI",
  "NBR", "REDEDGE", "VARI", "CARBONATE", "SI_SOIL", "PSRI", "FCOVER",
] as const;

export type KnownIndiceName = (typeof KNOWN_INDICE_NAMES)[number];