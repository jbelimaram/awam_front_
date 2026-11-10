/**
 * Niveaux du référentiel agronomique :
 *   low    — sous l'intervalle attendu (anomalie à vérifier)
 *   normal — dans l'intervalle attendu
 *   high   — au-dessus : développement excellent (pas une alerte)
 *   info   — affiché sans verdict (seuil en attente de clarification)
 */
export type Level = "low" | "normal" | "high" | "info";

/** Niveaux des références de sol (inchangés). */
export type SoilLevel = "green" | "yellow" | "red";
export type Severity = "normal" | "watch" | "alert" | "strong_alert";

/** Un indice déjà évalué par le back : le front n'applique aucun seuil. */
export interface Indicator {
  name: string;
  value: number;
  delta?: number | null;
  level: Level;
  threshold_label: string;
  /** "" pour les indices, "%" pour le FCover */
  unit: string;
}

export interface Risk {
  severity: Severity;
  diagnosis: string;
  /** Ce qu'il faut mesurer sur le terrain */
  measure: string;
  /** Ce qu'il faut faire si l'anomalie est confirmée */
  action: string;
}

export interface StageInfo {
  stage?: string | null;
  label: string;
  period: string;
  days_since_planting?: number | null;
  /** Âge en années : choisit le jeu de seuils de l'agronome */
  age_years?: number | null;
}

export interface Diagnosis {
  crop_id: number;
  scene_date?: string | null;
  stage: StageInfo;
  indicators: Indicator[];
  risks: Risk[];
  reading: string;
  /** Pourquoi ce stade compte, d'après le référentiel agronomique */
  explanation: string;
  /** Ce qu'il faut faire à ce stade, d'après le référentiel agronomique */
  recommendation: string;
  /** Vrai si une coupe ou récolte explique les baisses : pas d'alerte */
  cultural_drop: boolean;
  /** Vrai si les seuils dépendent de l'âge mais que la date manque */
  age_required: boolean;
  severity: Severity;
}

export interface StageTimelineItem {
  stage: string;
  label: string;
  period: string;
  is_current: boolean;
  cultural_drop: boolean;
}

/**
 * Besoin en eau des 7 derniers jours de météo enregistrée : le même calcul
 * que le Suivi de l'irrigation.
 */
export interface WaterNeed {
  start: string;
  end: string;
  days: number;
  /** ET₀ réelle cumulée (Open-Meteo), mm */
  et0_mm: number;
  /** Kc moyen de la période (référentiel AWAM) */
  kc: number | null;
  /** Le stade, donc le Kc, change pendant la période */
  kc_varies: boolean;
  /** Besoin de la culture, ET₀ × Kc jour par jour, mm */
  need_mm: number | null;
  /** Pluie mesurée, comptée en entier, mm */
  rain_mm: number;
  irrigation_l: number;
  irrigation_mm: number | null;
  received_mm: number | null;
  coverage_pct: number | null;
  missing_mm: number | null;
  missing_l: number | null;
  /** « couvert » ou « non_couvert » ; null si non calculable */
  status: "couvert" | "non_couvert" | null;
  /** Pourquoi le besoin n'est pas calculable, le cas échéant */
  problems: string[];
}

export interface SoilRow {
  param: string;
  value: number;
  level: SoilLevel;
  reference: string;
  message: string;
}

export interface CropNeeds {
  crop_id: number;
  water?: WaterNeed | null;
  soil: SoilRow[];
  soil_analysis_date?: string | null;
  /** Culture clôturée : aucun besoin calculé, et pourquoi */
  closed_reason?: string | null;
}

/**
 * Interprétation, déjà enregistrée, de l'analyse d'une date pour une
 * culture (GET /api/parcels/{id}/interpretations).
 */
export interface ParcelInterpretation {
  crop_id: number;
  crop_label: string;
  scene_date: string;
  stage_label?: string | null;
  severity: Severity;
  severity_label: string;
  /** Lecture du diagnostic, ex. « Stress hydrique précoce » */
  reading?: string | null;
  /** Période de coupe ou de récolte : la baisse est attendue */
  cultural_drop: boolean;
  indicators: Indicator[];
}