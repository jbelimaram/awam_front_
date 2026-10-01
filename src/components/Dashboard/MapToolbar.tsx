import { RefObject, useRef, useState } from "react";
import type { ParcelMapCardHandle, BaseMapKey } from "./ParcelMapCard";
import { BASE_MAPS, RASTER_TYPES } from "./ParcelMapCard";
import type { RasterType } from "../../types/raster";
import { geocodeSearch, type GeocodingResult } from "../../utils/geocode";

const RASTER_LABELS: Record<RasterType, string> = {
  mask: "Contour de la parcelle",
  sentinel_rgb: "Sentinel RGB",
  sentinel_ndvi: "Sentinel NDVI",
};

interface MapToolbarProps {
  mapRef: RefObject<ParcelMapCardHandle>;
  baseMapKey: BaseMapKey;
  onBaseMapChange: (key: BaseMapKey) => void;
  visibleRasterLayers: Set<RasterType>;
  onToggleRasterLayer: (type: RasterType) => void;
  loadingRasterLayers: Set<RasterType>;
  hasDrawn: boolean;
  onRequestSave: () => void;
  canDraw: boolean;
}

export default function MapToolbar({
  mapRef,
  baseMapKey,
  onBaseMapChange,
  visibleRasterLayers,
  onToggleRasterLayer,
  loadingRasterLayers,
  hasDrawn,
  onRequestSave,
  canDraw,
}: MapToolbarProps) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleDrawing = () => {
    if (!canDraw) return;
    if (isDrawingMode) {
      mapRef.current?.clearDrawing();
      setIsDrawingMode(false);
    } else {
      mapRef.current?.startDrawing();
      setIsDrawingMode(true);
    }
  };

  const handleClear = () => {
    mapRef.current?.clearDrawing();
  };

  const handleSave = () => {
    onRequestSave();
    setIsDrawingMode(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await geocodeSearch(value);
        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        console.error(err);
      }
    }, 400);
  };

  const handleSelectResult = (result: GeocodingResult) => {
    mapRef.current?.flyTo(result.lon, result.lat, 14);
    setSearchQuery(result.label);
    setShowResults(false);
  };

  return (
    <>
      {/* Recherche */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: "min(420px, 90%)", zIndex: 5, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#ffffff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: "8px 12px", gap: 8 }}>
          <span style={{ opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Rechercher un lieu..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14 }}
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div style={{ marginTop: 4, background: "#ffffff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13 }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panneau calques */}
      <div style={{ position: "absolute", top: 16, left: 16, background: "#ffffffee", borderRadius: 8, padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontFamily: "system-ui, sans-serif", fontSize: 14, minWidth: 220, zIndex: 5 }}>
        <strong style={{ display: "block", marginBottom: 8 }}>Rasters</strong>
        {RASTER_TYPES.map((config) => (
          <label key={config.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={visibleRasterLayers.has(config.id)}
              onChange={() => onToggleRasterLayer(config.id)}
            />
            <span style={{ flex: 1 }}>{RASTER_LABELS[config.id]}</span>
            {loadingRasterLayers.has(config.id) && <span style={{ opacity: 0.5 }}>…</span>}
          </label>
        ))}
      </div>

      {/* Actions */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui, sans-serif", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleToggleDrawing}
            disabled={!canDraw}
            style={{
              background: isDrawingMode ? "#ea580c" : "#ffffff",
              color: isDrawingMode ? "#ffffff" : "#1a1a1a",
              border: "none",
              borderRadius: 24,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              cursor: canDraw ? "pointer" : "not-allowed",
              opacity: canDraw ? 1 : 0.5,
            }}
          >
            {isDrawingMode ? "⏹️ Arrêter" : "✏️ Délimiter"}
          </button>
          {hasDrawn && (
            <>
              <button onClick={handleClear} style={{ background: "#ffffff", border: "none", borderRadius: 24, padding: "10px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", cursor: "pointer" }}>
                🗑️ Effacer
              </button>
              <button onClick={handleSave} style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 24, padding: "10px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", cursor: "pointer" }}>
                💾 Enregistrer
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          {(Object.keys(BASE_MAPS) as BaseMapKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onBaseMapChange(key)}
              style={{ padding: "8px 14px", background: baseMapKey === key ? "#f97316" : "#ffffff", color: baseMapKey === key ? "#ffffff" : "#1a1a1a", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", cursor: "pointer", minWidth: 130 }}
            >
              {BASE_MAPS[key].name}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
          <button onClick={() => mapRef.current?.zoomIn()} style={{ background: "#ffffff", border: "none", width: 40, height: 40, fontSize: 20, fontWeight: 600, cursor: "pointer", borderBottom: "1px solid #eee" }}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()} style={{ background: "#ffffff", border: "none", width: 40, height: 40, fontSize: 20, fontWeight: 600, cursor: "pointer" }}>−</button>
        </div>
      </div>

      {isDrawingMode && !hasDrawn && (
        <div style={{ position: "absolute", bottom: 24, left: 16, background: "rgba(0,0,0,0.75)", color: "#ffffff", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "system-ui, sans-serif", zIndex: 5 }}>
          ✏️ Cliquez sur la carte pour dessiner les coins, puis sur le 1er point pour fermer.
        </div>
      )}
    </>
  );
}