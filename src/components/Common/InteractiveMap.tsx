import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import "maplibre-gl/dist/maplibre-gl.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const RASTER_URL_REFRESH_MS = 50 * 60 * 1000; // 50 min

const BASE_MAPS = {
  satellite: {
    name: "Satellite",
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxzoom: 18,
    attribution: "© Esri, Maxar, Earthstar Geographics",
  },
  topo: {
    name: "Topographique",
    tiles: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    maxzoom: 17,
    attribution: "© OpenTopoMap",
  },
  relief: {
    name: "Relief",
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    maxzoom: 14,
    attribution: "© Esri World Hillshade",
  },
} as const;
type BaseMapKey = keyof typeof BASE_MAPS;

interface RasterTypeConfig {
  id: "mask" | "sentinel_rgb" | "sentinel_ndvi";
  label: string;
  color: string;
  defaultVisible: boolean;
  extraTileParams: string;
}

const RASTER_TYPES: RasterTypeConfig[] = [
  { id: "mask",          label: "Contour des parcelles", color: "#2563eb", defaultVisible: true,  extraTileParams: "" },
  { id: "sentinel_rgb",  label: "Sentinel RGB",          color: "#16a34a", defaultVisible: true,  extraTileParams: "" },
  { id: "sentinel_ndvi", label: "Sentinel NDVI",         color: "#ca8a04", defaultVisible: true,  extraTileParams: "&rescale=-1,1&colormap_name=rdylgn" },
];

interface VectorLayerConfig {
  id: string;
  label: string;
  color: string;
}
const VECTOR_LAYERS: VectorLayerConfig[] = [
  { id: "parcelles", label: "Parcelles (vecteur)", color: "#2563eb" },
];

type Bbox = [number, number, number, number];

interface SignedRaster {
  url: string;
  bbox: Bbox | null;
}

interface Farm {
  id: number;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Parcel {
  id: number;
  nom: string;
  farm_id: number;
  farm_name: string;
  surface_ha?: number;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  created_at?: string | null;
  geometry?: GeoJSON.Geometry;
}

interface GeocodingResult {
  label: string;
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number];
}

interface ParcelFormState {
  name: string;
  culture_type: string;
  soil_type: string;
  irrigation_type: string;
}

const EMPTY_PARCEL_FORM: ParcelFormState = {
  name: "",
  culture_type: "",
  soil_type: "",
  irrigation_type: "",
};

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
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

