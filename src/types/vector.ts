import type { GeoJsonGeometry } from "./parcel";

export type VectorLayerId = "parcelles" | "points_interet";

export interface VectorFeature {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
}

export interface VectorFeatureCollection {
  type: "FeatureCollection";
  features: VectorFeature[];
}