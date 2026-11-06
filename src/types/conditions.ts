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