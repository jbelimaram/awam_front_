export interface Weather {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  weather_code: number | null;
  /** Vrai si Open-Meteo est indisponible : c'est la dernière météo connue */
  stale?: boolean;
  /** Âge de cette météo, en minutes */
  age_minutes?: number;
}