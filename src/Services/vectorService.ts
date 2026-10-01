import { api } from "./api";
import type { VectorFeatureCollection, VectorLayerId } from "../types/vector";

// api/routes/vector_layers.py, prefix="/vector" — monté SANS /api dans main.py
export const vectorService = {
  getLayer: (
    layerId: VectorLayerId,
    bbox?: [number, number, number, number]
  ): Promise<VectorFeatureCollection> => {
    const query = bbox ? `?bbox=${bbox.join(",")}` : "";
    return api.get<VectorFeatureCollection>(`/vector/layers/${layerId}${query}`);
  },
};