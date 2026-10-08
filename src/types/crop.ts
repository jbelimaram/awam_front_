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

/** Espèce du référentiel : seules celles-ci ont stades, seuils et Kc. */
export interface SpeciesOption {
  code: string;
  label: string;
  crop_type: "perennial" | "annual";
  /** Arbre fruitier : affiche la case « Verger en production » */
  is_orchard: boolean;
}

export interface CropObservation {
  id: number;
  crop_id: number;
  observed_at: string;
  stage?: string | null;
  stage_label?: string | null;
  content: string;
}