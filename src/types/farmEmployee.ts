import type { Employee } from "./employee";

export type FarmEmployeeRole = "coordinateur" | "membre";

export interface FarmEmployee {
  id: number;
  farm_id: number;
  role: FarmEmployeeRole | null;
  hired_at: string | null;
  is_active: boolean;
  /** Équipe dans cette ferme : code d'un type de tâche, null si sans équipe */
  team?: string | null;
  employee: Employee;
}

export interface FarmEmployeeCreatePayload {
  employee_id: number;
  role?: FarmEmployeeRole;
}

export interface FarmEmployeeUpdatePayload {
  role?: FarmEmployeeRole;
  is_active?: boolean;
  /** Changer d'équipe ; null = retirer de l'équipe */
  team?: string | null;
}