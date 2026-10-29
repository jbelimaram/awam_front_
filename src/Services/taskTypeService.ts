import { api } from "./api";
import type { TaskType } from "../types/taskType";

// Correspond à app/api/routes/task_types.py, monté sous /api.
// Aucune table dédiée : un type personnalisé se crée en le TAPANT, pour une
// tâche ou une équipe ; il reste proposé tant qu'une tâche ou une équipe le
// porte, et disparaît seul ensuite.
export const taskTypeService = {
  /** Types prédéfinis, puis types personnalisés du compte */
  list: (): Promise<TaskType[]> => api.get<TaskType[]>("/api/task-types"),
};