async function fetchSignedRasterUrl(
  type: string,
  parcelId: number,
): Promise<SignedRaster | null> {
  try {
    const url = `${API_BASE}/api/raster/current?type=${type}&parcel_id=${parcelId}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.url) return null;
    const bbox: Bbox | null =
      Array.isArray(data.bbox) && data.bbox.length === 4 ? (data.bbox as Bbox) : null;
    return { url: data.url, bbox };
  } catch (err) {
    console.error(`Erreur récupération raster ${type}`, err);
    return null;
  }
}

function formatParcelLabel(p: Parcel): string {
  const parts: string[] = [p.nom || "Sans nom"];
  if (p.farm_name) parts.push(p.farm_name);
  if (p.created_at) {
    const d = new Date(p.created_at);
    if (!isNaN(d.getTime())) parts.push(d.toLocaleDateString("fr-FR"));
  }
  return parts.join(" · ");
}

function getBboxFromGeometry(
  geometry: GeoJSON.Geometry | undefined | null
): [number, number, number, number] | null {
  if (!geometry) return null;

  let coords: number[][] = [];

  if (geometry.type === "Polygon") {
    coords = (geometry.coordinates as number[][][]).flat(1);
  } else if (geometry.type === "MultiPolygon") {
    coords = (geometry.coordinates as number[][][][]).flat(2);
  } else {
    return null;
  }

  if (coords.length === 0) return null;

  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const [lon, lat] = c;
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }

  if (!isFinite(minLon) || !isFinite(minLat)) return null;
  return [minLon, minLat, maxLon, maxLat];
}

// ----------------------------------------------------------------------
// Composant principal
// ----------------------------------------------------------------------

export default function InteractiveMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const farmMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [baseMapKey, setBaseMapKey] = useState<BaseMapKey>("satellite");

  // Recherche lieu
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fermes
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [showNewFarmForm, setShowNewFarmForm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [newFarmLat, setNewFarmLat] = useState<number | null>(null);
  const [newFarmLon, setNewFarmLon] = useState<number | null>(null);
  const [farmLocationResults, setFarmLocationResults] = useState<GeocodingResult[]>([]);
  const [farmLocationSearching, setFarmLocationSearching] = useState(false);
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [farmError, setFarmError] = useState<string | null>(null);

  // Édition de ferme
  const [showEditFarmForm, setShowEditFarmForm] = useState(false);
  const [editFarmName, setEditFarmName] = useState("");
  const [editFarmLocation, setEditFarmLocation] = useState("");
  const [editFarmLat, setEditFarmLat] = useState<number | null>(null);
  const [editFarmLon, setEditFarmLon] = useState<number | null>(null);
  const [editLocationResults, setEditLocationResults] = useState<GeocodingResult[]>([]);
  const [editLocationSearching, setEditLocationSearching] = useState(false);
  const [updatingFarm, setUpdatingFarm] = useState(false);
  const [editFarmError, setEditFarmError] = useState<string | null>(null);

  // Parcelles
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);

  // Édition de parcelle
  const [showEditParcelForm, setShowEditParcelForm] = useState(false);
  const [editParcelForm, setEditParcelForm] = useState<ParcelFormState>(EMPTY_PARCEL_FORM);
  const [updatingParcel, setUpdatingParcel] = useState(false);
  const [deletingParcel, setDeletingParcel] = useState(false);
  const [editParcelError, setEditParcelError] = useState<string | null>(null);
  const [isRedrawingParcel, setIsRedrawingParcel] = useState(false);

  // Calques raster
  const [visibleRasterLayers, setVisibleRasterLayers] = useState<Set<string>>(
    () => new Set(RASTER_TYPES.filter((r) => r.defaultVisible).map((r) => r.id))
  );
  const [loadingRasterLayers, setLoadingRasterLayers] = useState<Set<string>>(new Set());

  // Calques vecteur
  const [visibleVectorLayers, setVisibleVectorLayers] = useState<Set<string>>(
    () => new Set(VECTOR_LAYERS.map((l) => l.id))
  );
  const [loadingVectorLayers, setLoadingVectorLayers] = useState<Set<string>>(new Set());

  // Dessin
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savingParcel, setSavingParcel] = useState(false);
  const [showParcelForm, setShowParcelForm] = useState(false);
  const [parcelForm, setParcelForm] = useState<ParcelFormState>(EMPTY_PARCEL_FORM);

  // ====================================================================
  // Chargement des données
  // ====================================================================

  const loadFarms = useCallback(async (selectNewestId?: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/farms`, { credentials: "include" });
      if (!res.ok) return;
      const data: Farm[] = await res.json();
      setFarms(data);
      if (selectNewestId) {
        setSelectedFarmId(selectNewestId);
      } else if (data.length > 0) {
        setSelectedFarmId((prev) => prev ?? data[0].id);
      }
    } catch (e) {
      console.error("Erreur chargement fermes", e);
    }
  }, []);

  const loadParcels = useCallback(async (selectNewestId?: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/parcels`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: Parcel[] = data.parcelles || [];
      setParcels(list);

      if (selectNewestId) {
        setSelectedParcelId(selectNewestId);
      } else if (list.length > 0) {
        setSelectedParcelId((prev) => prev ?? list[0].id);
      }
    } catch (e) {
      console.error("Erreur chargement parcelles", e);
    }
  }, []);

  useEffect(() => {
    loadFarms();
    loadParcels();
  }, [loadFarms, loadParcels]);

  // ====================================================================
  // Création de ferme
  // ====================================================================

  const handleFarmLocationSearch = async (query: string) => {
    setNewFarmLocation(query);
    setNewFarmLat(null);
    setNewFarmLon(null);
    if (!query.trim()) {
      setFarmLocationResults([]);
      return;
    }
    setFarmLocationSearching(true);
    try {
      const results = await geocodeSearch(query);
      setFarmLocationResults(results);
    } catch (err) {
      console.error(err);
      setFarmLocationResults([]);
    } finally {
      setFarmLocationSearching(false);
    }
  };

  const handleFarmLocationSelect = (result: GeocodingResult) => {
    setNewFarmLocation(result.label);
    setNewFarmLat(result.lat);
    setNewFarmLon(result.lon);
    setFarmLocationResults([]);

    const map = mapRef.current;
    if (!map) return;
    farmMarkerRef.current?.remove();
    farmMarkerRef.current = new maplibregl.Marker({ color: "#ea580c" })
      .setLngLat([result.lon, result.lat])
      .addTo(map);
    map.flyTo({ center: [result.lon, result.lat], zoom: 13, duration: 1000 });
  };

  const handleCreateFarm = async () => {
    const name = newFarmName.trim();
    if (!name) {
      setFarmError("Le nom de la ferme est requis.");
      return;
    }
    setCreatingFarm(true);
    setFarmError(null);
    try {
      const res = await fetch(`${API_BASE}/api/farms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location: newFarmLocation.trim() || null,
          latitude: newFarmLat,
          longitude: newFarmLon,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Erreur ${res.status}`);
      }
      const created: Farm = await res.json();
      setNewFarmName("");
      setNewFarmLocation("");
      setNewFarmLat(null);
      setNewFarmLon(null);
      setFarmLocationResults([]);
      farmMarkerRef.current?.remove();
      farmMarkerRef.current = null;
      setShowNewFarmForm(false);
      await loadFarms(created.id);
    } catch (e: any) {
      setFarmError(e.message ?? "Erreur lors de la création de la ferme.");
    } finally {
      setCreatingFarm(false);
    }
  };

  // ====================================================================
  // Modification de ferme
  // ====================================================================

  const openEditFarmForm = () => {
    if (!selectedFarmId) return;
    const farm = farms.find((f) => f.id === selectedFarmId);
    if (!farm) return;

    setEditFarmName(farm.name || "");
    setEditFarmLocation(farm.location || "");
    setEditFarmLat(farm.latitude ?? null);
    setEditFarmLon(farm.longitude ?? null);
    setEditLocationResults([]);
    setEditFarmError(null);
    setShowEditFarmForm(true);
    setShowNewFarmForm(false);
  };

  const handleEditLocationSearch = async (query: string) => {
    setEditFarmLocation(query);
    setEditFarmLat(null);
    setEditFarmLon(null);
    if (!query.trim()) {
      setEditLocationResults([]);
      return;
    }
    setEditLocationSearching(true);
    try {
      const results = await geocodeSearch(query);
      setEditLocationResults(results);
    } catch (err) {
      console.error(err);
      setEditLocationResults([]);
    } finally {
      setEditLocationSearching(false);
    }
  };

  const handleEditLocationSelect = (result: GeocodingResult) => {
    setEditFarmLocation(result.label);
    setEditFarmLat(result.lat);
    setEditFarmLon(result.lon);
    setEditLocationResults([]);

    const map = mapRef.current;
    if (!map) return;
    farmMarkerRef.current?.remove();
    farmMarkerRef.current = new maplibregl.Marker({ color: "#ea580c" })
      .setLngLat([result.lon, result.lat])
      .addTo(map);
    map.flyTo({ center: [result.lon, result.lat], zoom: 13, duration: 1000 });
  };

  const handleUpdateFarm = async () => {
    if (!selectedFarmId) return;
    const name = editFarmName.trim();
    if (!name) {
      setEditFarmError("Le nom de la ferme est requis.");
      return;
    }
    setUpdatingFarm(true);
    setEditFarmError(null);
    try {
      const res = await fetch(`${API_BASE}/api/farms/${selectedFarmId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location: editFarmLocation.trim() || null,
          latitude: editFarmLat,
          longitude: editFarmLon,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Erreur ${res.status}`);
      }
      await loadFarms(selectedFarmId);
      setShowEditFarmForm(false);
      farmMarkerRef.current?.remove();
      farmMarkerRef.current = null;
    } catch (e: any) {
      setEditFarmError(e.message ?? "Erreur lors de la mise à jour.");
    } finally {
      setUpdatingFarm(false);
    }
  };

  const handleDeleteFarm = async () => {
    if (!selectedFarmId) return;
    if (!confirm("Supprimer cette ferme et toutes ses parcelles ?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/farms/${selectedFarmId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(`Erreur ${res.status}`);
      setSelectedFarmId(null);
      setSelectedParcelId(null);
      await loadFarms();
      await loadParcels();
      if (mapRef.current) await refreshVectorLayer(mapRef.current, "parcelles");
    } catch (e: any) {
      alert("❌ " + e.message);
    }
  };

  // ====================================================================
  // Édition de parcelle
  // ====================================================================

  const openEditParcelForm = () => {
    if (!selectedParcelId) return;
    const p = parcels.find((x) => x.id === selectedParcelId);
    if (!p) return;

    setEditParcelForm({
      name: p.nom || "",
      culture_type: p.culture_type || "",
      soil_type: p.soil_type || "",
      irrigation_type: p.irrigation_type || "",
    });
    setEditParcelError(null);
    setIsRedrawingParcel(false);
    setShowEditParcelForm(true);
  };

  const handleUpdateParcel = async () => {
    if (!selectedParcelId) return;
    const name = editParcelForm.name.trim();
    if (!name) {
      setEditParcelError("Le nom est requis.");
      return;
    }

    setUpdatingParcel(true);
    setEditParcelError(null);
    try {
      const res = await fetch(`${API_BASE}/api/parcels/${selectedParcelId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          culture_type: editParcelForm.culture_type.trim() || null,
          soil_type: editParcelForm.soil_type.trim() || null,
          irrigation_type: editParcelForm.irrigation_type.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? `Erreur ${res.status}`);
      }
      await loadParcels(selectedParcelId);
      setShowEditParcelForm(false);
    } catch (e: any) {
      setEditParcelError(e.message ?? "Erreur lors de la mise à jour.");
    } finally {
      setUpdatingParcel(false);
    }
  };

  const handleDeleteParcel = async () => {
    if (!selectedParcelId) return;
    const p = parcels.find((x) => x.id === selectedParcelId);
    const label = p?.nom || `#${selectedParcelId}`;

    if (
      !confirm(
        `Supprimer la parcelle "${label}" ?\n\nCette action supprime aussi tous ses rasters (masque, Sentinel RGB/NDVI).`
      )
    ) {
      return;
    }

    setDeletingParcel(true);
    try {
      const res = await fetch(`${API_BASE}/api/parcels/${selectedParcelId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? `Erreur ${res.status}`);
      }
      setSelectedParcelId(null);
      setShowEditParcelForm(false);
      setIsRedrawingParcel(false);
      await loadParcels();
      if (mapRef.current) await refreshVectorLayer(mapRef.current, "parcelles");
    } catch (e: any) {
      alert("❌ " + e.message);
    } finally {
      setDeletingParcel(false);
    }
  };

  // ====================================================================
  // Redélimitation de parcelle
  // ====================================================================

  const startRedrawParcel = () => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;

    draw.setMode("polygon");
    map.dragPan.disable();
    setIsRedrawingParcel(true);
    setHasDrawn(false);
  };

  const cancelRedrawParcel = () => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;

    draw.clear();
    draw.setMode("static");
    map.dragPan.enable();
    setIsRedrawingParcel(false);
    setHasDrawn(false);
  };

  // ====================================================================
  // Couches vecteur
  // ====================================================================

  const fetchVectorLayer = useCallback(async (layerId: string, bounds?: LngLatBounds) => {
    if (bounds) {
      const w = bounds.getWest();
      const s = bounds.getSouth();
      const e = bounds.getEast();
      const n = bounds.getNorth();
      if (!isFinite(w) || !isFinite(s) || !isFinite(e) || !isFinite(n)) {
        return { type: "FeatureCollection", features: [] };
      }
    }
    const bbox = bounds
      ? `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
      : "";
    const url = `${API_BASE}/vector/layers/${layerId}${bbox ? `?bbox=${bbox}` : ""}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`❌ ${res.status} sur ${url} — ${text}`);
      throw new Error(`Erreur ${res.status} pour la couche ${layerId}`);
    }
    return res.json();
  }, []);

  const refreshVectorLayer = useCallback(
    async (map: MapLibreMap, layerId: string) => {
      setLoadingVectorLayers((prev) => new Set(prev).add(layerId));
      try {
        const data = await fetchVectorLayer(layerId, map.getBounds());
        const source = map.getSource(layerId) as maplibregl.GeoJSONSource | undefined;
        if (source) source.setData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVectorLayers((prev) => {
          const next = new Set(prev);
          next.delete(layerId);
          return next;
        });
      }
    },
    [fetchVectorLayer]
  );

  // ====================================================================
  // Couches raster
  // ====================================================================

  const buildTileUrl = (signedUrl: string, extraTileParams: string) =>
    `${API_BASE}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(
      signedUrl
    )}${extraTileParams}`;

  const upsertRasterLayer = useCallback(
    (map: MapLibreMap, config: RasterTypeConfig, signedUrl: string, bbox: Bbox | null) => {
      const tileUrl = buildTileUrl(signedUrl, config.extraTileParams);
      const existingSource = map.getSource(config.id) as
        | maplibregl.RasterTileSource
        | undefined;

      if (existingSource) {
        map.removeLayer(config.id);
        map.removeSource(config.id);
      }

      map.addSource(config.id, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        ...(bbox ? { bounds: bbox } : {}),
      });
      map.addLayer({
        id: config.id,
        type: "raster",
        source: config.id,
        paint: { "raster-opacity": 0.85 },
      });
    },
    []
  );

  const loadRasterLayer = useCallback(
    async (map: MapLibreMap, config: RasterTypeConfig, parcelId: number) => {
      setLoadingRasterLayers((prev) => new Set(prev).add(config.id));
      try {
        const signed = await fetchSignedRasterUrl(config.id, parcelId);
        if (signed) {
          upsertRasterLayer(map, config, signed.url, signed.bbox);
          if (map.getLayer(config.id)) {
            map.setLayoutProperty(config.id, "visibility", "visible");
          }
        }
      } finally {
        setLoadingRasterLayers((prev) => {
          const next = new Set(prev);
          next.delete(config.id);
          return next;
        });
      }
    },
    [upsertRasterLayer]
  );

  // ====================================================================
  // Initialisation de la carte
  // ====================================================================

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialBase = BASE_MAPS[baseMapKey];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          base: {
            type: "raster",
            tiles: [initialBase.tiles],
            tileSize: 256,
            maxzoom: initialBase.maxzoom,
            attribution: initialBase.attribution,
          },
        },
        layers: [{ id: "base", type: "raster", source: "base" }],
      },
      center: [10.18, 36.81],
      zoom: 11,
      minZoom: 3,
      maxZoom: 18,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    map.on("load", async () => {
      const adapter = new TerraDrawMapLibreGLAdapter({ map });
      const draw = new TerraDraw({
        adapter,
        modes: [
          new TerraDrawPolygonMode({
            styles: {
              fillColor: "#f97316",
              fillOpacity: 0.4,
              outlineColor: "#ea580c",
              outlineWidth: 2,
            },
          }),
        ],
      });
      draw.start();
      draw.setMode("static");
      draw.on("finish", () => setHasDrawn(draw.getSnapshot().length > 0));
      draw.on("change", () => setHasDrawn(draw.getSnapshot().length > 0));
      drawRef.current = draw;

      for (const layer of VECTOR_LAYERS) {
        map.addSource(layer.id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: layer.id,
          type: "circle",
          source: layer.id,
          paint: {
            "circle-radius": 6,
            "circle-color": layer.color,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
        await refreshVectorLayer(map, layer.id);
      }

      // Layer de surlignage pour la parcelle active
      map.addSource("selected-parcel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "selected-parcel-outline",
        type: "line",
        source: "selected-parcel",
        paint: {
          "line-color": "#ea580c",
          "line-width": 3,
          "line-dasharray": [2, 1],
        },
      });
    });

    const onMoveEnd = () => {
      VECTOR_LAYERS.forEach((layer) => {
        if (visibleVectorLayers.has(layer.id)) refreshVectorLayer(map, layer.id);
      });
    };
    map.on("moveend", onMoveEnd);

    return () => {
      drawRef.current?.stop();
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Changement de base map : recréer la source (pour mettre à jour maxzoom)
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyBaseMap = () => {
      if (!map.isStyleLoaded()) return false;

      const baseConfig = BASE_MAPS[baseMapKey];

      if (map.getLayer("base")) {
        map.removeLayer("base");
      }
      if (map.getSource("base")) {
        map.removeSource("base");
      }

      map.addSource("base", {
        type: "raster",
        tiles: [baseConfig.tiles],
        tileSize: 256,
        maxzoom: baseConfig.maxzoom,
        attribution: baseConfig.attribution,
      });

      const firstOtherLayerId = map
        .getStyle()
        .layers?.find((l) => l.id !== "base")?.id;

      map.addLayer(
        { id: "base", type: "raster", source: "base" },
        firstOtherLayerId
      );

      return true;
    };

    if (applyBaseMap()) return;

    const onStyleLoad = () => {
      applyBaseMap();
    };
    map.once("styledata", onStyleLoad);

    return () => {
      map.off("styledata", onStyleLoad);
    };
  }, [baseMapKey]);

  // Zoom + surlignage automatique sur la parcelle sélectionnée
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const highlightSource = map.getSource("selected-parcel") as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!selectedParcelId) {
      highlightSource?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const parcel = parcels.find((p) => p.id === selectedParcelId);
    if (!parcel || !parcel.geometry) return;

    highlightSource?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: parcel.id, nom: parcel.nom },
          geometry: parcel.geometry,
        },
      ],
    });

    const bbox = getBboxFromGeometry(parcel.geometry);
    if (!bbox) return;

    if (isRedrawingParcel) return;

    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 80, duration: 800, maxZoom: 17 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParcelId, isRedrawingParcel]);

  // Chargement des rasters quand la parcelle change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedParcelId || !map.isStyleLoaded()) return;

    (async () => {
      for (const config of RASTER_TYPES) {
        if (visibleRasterLayers.has(config.id)) {
          await loadRasterLayer(map, config, selectedParcelId);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParcelId]);

  // Refresh périodique des URLs signées
  useEffect(() => {
    const interval = setInterval(() => {
      const map = mapRef.current;
      if (!map || !selectedParcelId) return;
      RASTER_TYPES.forEach((config) => {
        if (visibleRasterLayers.has(config.id)) {
          loadRasterLayer(map, config, selectedParcelId);
        }
      });
    }, RASTER_URL_REFRESH_MS);
    return () => clearInterval(interval);
  }, [visibleRasterLayers, loadRasterLayer, selectedParcelId]);

  // ====================================================================
  // Handlers UI
  // ====================================================================

  const toggleRasterLayer = async (config: RasterTypeConfig) => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedParcelId) {
      alert("Sélectionne d'abord une parcelle.");
      return;
    }

    const isVisible = visibleRasterLayers.has(config.id);
    if (isVisible) {
      if (map.getLayer(config.id)) map.setLayoutProperty(config.id, "visibility", "none");
      setVisibleRasterLayers((prev) => {
        const next = new Set(prev);
        next.delete(config.id);
        return next;
      });
    } else {
      setVisibleRasterLayers((prev) => new Set(prev).add(config.id));
      await loadRasterLayer(map, config, selectedParcelId);
    }
  };

  const toggleVectorLayer = (layerId: string) => {
    const map = mapRef.current;
    if (!map) return;
    setVisibleVectorLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
        map.setLayoutProperty(layerId, "visibility", "none");
      } else {
        next.add(layerId);
        map.setLayoutProperty(layerId, "visibility", "visible");
        refreshVectorLayer(map, layerId);
      }
      return next;
    });
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geocodeSearch(value);
        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (result: GeocodingResult) => {
    const map = mapRef.current;
    if (!map) return;
    if (result.boundingBox) {
      const [minLon, minLat, maxLon, maxLat] = result.boundingBox;
      map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 60, duration: 1000 }
      );
    } else {
      map.flyTo({ center: [result.lon, result.lat], zoom: 14, duration: 1000 });
    }
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = new maplibregl.Marker({ color: "#dc2626" })
      .setLngLat([result.lon, result.lat])
      .addTo(map);
    setSearchQuery(result.label);
    setShowResults(false);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
  };

  const handleToggleDrawing = () => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;
    if (isDrawingMode) {
      draw.setMode("static");
      map.dragPan.enable();
      setIsDrawingMode(false);
    } else {
      setParcelForm(EMPTY_PARCEL_FORM);
      setShowParcelForm(false);
      draw.setMode("polygon");
      map.dragPan.disable();
      setIsDrawingMode(true);
    }
  };

  const handleClearDrawing = () => {
    drawRef.current?.clear();
    setHasDrawn(false);
    setShowParcelForm(false);
    setParcelForm(EMPTY_PARCEL_FORM);
    if (isRedrawingParcel) {
      setIsRedrawingParcel(false);
      drawRef.current?.setMode("static");
      mapRef.current?.dragPan.enable();
    }
  };

  const handleSaveParcel = async () => {
    const draw = drawRef.current;
    if (!draw) return;

    const snapshot = draw.getSnapshot();
    if (snapshot.length === 0) {
      alert("Dessine d'abord une parcelle.");
      return;
    }
    const geometry = snapshot[0].geometry;
    if (geometry.type !== "Polygon") {
      alert("Le dessin doit être un polygone.");
      return;
    }

    // ──────────────────────────────────────────────────────────────────
    // CAS 1 : redélimitation d'une parcelle existante
    // ──────────────────────────────────────────────────────────────────
    if (isRedrawingParcel && selectedParcelId) {
      if (
        !confirm(
          "Confirmer le nouveau contour de la parcelle ?\n\nL'ancien contour sera remplacé, la surface recalculée et les rasters régénérés."
        )
      ) {
        return;
      }

      setUpdatingParcel(true);
      try {
        const res = await fetch(`${API_BASE}/api/parcels/${selectedParcelId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geometry }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.detail ?? `Erreur ${res.status}`);
        }

        draw.clear();
        draw.setMode("static");
        mapRef.current?.dragPan.enable();
        setIsRedrawingParcel(false);
        setHasDrawn(false);
        setShowEditParcelForm(false);

        await loadParcels(selectedParcelId);
        if (mapRef.current) await refreshVectorLayer(mapRef.current, "parcelles");
        alert(
          "✅ Contour mis à jour ! La surface a été recalculée et les rasters sont en cours de régénération."
        );
      } catch (e: any) {
        alert("❌ " + e.message);
      } finally {
        setUpdatingParcel(false);
      }
      return;
    }

    // ──────────────────────────────────────────────────────────────────
    // CAS 2 : création d'une nouvelle parcelle
    // ──────────────────────────────────────────────────────────────────
    if (!selectedFarmId) {
      alert("Sélectionne d'abord une ferme.");
      return;
    }

    if (!showParcelForm) {
      setShowParcelForm(true);
      return;
    }

    const name = parcelForm.name.trim();
    if (!name) {
      alert("Le nom de la parcelle est requis.");
      return;
    }

    setSavingParcel(true);
    try {
      const res = await fetch(`${API_BASE}/api/parcels`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name,
          geometry,
          culture_type: parcelForm.culture_type.trim() || null,
          soil_type: parcelForm.soil_type.trim() || null,
          irrigation_type: parcelForm.irrigation_type.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? `Erreur ${res.status}`);
      }
      const created = await res.json();
      const area = created.area_ha != null ? created.area_ha.toFixed(4) : "?";
      alert(`✅ Parcelle "${name}" enregistrée ! (${area} ha) Génération des rasters en cours…`);

      draw.clear();
      setHasDrawn(false);
      setIsDrawingMode(false);
      setShowParcelForm(false);
      setParcelForm(EMPTY_PARCEL_FORM);
      draw.setMode("static");
      mapRef.current?.dragPan.enable();

      if (mapRef.current) await refreshVectorLayer(mapRef.current, "parcelles");
      await loadParcels(created.id ?? created.parcel_id);
    } catch (e: any) {
      alert("❌ " + e.message);
    } finally {
      setSavingParcel(false);
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  // ====================================================================
  // Rendu
  // ====================================================================

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Barre de recherche */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: "min(420px, 90%)", zIndex: 5, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#ffffff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: "8px 12px", gap: 8 }}>
          <span style={{ opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Rechercher un lieu, une ville, une adresse..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14 }}
          />
          {isSearching && <span style={{ opacity: 0.5, fontSize: 12 }}>…</span>}
          {searchQuery && !isSearching && (
            <button onClick={handleClearSearch} style={{ border: "none", background: "none", cursor: "pointer", opacity: 0.5, fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div style={{ marginTop: 4, background: "#ffffff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(result)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13, borderBottom: i < searchResults.length - 1 ? "1px solid #f0f0f0" : "none" }}
              >
                {result.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panneau calques + fermes + parcelles */}
      <div style={{ position: "absolute", top: 16, left: 16, background: "#ffffffee", borderRadius: 8, padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontFamily: "system-ui, sans-serif", fontSize: 14, minWidth: 260, maxWidth: 340, maxHeight: "calc(100vh - 32px)", overflowY: "auto", zIndex: 5 }}>

        {/* Sélecteur de parcelle */}
        <strong style={{ display: "block", marginBottom: 8 }}>Parcelle active</strong>
        <select
          value={selectedParcelId ?? ""}
          onChange={(e) => {
            setSelectedParcelId(Number(e.target.value) || null);
            setShowEditParcelForm(false);
            setIsRedrawingParcel(false);
          }}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 8 }}
        >
          <option value="">— Choisir une parcelle —</option>
          {parcels.map((p) => (
            <option key={p.id} value={p.id}>
              {formatParcelLabel(p)}
            </option>
          ))}
        </select>

        {/* Infos + actions parcelle sélectionnée */}
        {selectedParcelId && !showEditParcelForm && (() => {
          const p = parcels.find((x) => x.id === selectedParcelId);
          if (!p) return null;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6, lineHeight: 1.6 }}>
                {p.surface_ha != null && (
                  <div>📐 Surface : <strong>{p.surface_ha.toFixed(4)} ha</strong></div>
                )}
                {p.culture_type && <div>🌱 Culture : {p.culture_type}</div>}
                {p.soil_type && <div>🪨 Sol : {p.soil_type}</div>}
                {p.irrigation_type && <div>💧 Irrigation : {p.irrigation_type}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={openEditParcelForm}
                  style={{ flex: 1, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={handleDeleteParcel}
                  disabled={deletingParcel}
                  style={{ flex: 1, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 0", fontSize: 12, fontWeight: 600, cursor: deletingParcel ? "wait" : "pointer", opacity: deletingParcel ? 0.6 : 1 }}
                >
                  {deletingParcel ? "…" : "🗑️ Supprimer"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Formulaire d'édition de parcelle */}
        {selectedParcelId && showEditParcelForm && (
          <div style={{ marginBottom: 12, padding: 8, background: "#eff6ff", borderRadius: 6, border: "1px solid #bfdbfe" }}>
            <strong style={{ fontSize: 12, display: "block", marginBottom: 6, color: "#2563eb" }}>✏️ Modifier la parcelle</strong>
            <input
              type="text"
              value={editParcelForm.name}
              onChange={(e) => setEditParcelForm({ ...editParcelForm, name: e.target.value })}
              placeholder="Nom de la parcelle"
              disabled={updatingParcel}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            <input
              type="text"
              value={editParcelForm.culture_type}
              onChange={(e) => setEditParcelForm({ ...editParcelForm, culture_type: e.target.value })}
              placeholder="Type de culture"
              disabled={updatingParcel}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            <input
              type="text"
              value={editParcelForm.soil_type}
              onChange={(e) => setEditParcelForm({ ...editParcelForm, soil_type: e.target.value })}
              placeholder="Type de sol"
              disabled={updatingParcel}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            <input
              type="text"
              value={editParcelForm.irrigation_type}
              onChange={(e) => setEditParcelForm({ ...editParcelForm, irrigation_type: e.target.value })}
              placeholder="Type d'irrigation"
              disabled={updatingParcel}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />

            {!isRedrawingParcel && (
              <button
                onClick={startRedrawParcel}
                disabled={updatingParcel}
                style={{
                  width: "100%",
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fcd34d",
                  borderRadius: 6,
                  padding: "6px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: updatingParcel ? "wait" : "pointer",
                  marginBottom: 6,
                }}
              >
                📍 Redéliminer le contour
              </button>
            )}

            {isRedrawingParcel && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 6,
                  padding: 8,
                  marginBottom: 6,
                  fontSize: 11,
                  color: "#92400e",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4 }}>
                  📍 Mode redélimitation actif
                </strong>
                <p style={{ margin: 0, marginBottom: 6 }}>
                  Dessinez le nouveau contour sur la carte, puis cliquez sur <strong>💾 Enregistrer</strong> (en haut à droite).
                </p>
                <button
                  onClick={cancelRedrawParcel}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: "4px 0",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ❌ Annuler la redélimitation
                </button>
              </div>
            )}

            {editParcelError && <p style={{ fontSize: 11, color: "#dc2626", marginBottom: 4 }}>{editParcelError}</p>}

            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => {
                  setShowEditParcelForm(false);
                  setEditParcelError(null);
                  if (isRedrawingParcel) cancelRedrawParcel();
                }}
                disabled={updatingParcel}
                style={{ flex: 1, background: "#ffffff", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: 6, padding: "6px 0", fontSize: 13, fontWeight: 600, cursor: updatingParcel ? "wait" : "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateParcel}
                disabled={updatingParcel || isRedrawingParcel}
                title={isRedrawingParcel ? "Terminez le dessin et cliquez sur 💾 Enregistrer en haut à droite" : ""}
                style={{
                  flex: 1,
                  background: updatingParcel || isRedrawingParcel ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: updatingParcel || isRedrawingParcel ? "not-allowed" : "pointer",
                  opacity: isRedrawingParcel ? 0.5 : 1,
                }}
              >
                {updatingParcel ? "…" : "💾 Enregistrer"}
              </button>
            </div>
          </div>
        )}

        {/* Rasters */}
        <strong style={{ display: "block", marginTop: 12, marginBottom: 8 }}>Rasters</strong>
        {RASTER_TYPES.map((config) => (
          <label key={config.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={visibleRasterLayers.has(config.id)} onChange={() => toggleRasterLayer(config)} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: config.color }} />
            <span style={{ flex: 1 }}>{config.label}</span>
            {loadingRasterLayers.has(config.id) && <span style={{ opacity: 0.5 }}>…</span>}
          </label>
        ))}

        {/* Vecteur */}
        <strong style={{ display: "block", marginTop: 12, marginBottom: 8 }}>Vecteur</strong>
        {VECTOR_LAYERS.map((layer) => (
          <label key={layer.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={visibleVectorLayers.has(layer.id)} onChange={() => toggleVectorLayer(layer.id)} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: layer.color }} />
            <span style={{ flex: 1 }}>{layer.label}</span>
            {loadingVectorLayers.has(layer.id) && <span style={{ opacity: 0.5 }}>…</span>}
          </label>
        ))}

        {/* Ferme active */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 8 }}>
          <strong>Ferme active</strong>
          <div style={{ display: "flex", gap: 6 }}>
            {selectedFarmId && !showEditFarmForm && (
              <button
                onClick={openEditFarmForm}
                title="Modifier cette ferme"
                style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              >
                ✏️ Modifier
              </button>
            )}
            <button
              onClick={() => {
                setShowNewFarmForm((v) => !v);
                setShowEditFarmForm(false);
                setFarmError(null);
              }}
              style={{ fontSize: 12, color: "#ea580c", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              {showNewFarmForm ? "Annuler" : "+ Nouvelle"}
            </button>
          </div>
        </div>

        {/* Formulaire création ferme */}
        {showNewFarmForm && (
          <div style={{ marginBottom: 8, padding: 8, background: "#fff7ed", borderRadius: 6, border: "1px solid #fed7aa" }}>
            <strong style={{ fontSize: 12, display: "block", marginBottom: 6, color: "#ea580c" }}>🆕 Nouvelle ferme</strong>
            <input
              type="text"
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              placeholder="Nom de la ferme"
              disabled={creatingFarm}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            <input
              type="text"
              value={newFarmLocation}
              onChange={(e) => handleFarmLocationSearch(e.target.value)}
              placeholder="Adresse, ville..."
              disabled={creatingFarm}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            {farmLocationSearching && <span style={{ fontSize: 11, opacity: 0.6 }}>Recherche…</span>}

            {farmLocationResults.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, maxHeight: 150, overflowY: "auto", marginBottom: 4, fontSize: 12 }}>
                {farmLocationResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleFarmLocationSelect(r)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "none", cursor: "pointer", borderBottom: i < farmLocationResults.length - 1 ? "1px solid #eee" : "none" }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {newFarmLat !== null && newFarmLon !== null && (
              <p style={{ fontSize: 11, color: "#16a34a", marginBottom: 4 }}>
                ✅ Position : {newFarmLat.toFixed(4)}, {newFarmLon.toFixed(4)}
              </p>
            )}

            {farmError && <p style={{ fontSize: 11, color: "#dc2626", marginBottom: 4 }}>{farmError}</p>}

            <button
              onClick={handleCreateFarm}
              disabled={creatingFarm}
              style={{ width: "100%", background: "#f97316", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 13, fontWeight: 600, cursor: creatingFarm ? "wait" : "pointer", opacity: creatingFarm ? 0.6 : 1 }}
            >
              {creatingFarm ? "Création…" : "Créer la ferme"}
            </button>
          </div>
        )}

        {/* Formulaire édition ferme */}
        {showEditFarmForm && (
          <div style={{ marginBottom: 8, padding: 8, background: "#eff6ff", borderRadius: 6, border: "1px solid #bfdbfe" }}>
            <strong style={{ fontSize: 12, display: "block", marginBottom: 6, color: "#2563eb" }}>✏️ Modifier la ferme</strong>
            <input
              type="text"
              value={editFarmName}
              onChange={(e) => setEditFarmName(e.target.value)}
              placeholder="Nom de la ferme"
              disabled={updatingFarm}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            <input
              type="text"
              value={editFarmLocation}
              onChange={(e) => handleEditLocationSearch(e.target.value)}
              placeholder="Nouvelle adresse (optionnel)"
              disabled={updatingFarm}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginBottom: 4 }}
            />
            {editLocationSearching && <span style={{ fontSize: 11, opacity: 0.6 }}>Recherche…</span>}

            {editLocationResults.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, maxHeight: 150, overflowY: "auto", marginBottom: 4, fontSize: 12 }}>
                {editLocationResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleEditLocationSelect(r)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "none", cursor: "pointer", borderBottom: i < editLocationResults.length - 1 ? "1px solid #eee" : "none" }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {editFarmLat !== null && editFarmLon !== null && (
              <p style={{ fontSize: 11, color: "#16a34a", marginBottom: 4 }}>
                ✅ Position : {editFarmLat.toFixed(4)}, {editFarmLon.toFixed(4)}
              </p>
            )}

            {editFarmError && <p style={{ fontSize: 11, color: "#dc2626", marginBottom: 4 }}>{editFarmError}</p>}

            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => {
                  setShowEditFarmForm(false);
                  farmMarkerRef.current?.remove();
                  farmMarkerRef.current = null;
                }}
                disabled={updatingFarm}
                style={{ flex: 1, background: "#ffffff", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: 6, padding: "6px 0", fontSize: 13, fontWeight: 600, cursor: updatingFarm ? "wait" : "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateFarm}
                disabled={updatingFarm}
                style={{ flex: 1, background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 13, fontWeight: 600, cursor: updatingFarm ? "wait" : "pointer", opacity: updatingFarm ? 0.6 : 1 }}
              >
                {updatingFarm ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4 }}>
          <select
            value={selectedFarmId ?? ""}
            onChange={(e) => {
              setSelectedFarmId(Number(e.target.value));
              setShowEditFarmForm(false);
            }}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
          >
            {farms.length === 0 && <option value="">Aucune ferme</option>}
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {selectedFarmId && (
            <button onClick={handleDeleteFarm} title="Supprimer cette ferme" style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, padding: "0 4px" }}>🗑️</button>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui, sans-serif", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleToggleDrawing}
            disabled={isRedrawingParcel}
            style={{
              background: isDrawingMode ? "#ea580c" : "#ffffff",
              color: isDrawingMode ? "#ffffff" : "#1a1a1a",
              border: "none",
              borderRadius: 24,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              cursor: isRedrawingParcel ? "not-allowed" : "pointer",
              opacity: isRedrawingParcel ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {isDrawingMode ? "⏹️ Arrêter" : "✏️ Délimiter"}
          </button>

          {hasDrawn && (
            <>
              <button onClick={handleClearDrawing} style={{ background: "#ffffff", border: "none", borderRadius: 24, padding: "10px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", cursor: "pointer", whiteSpace: "nowrap" }}>
                🗑️ Effacer
              </button>
              <button
                onClick={handleSaveParcel}
                disabled={savingParcel || updatingParcel}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 24,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  cursor: savingParcel || updatingParcel ? "wait" : "pointer",
                  opacity: savingParcel || updatingParcel ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {savingParcel || updatingParcel ? "⏳ Enregistrement…" : "💾 Enregistrer"}
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          {(Object.keys(BASE_MAPS) as BaseMapKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setBaseMapKey(key)}
              style={{ padding: "8px 14px", background: baseMapKey === key ? "#f97316" : "#ffffff", color: baseMapKey === key ? "#ffffff" : "#1a1a1a", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", cursor: "pointer", whiteSpace: "nowrap", minWidth: 130 }}
            >
              {BASE_MAPS[key].name}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
          <button
            onClick={handleZoomIn}
            aria-label="Zoom avant"
            style={{ background: "#ffffff", border: "none", width: 40, height: 40, fontSize: 20, fontWeight: 600, cursor: "pointer", borderBottom: "1px solid #eee" }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom arrière"
            style={{ background: "#ffffff", border: "none", width: 40, height: 40, fontSize: 20, fontWeight: 600, cursor: "pointer" }}
          >
            −
          </button>
        </div>
      </div>

      {/* Modal formulaire parcelle (création) */}
      {hasDrawn && showParcelForm && !isRedrawingParcel && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            background: "#ffffff",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            minWidth: 340,
            maxWidth: 420,
            zIndex: 20,
          }}
        >
          <strong style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
            📝 Informations de la parcelle
          </strong>

          <label style={{ display: "block", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#666" }}>Nom *</span>
            <input
              type="text"
              value={parcelForm.name}
              onChange={(e) => setParcelForm({ ...parcelForm, name: e.target.value })}
              placeholder="Ex: Champ Nord"
              autoFocus
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginTop: 2 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#666" }}>Type de culture</span>
            <input
              type="text"
              value={parcelForm.culture_type}
              onChange={(e) => setParcelForm({ ...parcelForm, culture_type: e.target.value })}
              placeholder="Ex: Blé, Olivier, Tomate..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginTop: 2 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#666" }}>Type de sol</span>
            <input
              type="text"
              value={parcelForm.soil_type}
              onChange={(e) => setParcelForm({ ...parcelForm, soil_type: e.target.value })}
              placeholder="Ex: Argileux, Sableux..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginTop: 2 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#666" }}>Type d'irrigation</span>
            <input
              type="text"
              value={parcelForm.irrigation_type}
              onChange={(e) => setParcelForm({ ...parcelForm, irrigation_type: e.target.value })}
              placeholder="Ex: Goutte-à-goutte, Aspersion..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, marginTop: 2 }}
            />
          </label>

          <p style={{ fontSize: 11, color: "#16a34a", marginTop: 8, marginBottom: 8 }}>
            ℹ️ La surface (ha) sera calculée automatiquement
          </p>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button
              onClick={() => {
                setShowParcelForm(false);
                setParcelForm(EMPTY_PARCEL_FORM);
              }}
              disabled={savingParcel}
              style={{
                flex: 1,
                background: "#ffffff",
                color: "#1a1a1a",
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: savingParcel ? "wait" : "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveParcel}
              disabled={savingParcel || !parcelForm.name.trim()}
              style={{
                flex: 2,
                background: savingParcel || !parcelForm.name.trim() ? "#94a3b8" : "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: savingParcel || !parcelForm.name.trim() ? "wait" : "pointer",
              }}
            >
              {savingParcel ? "⏳ Enregistrement…" : "💾 Enregistrer la parcelle"}
            </button>
          </div>
        </div>
      )}

      {/* Message d'aide pour la redélimitation */}
      {isRedrawingParcel && !hasDrawn && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 16,
            background: "rgba(234, 88, 12, 0.9)",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            zIndex: 5,
            fontWeight: 600,
          }}
        >
          📍 Redélimitation : cliquez sur la carte pour dessiner le nouveau contour, puis 💾 Enregistrer.
        </div>
      )}

      {isDrawingMode && !hasDrawn && !isRedrawingParcel && (
        <div style={{ position: "absolute", bottom: 24, left: 16, background: "rgba(0,0,0,0.75)", color: "#ffffff", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "system-ui, sans-serif", zIndex: 5 }}>
          ✏️ Cliquez sur la carte pour dessiner les coins, puis sur le 1er point pour fermer.
        </div>
      )}
    </div>
  );
}