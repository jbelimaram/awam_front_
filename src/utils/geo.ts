import type { GeoJsonGeometry } from "../types/parcel";

/** Formate une surface en hectares, ex. 12.3456 -> "12,35 ha". */
export function formatAreaHa(areaHa: number | null | undefined): string {
  if (areaHa == null || Number.isNaN(areaHa)) return "—";
  return `${areaHa.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`;
}

/**
 * Centre géométrique (centroïde) d'un polygone, pour afficher longitude /
 * latitude. Calculé sur le contour extérieur ; pour un MultiPolygon, on
 * prend le premier polygone.
 */
export function getCentroid(
  geometry: GeoJsonGeometry | null | undefined
): { lon: number; lat: number } | null {
  if (!geometry) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = geometry as any;
  const ring: number[][] | undefined =
    g.type === "Polygon" ? g.coordinates?.[0] :
    g.type === "MultiPolygon" ? g.coordinates?.[0]?.[0] : undefined;
  if (!ring || ring.length < 3) return null;

  let area = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    area += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (area === 0) {
    // Polygone dégénéré : moyenne simple des sommets
    const n = ring.length;
    return {
      lon: ring.reduce((s, p) => s + p[0], 0) / n,
      lat: ring.reduce((s, p) => s + p[1], 0) / n,
    };
  }
  area *= 0.5;
  return { lon: cx / (6 * area), lat: cy / (6 * area) };
}