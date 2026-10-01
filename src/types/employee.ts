export interface Employee {
  id: number;
  full_name: string;
  phone?: string | null;
}

export interface EmployeePayload {
  full_name: string;
  phone?: string | null;
}