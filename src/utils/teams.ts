import type { TaskType } from "../types/taskType";

/**
 * Libellé d'une équipe d'après son code (un type de tâche), ou « Sans
 * équipe ». Partagé par la liste des employés et l'onglet Équipes.
 */
export const teamLabel = (code: string | null | undefined, taskTypes: TaskType[]): string =>
  code ? taskTypes.find((t) => t.code === code)?.label ?? code : "Sans équipe";