/** Projection climatique : api/routes/climate.py */

export type ClimateSiteStatus = "en_attente" | "en_cours" | "pret" | "echec";

export interface ClimateSite {
  id: number;
  name: string;
  /** Ferme liée ; vide pour un lieu choisi sur la carte */
  farm_id: number | null;
  latitude: number;
  longitude: number;
  status: ClimateSiteStatus;
  last_error: string | null;
  /** Distance à la mer la plus proche (km) ; côtier à moins de 50 km */
  sea_distance_km: number | null;
}

export interface ClimateSitePayload {
  name: string;
  latitude: number;
  longitude: number;
}

/** Une année : climat réel (jusqu'à l'an dernier) et projection (moyenne et fourchette des modèles) */
export interface ClimateYear {
  year: number;
  rain_real: number | null;
  et0_real: number | null;
  rain_projected: number | null;
  rain_min: number | null;
  rain_max: number | null;
  et0_projected: number | null;
}

/** Un chiffre clé : moyenne réelle récente, et moyenne projetée en fin de période */
export interface ClimateKpi {
  now: number | null;
  future: number | null;
  unit?: string;
}

/** Une période : la période réelle, puis des périodes projetées de 5 ans */
export interface ClimatePeriod {
  start: number;
  end: number;
  /** Période mesurée (vrai) ou projetée (faux) */
  real: boolean;
  rain: number;
  /** Besoin en eau du climat (ET₀) */
  demand: number;
  /** Eau qui manque : besoin − pluie */
  deficit: number;
  climate_class: string | null;
  /** Phrases d'explication, construites à partir des chiffres */
  interpretation: string[];
}

export interface ClimateSummary {
  site: ClimateSite & { coastal: boolean };
  scenario: string;
  scenarios: string[];
  models: string[];
  real_period: [number, number] | null;
  future_period: [number, number];
  years: ClimateYear[];
  kpis: {
    rain: ClimateKpi;
    et0: ClimateKpi;
    aridity: ClimateKpi & { class_now: string | null; class_future: string | null };
    summer_soil: ClimateKpi;
    /** Seulement pour un lieu côtier */
    sea: ClimateKpi | null;
  };
  periods: ClimatePeriod[];
  /** Messages de la surveillance de l'écart entre le réel et les projections */
  divergence: string[];
}