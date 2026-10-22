import { api } from "./api";
import type { TaskType } from "../types/taskType";

// Correspond à app/api/routes/task_types.py, monté sous /api
export const taskTypeService = {
  /** Types prédéfinis, puis types libres du compte */
  list: (): Promise<TaskType[]> => api.get<TaskType[]>("/api/task-types"),

  create: (name: string): Promise<TaskType> => api.post<TaskType>("/api/task-types", { name }),

  /** Renomme un type libre : les équipes qui le portent suivent */
  rename: (id: number, name: string): Promise<TaskType> =>
    api.put<TaskType>(`/api/task-types/${id}`, { name }),

  /** Refusé tant qu'une équipe porte ce type */
  remove: (id: number): Promise<void> => api.delete<void>(`/api/task-types/${id}`),
};