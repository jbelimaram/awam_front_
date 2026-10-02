export interface GeoJsonGeometry {
  type: "Point" | "LineString" | "Polygon" | "MultiPolygon" | string;
  coordinates: unknown;
}

// "none" : aucun traitement lancé (parcelle inactive, pas d'analyse satellite)
export type RasterStatus = "pending" | "ready" | "failed" | "none";

export type ParcelStatus = "active" | "inactive";

export interface Parcel {
  id: number;
  farm_id: number;
  name: string;
  culture_type?: string | null;
  area_ha?: number | null;
  status: ParcelStatus;
  geometry?: GeoJsonGeometry | null; // toujours null via GET /parcels, voir dashboard.ts
  cog_url?: string | null;
  sentinel_rgb_url?: string | null;
  sentinel_ndvi_url?: string | null;
  raster_status: RasterStatus;
}

export interface ParcelCreatePayload {
  farm_id: number;
  name: string;
  geometry: GeoJsonGeometry;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  // Une parcelle créée inactive ne déclenche aucune analyse satellite
  status?: "active" | "inactive";
}

export interface ParcelUpdatePayload {
  name?: string;
  geometry?: GeoJsonGeometry;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  status?: "active" | "inactive";
}

export interface ParcelRasterStatusResponse {
  parcel_id: number;
  raster_status: RasterStatus | null;
}

export interface ParcelRefreshResponse {
  parcel_id: number;
  task_id: string;
  status: "pending";
  force_refresh: boolean;
  message: string;
}