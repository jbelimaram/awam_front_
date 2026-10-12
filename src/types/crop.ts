export type CropStatus = "active" | "harvested" | "abandoned";

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
  density?: number | null;
  /** Arbres fruitiers : le verger produit-il déjà ? */
  in_production: boolean;
  /** Vrai pour olivier, amandier, caroubier */
  is_orchard: boolean;
  status: CropStatus;
  notes?: string | null;
  created_at?: string | null;
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
}

export interface CropUpdatePayload {
  species?: string;
  variety?: string | null;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  actual_harvest_date?: string | null;
  density?: number | null;
  in_production?: boolean;
  status?: CropStatus;
  notes?: string | null;
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