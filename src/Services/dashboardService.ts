


import { api } from "./api";
import type { DashboardParcelsResponse, DashboardStats } from "../types/dashboard";

// api/routes/dashboard.py, prefix="/dashboard", monté sous /api
export const dashboardService = {
  parcels: (): Promise<DashboardParcelsResponse> =>
    api.get<DashboardParcelsResponse>("/api/dashboard/parcels"),

  stats: (): Promise<DashboardStats> => api.get<DashboardStats>("/api/dashboard/stats"),
};