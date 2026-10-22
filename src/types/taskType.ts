/**
 * Type de tâche : nomme les équipes (Équipe irrigation…) et, plus tard,
 * les tâches. Prédéfini (lecture seule) ou libre (créé par l'utilisateur,
 * valable pour toutes ses fermes).
 */
export interface TaskType {
  /** Identifiant du type libre ; null pour un type prédéfini */
  id: number | null;
  /** Valeur enregistrée comme équipe de l'employé */
  code: string;
  label: string;
  predefined: boolean;
}