import type { Level } from "../types/diagnosis";

/**
 * Repère de lecture général d'un indice, valable pour la végétation en
 * général et NON pour une culture précise. Il aide à lire une valeur, il
 * ne juge pas une parcelle : un verger, qui laisse voir le sol entre les
 * arbres, peut être en parfaite santé sous ce repère.
 *
 * Le verdict d'une parcelle vient uniquement du diagnostic par culture
 * (back : seuils du document agronomique, par culture, stade et âge).
 */
export interface IndiceReference {
  /** Bornes du repère. */
  range: [number, number];
  /** Ce que décrit le repère, ex. « végétation généralement dense ». */
  meaning: string;
}

export interface IndiceInfo {
  /** Nom complet de l'indice. */
  fullName: string;
  /** Ce que l'indice mesure, en une phrase. */
  description: string;
  /** Formule calculée par AWAM (bandes Sentinel-2). */
  formula: string;
  /** Repère indicatif général, quand il en existe un. */
  reference?: IndiceReference;
  /** Précautions de lecture. */
  notes?: string[];
  /** Plage théorique de l'indice, pour l'échelle du graphique. */
  range: [number, number];
}

/**
 * Catalogue des indices calculés par AWAM.
 *
 * Définitions et repères : synthèse générale (Perplexity), sans référence
 * publiée précise. Ils servent d'aide à la lecture, jamais de seuil
 * d'alerte. Les descriptions de NDWI, CARBONATE et SI_SOIL sont adaptées
 * aux formules réellement calculées.
 */
export const INDICE_CATALOG: Record<string, IndiceInfo> = {
  NDVI: {
    fullName: "Normalized Difference Vegetation Index",
    description: "Renseigne sur la verdeur et la densité du couvert végétal.",
    formula: "(B08 − B04) / (B08 + B04)",
    reference: { range: [0.6, 0.9], meaning: "végétation généralement dense et vigoureuse" },
    notes: [
      "Une valeur faible peut signaler une végétation clairsemée ou un stress, sans en déterminer la cause.",
      "Un verger laisse voir le sol entre les arbres : sa valeur reste sous ce repère sans être anormale.",
    ],
    range: [-1, 1],
  },
  NDMI: {
    fullName: "Normalized Difference Moisture Index",
    description: "Estime la teneur en eau du couvert végétal et aide à repérer un stress hydrique.",
    formula: "(B08 − B11) / (B08 + B11)",
    reference: { range: [0.2, 0.4], meaning: "couvert souvent bien hydraté" },
    notes: ["Les valeurs dépendent du type de végétation et des conditions locales."],
    range: [-1, 1],
  },
  MSI: {
    fullName: "Moisture Stress Index",
    description: "Augmente quand la teneur en eau des feuilles diminue.",
    formula: "B11 / B08",
    notes: ["Une hausse dans le temps est le signe à surveiller, à lire avec le NDMI."],
    range: [0, 3],
  },
  NDWI: {
    fullName: "Normalized Difference Water Index (McFeeters)",
    description: "Avec cette formule, détecte l'eau libre en surface, pas l'eau contenue dans les plantes.",
    formula: "(B03 − B08) / (B03 + B08)",
    notes: [
      "Une végétation donne une valeur négative : c'est normal.",
      "Une valeur positive signale de l'eau libre ou une surface très humide.",
      "Pour l'eau des plantes, voir le NDMI.",
    ],
    range: [-1, 1],
  },
  NDRE: {
    fullName: "Normalized Difference Red Edge",
    description: "Sensible à la chlorophylle, utile pour suivre l'état azoté de cultures développées.",
    formula: "(B08 − B05) / (B08 + B05)",
    reference: { range: [0.4, 0.6], meaning: "valeurs souvent associées à un couvert actif" },
    notes: ["Une valeur basse peut refléter un stress ou une carence, sans en identifier la cause."],
    range: [-1, 1],
  },
  EVI: {
    fullName: "Enhanced Vegetation Index",
    description: "Indice amélioré, conçu pour réduire certaines influences du sol et de l'atmosphère.",
    formula: "2,5 (B08 − B04) / (B08 + 6 B04 − 7,5 B02 + 1)",
    reference: { range: [0.2, 0.8], meaning: "valeurs possibles pour une végétation active" },
    range: [-1, 1],
  },
  SAVI: {
    fullName: "Soil Adjusted Vegetation Index",
    description: "Indice ajusté au sol, utile quand la végétation est clairsemée et que le sol influence le signal.",
    formula: "1,5 (B08 − B04) / (B08 + B04 + 0,5)",
    reference: { range: [0.5, 0.8], meaning: "couvert végétal souvent développé" },
    notes: ["Son interprétation dépend du facteur d'ajustement (ici L = 0,5)."],
    range: [-1, 1],
  },
  MSAVI: {
    fullName: "Modified Soil Adjusted Vegetation Index",
    description: "Variante du SAVI qui ajuste automatiquement l'effet du sol, pour les couverts clairsemés.",
    formula: "MSAVI2 (Qi, 1994)",
    reference: { range: [0.5, 0.8], meaning: "couvert souvent bien développé" },
    notes: ["Les seuils ne sont pas universels."],
    range: [-1, 1],
  },
  VARI: {
    fullName: "Visible Atmospherically Resistant Index",
    description: "Indice calculé avec les seules bandes visibles, conçu pour réduire certains effets atmosphériques.",
    formula: "(B03 − B04) / (B03 + B04 − B02)",
    reference: { range: [0.4, 0.7], meaning: "végétation souvent visible et dense" },
    notes: ["Sensible à l'éclairage et aux ombres."],
    range: [-1, 1],
  },
  NBR: {
    fullName: "Normalized Burn Ratio",
    description: "Évalue les changements liés aux incendies et l'état de la végétation.",
    formula: "(B08 − B12) / (B08 + B12)",
    notes: [
      "À interpréter par comparaison dans le temps.",
      "La sévérité d'un feu se mesure par l'écart avant / après l'événement, pas par un seuil unique.",
    ],
    range: [-1, 1],
  },
  REDEDGE: {
    fullName: "Rapport red edge",
    description: "Différence normalisée entre deux bandes de la région « red edge ».",
    formula: "(B06 − B05) / (B06 + B05)",
    notes: [
      "« Red edge » désigne une région spectrale, pas un indice unique.",
      "Pas de repère publié pour cette formule : à lire avec le NDRE.",
    ],
    range: [-1, 1],
  },
  CARBONATE: {
    fullName: "Indice « Carbonate » (formule du NDTI)",
    description:
      "Différence normalisée des deux bandes infrarouge moyen. Cette formule est celle du NDTI, " +
      "un indice de résidus de culture et de travail du sol, et non un indice de minéraux carbonatés.",
    formula: "(B11 − B12) / (B11 + B12)",
    notes: ["Pas de seuil général. Interprétation à confirmer avec l'agronome."],
    range: [-1, 1],
  },
  SI_SOIL: {
    fullName: "Indice de sol",
    description: "Différence normalisée entre le rouge et l'infrarouge moyen.",
    formula: "(B04 − B11) / (B04 + B11)",
    notes: [
      "Le nom « Soil Index » ne suffit pas à fixer une interprétation.",
      "Pas de repère tant que la méthode n'est pas confirmée avec l'agronome.",
    ],
    range: [-1, 1],
  },
  PSRI: {
    fullName: "Plant Senescence Reflectance Index",
    description: "Aide à suivre la maturation et la perte de chlorophylle.",
    formula: "(B04 − B02) / B06",
    reference: { range: [-0.1, 0.2], meaning: "faible sénescence dans certains contextes" },
    notes: [
      "Des valeurs croissantes peuvent indiquer une sénescence, selon la culture et le stade.",
      "Sur un couvert incomplet, le sol visible fait aussi monter la valeur.",
    ],
    range: [-1, 1],
  },
  FCOVER: {
    fullName: "Fraction of green Vegetation Cover",
    description: "Fraction de la surface couverte par de la végétation verte.",
    formula: "(NDVI − 0,1) / 0,8, borné entre 0 et 1",
    reference: { range: [0.7, 1], meaning: "couvert végétal vert important" },
    notes: ["Calculé ici à partir du NDVI : il n'apporte pas d'information indépendante."],
    range: [0, 1],
  },
};

