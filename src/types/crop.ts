/** ended : pérenne en fin de vie, arrachée (avec sa date de fin).
 *  abandoned : culture qui a échoué avant terme. */
export type CropStatus = "active" | "harvested" | "abandoned" | "ended";

/** Unité de la production récoltée : kilogrammes ou tonnes */
export type YieldUnit = "kg" | "t";

export interface Crop {
  id: number;
  parcel_id: number;
  /** Code du référentiel : olivier, lavande… */
  species: string;
  /** Libellé lisible, fourni par le back */
  species_label?: string | null;
  variety?: string | null;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  actual_harvest_date?: string | null;
  /** Quantité récoltée, exigée par le back quand la culture est récoltée */
  actual_yield?: number | null;
  yield_unit?: YieldUnit | null;
  /** Vrai pour une annuelle (basilic) : sa récolte termine le cycle */
  is_annual?: boolean;
  /** Âge de la plantation, en années */
  age_years?: number | null;
  /** Production optimale de l'espèce, ex. « de 3 à 6 ans » */
  optimal_production?: string | null;
  /** Message selon l'âge : « info » (jeune) ou « warning » (renouvellement) */
  lifespan_level?: "info" | "warning" | null;
  lifespan_note?: string | null;
  density?: number | null;
  /** Arbres fruitiers : le verger produit-il déjà ? */
  in_production: boolean;
  /** Vrai pour olivier, amandier, caroubier */
  is_orchard: boolean;
  status: CropStatus;
  notes?: string | null;
  created_at?: string | null;
  /** Date de fin (arrachage) d'une culture « Terminée » */
  end_date?: string | null;
}

export interface CropCreatePayload {
  parcel_id: number;
  species: string;
  variety?: string | null;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  density?: number | null;
  in_production?: boolean;
  status?: CropStatus;
  notes?: string | null;
  // Culture créée déjà récoltée : date et production exigées par le back
  actual_harvest_date?: string | null;
  actual_yield?: number | null;
  yield_unit?: YieldUnit | null;
  /** Date de fin (arrachage) d'une culture « Terminée » */
  end_date?: string | null;
}

export interface CropUpdatePayload {
  species?: string;
  variety?: string | null;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  actual_harvest_date?: string | null;
  actual_yield?: number | null;
  yield_unit?: YieldUnit | null;
  density?: number | null;
  in_production?: boolean;
  status?: CropStatus;
  notes?: string | null;
  /** Date de fin (arrachage) d'une culture « Terminée » */
  end_date?: string | null;
}

/** Origine d'une variété, pour regrouper la liste. */
export type VarietyOrigin = "tunisian" | "spanish" | "international";

/** Une variété proposée dans la liste du formulaire. */
export interface VarietyOption {
  name: string;
  origin: VarietyOrigin;
  /** Libellé du groupe : « Variétés tunisiennes »… */
  origin_label: string;
}

/** Espèce du référentiel : seules celles-ci ont stades, seuils et Kc. */
export interface SpeciesOption {
  code: string;
  label: string;
  crop_type: "perennial" | "annual";
  /** Arbre fruitier : affiche la case « Verger en production » */
  is_orchard: boolean;
  /** Variétés proposées ; vide = saisie libre */
  varieties: VarietyOption[];
}

/** Cultures lues sur la parcelle, pour pré-remplir le formulaire. */
export interface CropSuggestions {
  parcel_name: string;
  /** Espèces à pré-cocher (reconnues, sans culture en cours) */
  suggested: string[];
  /** Espèces déjà suivies : en cours, ou pérennes récoltées */
  already_active: string[];
  /** Textes du champ culture non reconnus dans le référentiel */
  unknown: string[];
}

export interface CropObservation {
  id: number;
  crop_id: number;
  observed_at: string;
  stage?: string | null;
  stage_label?: string | null;
  content: string;
}