/** Page « Climat et cultures » : api/routes/conditions.py */

export type ParameterKey =
  | "temperature_max_c"
  | "temperature_min_c"
  | "temperature_mean_c"
  | "precipitation_mm"
  | "humidity_mean_pct"
  | "wind_speed_mean_kmh"
  | "radiation_mj_m2"
  | "et0_mm"
  | "dry_days";

/** Un paramètre du mois : sa valeur, sa normale et l'écart entre les deux */
export interface ParameterValue {
  value: number | null;
  normal: number | null;
  /** Différence (même unité que la valeur), ou pourcentage si anomaly_unit vaut « % » */
  anomaly: number | null;
  anomaly_unit: "%" | null;
}

/** Les chiffres d'un mois pour une ferme */
export interface MonthConditions {
  farm_id: number;
  /** « AAAA-MM » */
  month: string;
  days: number;
  days_in_month: number;
  /** Mois en cours : calculé sur ses jours déjà passés */
  partial: boolean;
  normals_period: [number, number];
  normals_years: number;
  parameters: Record<ParameterKey, ParameterValue>;
  /** Plus longue suite de jours secs (indice CDD de l'OMM) */
  longest_dry_spell: number | null;
  wind_speed_max_kmh: number | null;
  windiest_day: string | null;
}

/** Un mois d'une année, dans la comparaison des années */
export interface YearRow {
  year: number;
  days: number;
  /** Mois incomplet (mois en cours, ou jours manquants) */
  partial: boolean;
  values: Record<ParameterKey, number | null>;
}

/** Le même mois pour chaque année, et sa normale */
export interface YearComparison {
  farm_id: number;
  /** Numéro du mois, de 1 à 12 */
  month: number;
  normals_period: [number, number];
  /** De l'année la plus récente à la plus ancienne */
  years: YearRow[];
  normal: Record<ParameterKey, number | null>;
}

// ======================================================================
// Onglet Impacts
// ======================================================================

/** Un paramètre pendant un stade, comparé à la normale des mêmes dates */
export interface StageParameter {
  value: number | null;
  normal: number | null;
  anomaly: number | null;
  anomaly_unit: "%" | null;
  /** Plus faible et plus forte valeur des années de la normale */
  range: [number, number] | null;
  /** Au-dessus de toutes ces années, en dessous, ou dans la fourchette */
  position: "above" | "below" | "within" | null;
}

export type StageParameterKey = "temperature_max_c" | "temperature_min_c" | "precipitation_mm" | "et0_mm" | "humidity_mean_pct";

export interface StageClimate {
  stage: string;
  label: string;
  /** « octobre–novembre » */
  months: string;
  start: string;
  end: string;
  counted_until: string | null;
  in_progress: boolean;
  not_started: boolean;
  normals_years: number;
  parameters: Record<StageParameterKey, StageParameter>;
  summary: string;
}

/** Bilan d'eau d'une période : données de la plateforme, sans coefficient estimé */
export interface WaterPeriod {
  start: string;
  end: string;
  days: number;
  /** ET₀ réelle (Open-Meteo), mm */
  et0_mm: number;
  /** Kc du stade, référentiel AWAM */
  kc: number | null;
  /** Pluie mesurée, comptée en entier, mm */
  rain_mm: number;
  irrigation_l: number;
  need_mm: number | null;
  irrigation_mm: number | null;
  received_mm: number | null;
  coverage_pct: number | null;
  missing_mm: number | null;
  /** Eau reçue ≥ besoin : la seule limite utilisée */
  covered: boolean | null;
  problems: string[];
}

export interface WaterWeek {
  start: string;
  end: string;
  days: number;
  need_mm: number;
  received_mm: number;
  coverage_pct: number | null;
}

export interface WaterSeason {
  start: string;
  end: string;
  problems: string[];
  need_mm?: number;
  rain_mm?: number;
  irrigation_mm?: number;
  irrigation_l?: number;
  received_mm?: number;
  coverage_pct?: number | null;
  missing_mm?: number;
  covered?: boolean;
}

export interface CropImpacts {
  crop_id: number;
  label: string;
  species_label: string;
  planting_date: string | null;
  stages: StageClimate[];
  water: { month: WaterPeriod | null; weeks: WaterWeek[]; season: WaterSeason | null };
}

export interface ParcelImpacts {
  parcel_id: number;
  parcel_name: string;
  month: string;
  normals_period: [number, number];
  season_start_month: number;
  crops: CropImpacts[];
}
