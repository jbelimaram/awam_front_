export interface GeocodingResult {
  label: string;
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number];
}

/** Recherche un lieu par son nom et renvoie jusqu'à 5 résultats. */
export async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Erreur géocodage: ${res.status}`);
  const data: Array<{
    display_name: string;
    lat: string;
    lon: string;
    boundingbox: [string, string, string, string];
  }> = await res.json();
  return data.map((item) => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    boundingBox: [
      parseFloat(item.boundingbox[2]),
      parseFloat(item.boundingbox[0]),
      parseFloat(item.boundingbox[3]),
      parseFloat(item.boundingbox[1]),
    ],
  }));
}

/** Premier résultat du géocodage, ou null si le lieu est introuvable. */
export async function geocodeLocation(query: string): Promise<GeocodingResult | null> {
  try {
    const results = await geocodeSearch(query);
    return results[0] ?? null;
  } catch {
    return null;
  }
}