import type { KnownIndiceName } from "../types/indice";

export interface IndiceInterpretation {
  label: string;
  color: string;
}

export interface IndiceInfo {
  /** Nom complet de l'indice. */
  fullName: string;
  /** Ce que l'indice mesure, en une phrase. */
  description: string;
  /** Intervalle de bonne santé, quand il existe pour cet indice. */
  healthy?: [number, number];
  /** Repères de lecture affichés sous la définition. */
  notes?: string[];
  /** Plage théorique de l'indice, pour l'échelle du graphique. */
  range: [number, number];
}

/**
 * Catalogue des indices : définition, intervalle de bonne santé et repères
 * de lecture. Sert à la légende de la carte, aux lignes de seuil du
 * graphique et à l'interprétation colorée de la dernière valeur.
 */
export const INDICE_CATALOG: Record<string, IndiceInfo> = {
  NDVI: {
    fullName: "Normalized Difference Vegetation Index",
    description: "Mesure la verdeur et la densité de la végétation.",
    healthy: [0.6, 0.9],
    notes: ["Valeur très faible : maladie ou ravageur possible."],
    range: [-1, 1],
  },
  NDMI: {
    fullName: "Normalized Difference Moisture Index",
    description: "Mesure l'humidité et la teneur en eau du couvert (stress hydrique précoce).",
    healthy: [0.2, 0.4],
    notes: [
      "Au-dessus de 0,4 : très forte humidité, risque de maladie fongique.",
      "Sous 0,2 : début de stress hydrique. 0 : stress confirmé.",
      "Fortement négatif : sol sec ou zone brûlée.",
    ],
    range: [-1, 1],
  },
  NDWI: {
    fullName: "Normalized Difference Water Index",
    description: "Détecte l'eau et l'humidité de surface.",
    healthy: [0.2, 0.5],
    notes: ["Au-dessus de 0,5 : eau libre ou sol inondé."],
    range: [-1, 1],
  },
  NDRE: {
    fullName: "Normalized Difference Red Edge",
    description: "Suit la chlorophylle et l'azote en milieu et fin de cycle.",
    healthy: [0.4, 0.6],
    notes: ["Sous 0,3 : stress ou carence."],
    range: [-1, 1],
  },
    EVI: {
    fullName: "Enhanced Vegetation Index",
    description: "NDVI amélioré, corrigeant les effets du sol et de l'atmosphère.",
    healthy: [0.5, 0.8],
    notes: ["Sous 0,15 : végétation très clairsemée ou stress."],
    range: [-1, 1],
  },
  SAVI: {
    fullName: "Soil Adjusted Vegetation Index",
    description: "NDVI corrigé du sol, pour les couverts clairsemés.",
    healthy: [0.5, 0.8],
    notes: ["Sous 0,5 : végétation rare ou stressée sur sol visible."],
    range: [-1, 1],
  },
  NBR: {
    fullName: "Normalized Burn Ratio",
    description: "Évalue la sévérité des feux et l'état de la biomasse.",
    healthy: [0.2, 0.5],
    notes: [
      "Au-dessus de 0,26 : végétation dense et fraîche.",
      "Autour de 0,2 : végétation sèche, stress hydrique sévère.",
      "0,1 : zone brûlée récente. Négatif : sol brûlé ou minéral nu.",
    ],
    range: [-1, 1],
  },
  REDEDGE: {
    fullName: "Ratio Red Edge",
    description: "Teneur en chlorophylle, azote et stress.",
    notes: ["S'interprète avec le NDRE, pas d'intervalle propre."],
    range: [-1, 1],
  },
  CARBONATE: {
    fullName: "Carbonate Index",
    description: "Met en évidence les minéraux carbonatés et les roches calcaires.",
    notes: ["Indice minéralogique : pas d'intervalle de santé végétale."],
    range: [0, 5],
  },
  SI_SOIL: {
    fullName: "Soil Index",
    description: "Indice de sol, met en évidence les surfaces non végétalisées.",
    notes: ["Indice de sol : pas d'intervalle de santé végétale."],
    range: [-1, 1],
  },
  PSRI: {
    fullName: "Plant Senescence Reflectance Index",
    description: "Sénescence : chute de chlorophylle et maturation.",
    healthy: [-0.1, 0.2],
    notes: ["Plus la valeur est basse, plus la végétation est saine.", "Au-dessus de 0,2 : stress ou sénescence."],
    range: [-1, 1],
  },
  FCOVER: {
    fullName: "Fraction of green Vegetation Cover",
    description: "Fraction de la surface couverte par de la végétation verte.",
    healthy: [0.7, 1],
    notes: ["Proche de 1 : couvert vert continu. Proche de 0 : sol nu."],
    range: [0, 1],
  },
};

export function getIndiceInfo(name: string): IndiceInfo | null {
  return INDICE_CATALOG[name.toUpperCase()] ?? null;
}

/**
 * Situe une valeur par rapport à l'intervalle de bonne santé de l'indice.
 * Les indices sans intervalle publié ne sont pas interprétés.
 */
export function interpretIndiceValue(
  indiceName: KnownIndiceName | string,
  value: number | null
): IndiceInterpretation | null {
  if (value === null || Number.isNaN(value)) return null;

  const info = getIndiceInfo(indiceName);
  if (!info?.healthy) return null;

  const [min, max] = info.healthy;

  // PSRI : indice inversé, une valeur basse est le signe d'une plante saine
  if (indiceName.toUpperCase() === "PSRI") {
    if (value < min) return { label: "Sain", color: "#16a34a" };
    if (value <= max) return { label: "Sénescence", color: "#ca8a04" };
    return { label: "Sénescence avancée", color: "#dc2626" };
  }

  if (value >= min && value <= max) return { label: "Bonne santé", color: "#16a34a" };
  if (value > max) return { label: "Au-dessus de l'intervalle", color: "#0284c7" };

  // En dessous : d'autant plus préoccupant qu'on s'éloigne du seuil
  const gap = (min - value) / Math.max(min - info.range[0], 0.001);
  if (gap < 0.3) return { label: "Légèrement bas", color: "#ca8a04" };
  return { label: "Stress", color: "#dc2626" };
}