/** Irrigation : api/routes/irrigation.py */

export type EquipmentKind = "arrosoir" | "tuyau" | "goutte_a_goutte";
export type WaterSource = "puits" | "reseau" | "bassin" | "autre";

export interface Equipment {
  id: number;
  parcel_id: number;
  name: string;
  kind: EquipmentKind;
  crop_ids: number[];
  /** Cultures desservies, avec leur nom lisible */
  crops: { id: number; label: string }[];
  water_source: WaterSource;
  has_meter: boolean;
  can_capacity_l: number | null;
  hose_flow_l_min: number | null;
  hose_diameter_in: number | null;
  hose_length_m: number | null;
  emitter_flow_l_h: number | null;
  emitters_per_plant: number | null;
  plant_spacing_m: number | null;
  row_spacing_m: number | null;
  active: boolean;
  notes: string | null;
  /** Calculés par le back */
  plants_per_ha: number | null;
  flow_per_plant_l_h: number | null;
  total_flow_l_h: number | null;
}

export type EquipmentPayload = Partial<
  Omit<Equipment, "id" | "crops" | "plants_per_ha" | "flow_per_plant_l_h" | "total_flow_l_h">
>;

// ======================================================================
// Arrosages
// ======================================================================

export type WateringMethod = "arrosoirs" | "duree" | "compteur" | "volume";

/** Un arrosage : une tâche « irrigation », et son eau */
export interface Watering {
  id: number;
  parcel_id: number;
  /** a_realiser | realisee | a_entretenir */
  status: string;
  planned_for: string | null;
  planned_time: string | null;
  performed_at: string | null;
  crop_id: number | null;
  crop_label: string | null;
  team: string | null;
  employees: { id: number; full_name: string }[];
  equipment_id: number | null;
  equipment_name: string | null;
  equipment_kind: EquipmentKind | null;
  /** Vide pour une tâche « irrigation » créée depuis la planification */
  method: WateringMethod | null;
  can_count: number | null;
  start_time: string | null;
  end_time: string | null;
  duration_min: number | null;
  meter_volume_l: number | null;
  /** Volume apporté (L), calculé par le back */
  volume_l: number | null;
  /** Lame d'eau sur la parcelle (mm) */
  depth_mm: number | null;
}

/** L'eau d'un arrosage, telle qu'elle est saisie */
export interface WateringQuantity {
  equipment_id?: number | null;
  method?: WateringMethod | null;
  can_count?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_min?: number | null;
  meter_volume_l?: number | null;
  volume_l?: number | null;
}

/** Un arrosage fait, dans l'historique de la ferme */
export interface WateringHistoryItem extends Watering {
  parcel_name: string;
  /** Surface de la parcelle (m²) */
  parcel_area_m2: number | null;
}

// ======================================================================
// Suivi : besoin en eau et besoin couvert
// ======================================================================

/** Besoin couvert si l'eau reçue atteint le besoin ; sinon non couvert (aucun autre seuil) */
export type CoverageStatus = "couvert" | "non_couvert";

/** Bilan d'eau d'une culture sur une période */
export interface WaterBalance {
  start: string;
  end: string;
  days: number;
  et0_mm: number;
  /** Kc moyen de la période (besoin ÷ ET₀), référentiel AWAM */
  kc: number | null;
  /** Le stade, donc le Kc, change pendant la période */
  kc_varies: boolean;
  /** Pluie mesurée (Open-Meteo), comptée en entier */
  rain_mm: number;
  irrigation_l: number;
  need_mm: number | null;
  need_l: number | null;
  irrigation_mm: number | null;
  received_mm: number | null;
  received_l: number | null;
  coverage_pct: number | null;
  missing_l: number | null;
  status: CoverageStatus | null;
  /** Pourquoi le bilan n'est pas calculable, le cas échéant */
  problems: string[];
  /** Semaine en cours (tableau des semaines) */
  current?: boolean;
}

export interface CropWaterBalance {
  crop_id: number;
  label: string;
  species_label: string;
  area_m2: number | null;
  plants: number | null;
  last7: WaterBalance;
  interpretation: string[];
  weeks: WaterBalance[];
}

export interface ParcelWaterBalance {
  parcel_id: number;
  parcel_name: string;
  crops: CropWaterBalance[];
  /** Dernier jour de météo enregistré : les périodes s'y arrêtent */
  weather_until: string | null;
}