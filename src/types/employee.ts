export interface Employee {
  id: number;
  full_name: string;
  phone?: string | null;
  /** Faux : employé inactif dans toutes ses fermes (conservé avec son historique) */
  is_active?: boolean;
}

export interface EmployeePayload {
  full_name: string;
  phone?: string | null;
  /** Faux : rendre l'employé inactif ; vrai : le réactiver */
  is_active?: boolean;
}