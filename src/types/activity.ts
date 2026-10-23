import type { Employee } from "./employee";

/**
 * État d'une tâche :
 *   a_realiser   : planifiée, avec sa date prévue ;
 *   realisee     : faite, à sa date réelle ;
 *   a_entretenir : faite, mais qui demande un suivi, sans date fixe.
 */
export type ActivityStatus = "a_realiser" | "realisee" | "a_entretenir";

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  a_realiser: "À réaliser",
  realisee: "Réalisée",
  a_entretenir: "À entretenir",
};

export interface Activity {
  id: number;
  parcel_id: number;
  activity_type: string;
  status: ActivityStatus;
  /** Date prévue (AAAA-MM-JJ) */
  planned_for?: string | null;
  /** Date réelle : remplie quand la tâche est faite */
  performed_at?: string | null;
  crop_id?: number | null;
  /** Équipe chargée : code d'un type de tâche */
  team?: string | null;
  /** Tâche principale, pour une tâche attachée */
  parent_id?: number | null;
  employees: Employee[];
}

export interface ActivityCreatePayload {
  parcel_id: number;
  activity_type: string;
  status?: ActivityStatus;
  planned_for?: string | null;
  /** Doit inclure un fuseau horaire */
  performed_at?: string;
  crop_id?: number | null;
  team?: string | null;
  parent_id?: number | null;
  employee_ids: number[];
}

export interface ActivityUpdatePayload {
  parcel_id?: number;
  activity_type?: string;
  status?: ActivityStatus;
  planned_for?: string | null;
  performed_at?: string;
  crop_id?: number | null;
  team?: string | null;
  employee_ids?: number[];
}

export interface ActivityCompletePayload {
  /** Date réelle, avec fuseau horaire ; maintenant si absente */
  performed_at?: string;
  /** Employés qui ont VRAIMENT fait la tâche */
  employee_ids: number[];
  /** Vrai : faite, mais à suivre (« à entretenir ») */
  follow_up?: boolean;
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