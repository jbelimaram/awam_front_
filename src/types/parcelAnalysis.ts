export interface ParcelAnalysis {
  id: number;
  parcel_id: number;
  /** Date du prélèvement / de l'analyse (ISO 8601). */
  analyzed_at: string;

  soil_type?: string | null;
  soil_ph?: number | null;
  soil_humidity_pct?: number | null;
  soil_organic_matter_pct?: number | null;
  soil_salinity_g_l?: number | null;

  water_ph?: number | null;
  water_nitrates_mg_l?: number | null;

  notes?: string | null;
  created_at?: string | null;
}

/** Champs saisissables : tous facultatifs, une analyse peut être partielle. */
export interface ParcelAnalysisPayload {
  analyzed_at?: string | null;

  soil_type?: string | null;
  soil_ph?: number | null;
  soil_humidity_pct?: number | null;
  soil_organic_matter_pct?: number | null;
  soil_salinity_g_l?: number | null;

  water_ph?: number | null;
  water_nitrates_mg_l?: number | null;

  notes?: string | null;
}