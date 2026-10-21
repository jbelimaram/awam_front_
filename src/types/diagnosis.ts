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

export interface WaterNeed {
  days: number;
  et0_mm: number;
  kc?: number | null;
  etc_mm: number;
  rain_mm: number;
  effective_rain_mm: number;
  net_need_mm: number;
  net_need_m3?: number | null;
  message: string;
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