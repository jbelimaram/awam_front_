/**
 * Type de tâche : nomme les tâches et les équipes. Prédéfini, ou
 * personnalisé : tapé par l'utilisateur, proposé tant qu'une tâche ou une
 * équipe le porte, dans toutes ses fermes.
 */
export interface TaskType {
  /** Toujours vide : les types n'ont pas de table dédiée */
  id: number | null;
  /** Valeur enregistrée dans la tâche ou l'équipe */
  code: string;
  label: string;
  predefined: boolean;
}