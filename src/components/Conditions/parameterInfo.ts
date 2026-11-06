import type { ParameterKey } from "../../types/conditions";

/** Libellé, unité, icône et explication (info-bulle) de chaque paramètre */
export const PARAMETER_INFO: Record<ParameterKey, { label: string; unit: string; icon: string; help: string; decimals: number }> = {
  temperature_max_c: {
    label: "Température max.", unit: "°C", icon: "🌡️", decimals: 1,
    help: "La température la plus haute de la journée, mesurée à 2 m du sol, en moyenne sur le mois.",
  },
  temperature_min_c: {
    label: "Température min.", unit: "°C", icon: "🌡️", decimals: 1,
    help: "La température la plus basse de la journée, en général au lever du soleil. Elle sert à détecter le gel.",
  },
  temperature_mean_c: {
    label: "Température moy.", unit: "°C", icon: "🌡️", decimals: 1,
    help: "La moyenne de la journée : elle indique la chaleur globale subie par les cultures.",
  },
  precipitation_mm: {
    label: "Pluie", unit: "mm", icon: "🌧️", decimals: 0,
    help: "La quantité d'eau tombée sur le mois, en mm. 1 mm = 1 litre par m².",
  },
  humidity_mean_pct: {
    label: "Humidité de l'air", unit: "%", icon: "💧", decimals: 0,
    help: "La part de vapeur d'eau dans l'air. Haute, elle favorise les maladies ; basse, elle assèche les plantes.",
  },
  wind_speed_mean_kmh: {
    label: "Vent moyen", unit: "km/h", icon: "🌬️", decimals: 0,
    help: "La vitesse moyenne du vent. Il augmente l'évaporation, et peut abîmer les fleurs.",
  },
  radiation_mj_m2: {
    label: "Rayonnement", unit: "MJ/m²", icon: "☀️", decimals: 1,
    help: "L'énergie du soleil reçue par le sol chaque jour, en moyenne : le moteur de la photosynthèse et de l'évaporation.",
  },
  et0_mm: {
    label: "ET₀", unit: "mm", icon: "♨️", decimals: 0,
    help: "L'eau que le climat fait évaporer d'une pelouse de référence sur le mois. Multipliée par le Kc, elle donne le besoin en eau de chaque culture.",
  },
  dry_days: {
    label: "Jours sans pluie", unit: "jours", icon: "🏜️", decimals: 0,
    help: "Les jours avec moins de 1 mm de pluie, et la plus longue suite de jours secs (indice CDD de l'Organisation météorologique mondiale).",
  },
};

export const PARAMETER_ORDER: ParameterKey[] = [
  "temperature_max_c", "temperature_min_c", "temperature_mean_c",
  "precipitation_mm", "humidity_mean_pct", "wind_speed_mean_kmh",
  "radiation_mj_m2", "et0_mm", "dry_days",
];

/** Nombre à la française : 1 234,5 */
export const fmt = (v: number, decimals = 1) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

/** « octobre 2026 » à partir de « 2026-10 » */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}