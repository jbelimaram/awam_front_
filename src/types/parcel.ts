export interface GeoJsonGeometry {
  type: "Point" | "LineString" | "Polygon" | "MultiPolygon" | string;
  coordinates: unknown;
}

export type RasterStatus = "pending" | "ready" | "failed";

export interface Parcel {
  id: number;
  farm_id: number;
  name: string;
  culture_type?: string | null;
  area_ha?: number | null;
  status: string;
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