export function getIndiceInfo(name: string): IndiceInfo | null {
  return INDICE_CATALOG[name.toUpperCase()] ?? null;
}

const fmt = (v: number) => v.toLocaleString("fr-FR");

/**
 * Texte du repère indicatif, ou null si l'indice n'en a pas.
 * Ex. « Repère indicatif, toutes cultures : 0,6 à 0,9 (végétation…) ».
 */
export function referenceLabel(info: IndiceInfo | null): string | null {
  if (!info?.reference) return null;
  const [min, max] = info.reference.range;
  return `Repère indicatif, toutes cultures : ${fmt(min)} à ${fmt(max)} (${info.reference.meaning})`;
}

// ======================================================================
// Verdicts du diagnostic par culture
// ======================================================================
/**
 * Code couleur du référentiel agronomique :
 *   🔴 bas      — sous l'intervalle attendu, à vérifier
 *   🟢 normal   — dans l'intervalle attendu
 *   🔵 élevé    — au-dessus, développement excellent (pas une alerte)
 *   ⚪ info     — affiché sans verdict (seuil en attente de clarification)
 */
export const LEVEL_STYLE: Record<Level, { color: string; bg: string; label: string }> = {
  low: { color: "#b42318", bg: "#fef2f2", label: "Faible" },
  normal: { color: "#15803d", bg: "#f0fdf4", label: "Normal" },
  high: { color: "#1d4ed8", bg: "#eff6ff", label: "Excellent" },
  info: { color: "#6b7280", bg: "#f9fafb", label: "Non évalué" },
};