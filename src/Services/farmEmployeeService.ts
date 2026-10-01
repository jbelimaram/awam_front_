import { api } from "./api";
import type {
  FarmEmployee,
  FarmEmployeeCreatePayload,
  FarmEmployeeUpdatePayload,
} from "../types/farmEmployee";

// api/routes/farm_employees.py, prefix="/farms", monté sous /api
// Gère QUI travaille sur QUELLE ferme, avec QUEL rôle. Différent de
// employeeService : ici on ne crée/supprime jamais la personne elle-même.
export const farmEmployeeService = {
  listByFarm: (farmId: number): Promise<FarmEmployee[]> =>
    api.get<FarmEmployee[]>(`/api/farms/${farmId}/employees`),

  addToFarm: (farmId: number, payload: FarmEmployeeCreatePayload): Promise<FarmEmployee> =>
    api.post<FarmEmployee>(`/api/farms/${farmId}/employees`, payload),

  update: (farmId: number, linkId: number, payload: FarmEmployeeUpdatePayload): Promise<FarmEmployee> =>
    api.put<FarmEmployee>(`/api/farms/${farmId}/employees/${linkId}`, payload),

  // Retire l'employé de CETTE ferme uniquement ; il reste dans l'annuaire
  // global et reste affectable à une autre ferme.
  removeFromFarm: (farmId: number, linkId: number): Promise<void> =>
    api.delete<void>(`/api/farms/${farmId}/employees/${linkId}`),
};