import { api } from "./api";
import type { ClimateSite, ClimateSitePayload, ClimateSummary } from "../types/climate";

// api/routes/climate.py, prefix="/climate", monté sous /api
export const climateService = {
  /** Les lieux étudiés ; ceux des fermes sont créés au besoin */
  listSites: (): Promise<ClimateSite[]> => api.get<ClimateSite[]>("/api/climate/sites"),

  /** Étudier un nouveau lieu : préparé ensuite en arrière-plan */
  createSite: (payload: ClimateSitePayload): Promise<ClimateSite> =>
    api.post<ClimateSite>("/api/climate/sites", payload),

  removeSite: (id: number): Promise<void> => api.delete<void>(`/api/climate/sites/${id}`),

  retrySite: (id: number): Promise<ClimateSite> => api.post<ClimateSite>(`/api/climate/sites/${id}/retry`),

  summary: (id: number, scenario: string): Promise<ClimateSummary> =>
    api.get<ClimateSummary>(`/api/climate/sites/${id}/summary?scenario=${encodeURIComponent(scenario)}`),
};