import { api } from "./api";
import type { Employee, EmployeePayload } from "../types/employee";

// api/routes/employees.py, monté sous /api
// ⚠️ Annuaire global : list() renvoie TOUS les employés, sans filtre
// utilisateur ni ferme. Pour "les employés de ma ferme", voir farmEmployeeService.
export const employeeService = {
  list: (): Promise<Employee[]> => api.get<Employee[]>("/api/employees"),

  get: (id: number): Promise<Employee> => api.get<Employee>(`/api/employees/${id}`),

  create: (payload: EmployeePayload): Promise<Employee> =>
    api.post<Employee>("/api/employees", payload),

  update: (id: number, payload: Partial<EmployeePayload>): Promise<Employee> =>
    api.put<Employee>(`/api/employees/${id}`, payload),

  // ⚠️ Supprime la personne DÉFINITIVEMENT, de partout. Pour "retirer un
  // employé d'une ferme" sans le supprimer, voir farmEmployeeService.removeFromFarm.
  remove: (id: number): Promise<void> => api.delete<void>(`/api/employees/${id}`),
};