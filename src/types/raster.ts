export type RasterType = "mask" | "sentinel_rgb" | "sentinel_ndvi";

export interface Raster {
  id: number;
  parcel_id: number;
  raster_type: RasterType;
  scene_date: string | null;
  url: string; // URL B2 brute, non signée — voir rasterService.current()
  created_at: string;
}

export interface RasterCurrent {
  url: string | null;
  scene_date: string | null;
  bbox: [number, number, number, number] | null;
}