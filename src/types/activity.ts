import type { Employee } from "./employee";

export interface Activity {
  id: number;
  parcel_id: number;
  activity_type: string;
  performed_at: string;
  employees: Employee[];
}

// ⚠️ employee_ids obligatoire et non vide côté backend (validator).
// performed_at, si fourni, doit inclure un fuseau horaire.
export interface ActivityCreatePayload {
  parcel_id: number;
  activity_type: string;
  performed_at?: string;
  employee_ids: number[];
}

export interface ActivityUpdatePayload {
  parcel_id?: number;
  activity_type?: string;
  performed_at?: string;
  employee_ids?: number[];
}

// activity_type est un champ texte libre côté backend ; cette liste est
// une contrainte volontaire du front pour éviter les fautes de saisie.
export const ACTIVITY_TYPES = [
  "irrigation",
  "fertilisation",
  "traitement",
  "taille",
  "recolte",
  "plantation",
  "desherbage",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];