import type { GeoJsonGeometry, ParcelStatus, RasterStatus } from "./parcel";

export interface DashboardParcel {
  id: number;
  nom: string;
  farm_id: number;
  farm_name: string;
  geometry: GeoJsonGeometry | null;
  surface_m2: number;
  surface_ha: number;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  status: ParcelStatus;
  raster_status: RasterStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface DashboardParcelsResponse {
  total: number;
  surface_totale_m2: number;
  surface_totale_ha: number;
  parcelles: DashboardParcel[];
}

export interface DashboardStats {
  nb_parcelles: number;
  nb_fermes: number;
  surface_totale_m2: number;
  surface_totale_ha: number;
}