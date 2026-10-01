import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl, { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import "maplibre-gl/dist/maplibre-gl.css";

import { rasterService } from "../../Services/rasterService";
import { useRasterStatus } from "../../hooks/useRasterStatus";
import type { DashboardParcel } from "../../types/dashboard";
import type { GeoJsonGeometry } from "../../types/parcel";
import type { RasterType } from "../../types/raster";

// ----------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL;

export const BASE_MAPS = {
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
export type BaseMapKey = keyof typeof BASE_MAPS;

interface RasterTypeConfig {
  id: RasterType;
  extraTileParams: string;
}

// Les 3 seuls types exposables en calque carte aujourd'hui côté backend
// (voir types/raster.ts : les 11 autres indices n'existent qu'en
// statistiques via indice_reading, pas en tuile).
const RASTER_TYPES: RasterTypeConfig[] = [
  { id: "mask", extraTileParams: "" },
  { id: "sentinel_rgb", extraTileParams: "" },
  { id: "sentinel_ndvi", extraTileParams: "&rescale=-1,1&colormap_name=rdylgn" },
];

type Bbox = [number, number, number, number];

// ----------------------------------------------------------------------
// API impérative exposée via ref (commandes ponctuelles uniquement ;
// l'état affiché par MapToolbar -- baseMapKey, visibleRasterLayers --
// est levé dans DashboardPage et passé en props, pas géré ici).
// ----------------------------------------------------------------------

export interface ParcelMapCardHandle {
  startDrawing: () => void;
  clearDrawing: () => void;
  /** Géométrie du polygone en cours de dessin, ou null si rien n'est dessiné. */
  getDrawnGeometry: () => GeoJsonGeometry | null;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Centre la carte sur un point (utilisé après géocodage d'une adresse). */
  flyTo: (lon: number, lat: number, zoom?: number) => void;
}

interface ParcelMapCardProps {
  parcelsForSelectedFarm: DashboardParcel[];
  selectedParcel: DashboardParcel | null;
  onSelectParcel: (parcelId: number | null) => void;

  baseMapKey: BaseMapKey;
  visibleRasterLayers: Set<RasterType>;

  /** Notifie le parent à chaque changement du dessin en cours (pour que
   * MapToolbar sache afficher "Effacer" / "Enregistrer"). */
  onDrawChange: (hasDrawn: boolean) => void;
  /** Notifie le parent des rasters en cours de chargement (indicateur "…"). */
  onRasterLoadingChange?: (loading: Set<RasterType>) => void;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function getBboxFromGeometry(geometry: GeoJsonGeometry | null | undefined): Bbox | null {
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

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
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

function buildTileUrl(signedUrl: string, extraTileParams: string): string {
  return `${API_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(
    signedUrl
  )}${extraTileParams}`;
}

function parcelsToFeatureCollection(parcels: DashboardParcel[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: parcels
      .filter((p) => p.geometry != null)
      .map((p) => ({
        type: "Feature",
        properties: { id: p.id, nom: p.nom },
        geometry: p.geometry as unknown as GeoJSON.Geometry,
      })),
  };
}

// ----------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------

const ParcelMapCard = forwardRef<ParcelMapCardHandle, ParcelMapCardProps>(
  function ParcelMapCard(
    {
      parcelsForSelectedFarm,
      selectedParcel,
      onSelectParcel,
      baseMapKey,
      visibleRasterLayers,
      onDrawChange,
      onRasterLoadingChange,
    },
    ref
  ) {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const drawRef = useRef<TerraDraw | null>(null);
    const [mapReady, setMapReady] = useState(false);

    const selectedParcelId = selectedParcel?.id ?? null;
    const { rasterStatus, readyTick } = useRasterStatus(selectedParcelId);

    // ------------------------------------------------------------------
    // Initialisation de la carte (une seule fois)
    // ------------------------------------------------------------------
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

      map.on("load", () => {
        // Contours de toutes les parcelles de la ferme sélectionnée
        map.addSource("farm-parcels", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "farm-parcels-fill",
          type: "fill",
          source: "farm-parcels",
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: "farm-parcels-outline",
          type: "line",
          source: "farm-parcels",
          paint: { "line-color": "#2563eb", "line-width": 2 },
        });

        // Surlignage de la parcelle sélectionnée
        map.addSource("selected-parcel", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "selected-parcel-outline",
          type: "line",
          source: "selected-parcel",
          paint: { "line-color": "#ea580c", "line-width": 3, "line-dasharray": [2, 1] },
        });

        // Clic sur un contour de parcelle -> sélection
        map.on("click", "farm-parcels-fill", (e) => {
          const feature = e.features?.[0];
          const id = feature?.properties?.id;
          if (typeof id === "number") onSelectParcel(id);
        });
        map.on("mouseenter", "farm-parcels-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "farm-parcels-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        // Dessin (TerraDraw)
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
        const notifyDraw = () => onDrawChange(draw.getSnapshot().length > 0);
        draw.on("finish", notifyDraw);
        draw.on("change", notifyDraw);
        drawRef.current = draw;

        setMapReady(true);
      });

      return () => {
        drawRef.current?.stop();
        map.remove();
        mapRef.current = null;
        drawRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ------------------------------------------------------------------
    // Changement de fond de carte
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) return;

      const applyBaseMap = () => {
        const baseConfig = BASE_MAPS[baseMapKey];
        if (map.getLayer("base")) map.removeLayer("base");
        if (map.getSource("base")) map.removeSource("base");
        map.addSource("base", {
          type: "raster",
          tiles: [baseConfig.tiles],
          tileSize: 256,
          maxzoom: baseConfig.maxzoom,
          attribution: baseConfig.attribution,
        });
        const firstOtherLayerId = map.getStyle().layers?.find((l) => l.id !== "base")?.id;
        map.addLayer({ id: "base", type: "raster", source: "base" }, firstOtherLayerId);
      };

      if (map.isStyleLoaded()) {
        applyBaseMap();
      } else {
        map.once("styledata", applyBaseMap);
      }
    }, [baseMapKey, mapReady]);

    // ------------------------------------------------------------------
    // Contours des parcelles de la ferme sélectionnée
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) return;
      const source = map.getSource("farm-parcels") as maplibregl.GeoJSONSource | undefined;
      source?.setData(parcelsToFeatureCollection(parcelsForSelectedFarm));
    }, [parcelsForSelectedFarm, mapReady]);

    // ------------------------------------------------------------------
    // Surlignage + zoom sur la parcelle sélectionnée
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) return;

      const highlightSource = map.getSource("selected-parcel") as
        | maplibregl.GeoJSONSource
        | undefined;

      if (!selectedParcel || !selectedParcel.geometry) {
        highlightSource?.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      highlightSource?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: selectedParcel.id, nom: selectedParcel.nom },
            geometry: selectedParcel.geometry as unknown as GeoJSON.Geometry,
          },
        ],
      });

      const bbox = getBboxFromGeometry(selectedParcel.geometry);
      if (!bbox) return;
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 80, duration: 800, maxZoom: 17 }
      );
    }, [selectedParcel, mapReady]);

    // ------------------------------------------------------------------
    // Rasters de la parcelle sélectionnée
    // ------------------------------------------------------------------
    const loadRasterLayer = useCallback(
      async (config: RasterTypeConfig, parcelId: number) => {
        const map = mapRef.current;
        if (!map) return;

        const signed = await rasterService.current(parcelId, config.id);
        // Ne jamais afficher de tuile pour une URL absente : évite d'envoyer
        // des requêtes de tuiles invalides au navigateur.
        if (!signed.url) return;

        const tileUrl = buildTileUrl(signed.url, config.extraTileParams);
        if (map.getSource(config.id)) {
          map.removeLayer(config.id);
          map.removeSource(config.id);
        }
        map.addSource(config.id, {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          ...(signed.bbox ? { bounds: signed.bbox } : {}),
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

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady || !selectedParcelId) return;
      // Tant que le traitement est en cours, inutile de demander l'URL :
      // elle sera absente. On attend readyTick (déclenché par
      // useRasterStatus quand "pending" bascule vers "ready"/"failed").
      if (rasterStatus === "pending") return;

      (async () => {
        const loading = new Set<RasterType>();
        for (const config of RASTER_TYPES) {
          if (!visibleRasterLayers.has(config.id)) continue;
          loading.add(config.id);
          onRasterLoadingChange?.(new Set(loading));
          await loadRasterLayer(config, selectedParcelId);
          loading.delete(config.id);
          onRasterLoadingChange?.(new Set(loading));
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParcelId, mapReady, visibleRasterLayers, rasterStatus, readyTick]);

    // Visibilité des calques déjà chargés (sans refaire d'appel réseau)
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) return;
      for (const config of RASTER_TYPES) {
        if (!map.getLayer(config.id)) continue;
        map.setLayoutProperty(
          config.id,
          "visibility",
          visibleRasterLayers.has(config.id) ? "visible" : "none"
        );
      }
    }, [visibleRasterLayers, mapReady]);

    // ------------------------------------------------------------------
    // API impérative exposée à MapToolbar
    // ------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        startDrawing: () => {
          const draw = drawRef.current;
          const map = mapRef.current;
          if (!draw || !map) return;
          draw.setMode("polygon");
          map.dragPan.disable();
        },
        clearDrawing: () => {
          const draw = drawRef.current;
          const map = mapRef.current;
          if (!draw || !map) return;
          draw.clear();
          draw.setMode("static");
          map.dragPan.enable();
          onDrawChange(false);
        },
        getDrawnGeometry: () => {
          const draw = drawRef.current;
          if (!draw) return null;
          const snapshot = draw.getSnapshot();
          if (snapshot.length === 0) return null;
          const geometry = snapshot[0].geometry;
          if (geometry.type !== "Polygon") return null;
          return geometry as unknown as GeoJsonGeometry;
        },
        zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
        zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
        flyTo: (lon: number, lat: number, zoom = 14) => {
          mapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 1000 });
        },
      }),
      [onDrawChange]
    );

    return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
  }
);

export default ParcelMapCard;
export { RASTER_TYPES };