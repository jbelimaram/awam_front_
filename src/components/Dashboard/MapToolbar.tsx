import { RefObject, useRef, useState } from "react";
import type { ParcelMapCardHandle, BaseMapKey } from "./ParcelMapCard.tsx";
import { BASE_MAPS } from "./ParcelMapCard.tsx";
import { geocodeSearch, type GeocodingResult } from "../../utils/geocode";
import { INDICE_CATALOG, getIndiceInfo, referenceLabel } from "../../utils/indices";

const BASE_MAP_LABELS: Record<BaseMapKey, { label: string; icon: string }> = {
  satellite: { label: "Satellite", icon: "🛰️" },
  topo: { label: "Topographique", icon: "🗺️" },
  relief: { label: "Relief", icon: "⛰️" },
};

type PanelKey = "layers" | "indices";

interface MapToolbarProps {
  mapRef: RefObject<ParcelMapCardHandle>;
  baseMapKey: BaseMapKey;
  onBaseMapChange: (key: BaseMapKey) => void;
  hasDrawn: boolean;
  onRequestSave: () => void;
  canDraw: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Indice suivi au survol des parcelles ; null = aucun survol. */
  hoverIndice: string | null;
  onHoverIndiceChange: (name: string | null) => void;
}

/** Petit bouton carré de la colonne de droite. */
function IconButton({
  children,
  title,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        border: "none",
        borderRadius: 7,
        background: active ? "#1b4332" : "#ffffff",
        color: active ? "#ffffff" : "#111827",
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 5px rgba(0,0,0,0.22)",
      }}
    >
      {children}
    </button>
  );
}

/** Bouton d'action du dessin, colonne de gauche. */
function DrawButton({
  children,
  title,
  onClick,
  disabled = false,
  active = false,
  color,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 34,
        height: 34,
        border: "none",
        borderRadius: 7,
        background: active ? "#ea580c" : "#ffffff",
        color: active ? "#ffffff" : color ?? "#111827",
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 5px rgba(0,0,0,0.22)",
      }}
    >
      {children}
    </button>
  );
}

/** Panneau fin qui s'ouvre à gauche d'un bouton de la colonne de droite. */
function SidePanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 42,
        top: 0,
        width: 210,
        maxHeight: 300,
        overflowY: "auto",
        background: "#ffffff",
        borderRadius: 8,
        boxShadow: "0 3px 14px rgba(0,0,0,0.2)",
        padding: "10px 12px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export default function MapToolbar({
  mapRef,
  baseMapKey,
  onBaseMapChange,
  hasDrawn,
  onRequestSave,
  canDraw,
  isFullscreen,
  onToggleFullscreen,
  hoverIndice,
  onHoverIndiceChange,
}: MapToolbarProps) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [infoIndice, setInfoIndice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePanel = (key: PanelKey) =>
    setOpenPanel((cur) => (cur === key ? null : key));

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

  const info = infoIndice ? getIndiceInfo(infoIndice) : null;

  return (
    <>
      {/* ---------- Recherche, en haut au centre ---------- */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(340px, 55%)",
          zIndex: 5,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#ffffff",
            borderRadius: 999,
            boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
            padding: "6px 13px",
            gap: 7,
          }}
        >
          <span style={{ opacity: 0.45, fontSize: 12 }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Rechercher un lieu…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 12, background: "transparent" }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowResults(false);
              }}
              title="Effacer"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}
            >
              ×
            </button>
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div style={{ marginTop: 4, background: "#ffffff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.18)", overflow: "hidden" }}>
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 11px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#374151" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Dessin, colonne de GAUCHE ---------- */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <DrawButton
          title={canDraw ? "Créer un polygone" : "Sélectionnez d'abord une ferme"}
          onClick={handleToggleDrawing}
          disabled={!canDraw}
          active={isDrawingMode}
        >
          {isDrawingMode ? "⏹" : "✏️"}
        </DrawButton>

        <DrawButton
          title="Supprimer le polygone"
          onClick={() => mapRef.current?.clearDrawing()}
          disabled={!hasDrawn}
          color="#b42318"
        >
          🗑
        </DrawButton>

        <DrawButton
          title="Enregistrer la parcelle"
          onClick={handleSave}
          disabled={!hasDrawn}
          color="#15803d"
        >
          ✓
        </DrawButton>
      </div>

      {/* ---------- Navigation, colonne de DROITE ---------- */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <IconButton title="Zoom avant" onClick={() => mapRef.current?.zoomIn()}>＋</IconButton>
        <IconButton title="Zoom arrière" onClick={() => mapRef.current?.zoomOut()}>−</IconButton>
        <IconButton
          title={isFullscreen ? "Quitter le plein écran" : "Agrandir la carte"}
          onClick={onToggleFullscreen}
          active={isFullscreen}
        >
          {isFullscreen ? "⤡" : "⛶"}
        </IconButton>

        {/* Fond de carte */}
        <div style={{ position: "relative", marginTop: 10 }}>
          <IconButton
            title="Fond de carte"
            onClick={() => togglePanel("layers")}
            active={openPanel === "layers"}
          >
            ▤
          </IconButton>

          {openPanel === "layers" && (
            <SidePanel>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 7 }}>
                Fond de carte
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(Object.keys(BASE_MAPS) as BaseMapKey[]).map((key) => {
                  const isActive = baseMapKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onBaseMapChange(key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 9px",
                        borderRadius: 6,
                        border: `1px solid ${isActive ? "#1b4332" : "#e5e7eb"}`,
                        background: isActive ? "#1b4332" : "#ffffff",
                        color: isActive ? "#ffffff" : "#374151",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{BASE_MAP_LABELS[key].icon}</span>
                      <span>{BASE_MAP_LABELS[key].label}</span>
                    </button>
                  );
                })}
              </div>
            </SidePanel>
          )}
        </div>

        {/* Indices */}
        <div style={{ position: "relative" }}>
          <IconButton
            title="Indices de végétation"
            onClick={() => togglePanel("indices")}
            active={openPanel === "indices"}
          >
            🌿
          </IconButton>

          {openPanel === "indices" && (
            <SidePanel>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 3 }}>
                Indices
              </div>
              <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 7px", lineHeight: 1.4 }}>
                Choisissez l'indice affiché au survol des parcelles.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.keys(INDICE_CATALOG).map((name) => {
                  const isHover = hoverIndice === name;
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => onHoverIndiceChange(isHover ? null : name)}
                        style={{
                          flex: 1,
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: `1px solid ${isHover ? "#1b4332" : "#e5e7eb"}`,
                          background: isHover ? "#1b4332" : "#ffffff",
                          color: isHover ? "#ffffff" : "#374151",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoIndice(infoIndice === name ? null : name)}
                        title="Définition"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "1px solid #e5e7eb",
                          background: infoIndice === name ? "#eef2ff" : "#ffffff",
                          color: "#6b7280",
                          fontSize: 10,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        i
                      </button>
                    </div>
                  );
                })}
              </div>

              {hoverIndice && (
                <button
                  type="button"
                  onClick={() => onHoverIndiceChange(null)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "5px 0",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    color: "#6b7280",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Désactiver le survol
                </button>
              )}
            </SidePanel>
          )}
        </div>
      </div>

      {/* ---------- Pop-up de définition d'un indice ---------- */}
      {info && infoIndice && (
        <div
          style={{
            position: "absolute",
            right: 262,
            top: 90,
            width: 240,
            background: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 3px 16px rgba(0,0,0,0.22)",
            padding: "11px 13px",
            fontFamily: "system-ui, sans-serif",
            fontSize: 11,
            lineHeight: 1.45,
            color: "#374151",
            zIndex: 11,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{infoIndice}</div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{info.fullName}</div>
            </div>
            <button
              type="button"
              onClick={() => setInfoIndice(null)}
              aria-label="Fermer"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 15, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <p style={{ margin: "7px 0 0" }}>{info.description}</p>

          <p style={{ margin: "6px 0 0", fontSize: 10, color: "#9ca3af" }}>
            Formule : {info.formula}
          </p>

          {referenceLabel(info) && (
            <p style={{ margin: "6px 0 0", color: "#374151", fontWeight: 600 }}>
              {referenceLabel(info)}
            </p>
          )}

          {info.notes?.map((note, i) => (
            <p key={i} style={{ margin: "3px 0 0", color: "#6b7280" }}>
              {note}
            </p>
          ))}
        </div>
      )}

      {/* ---------- Aide au dessin ---------- */}
      {isDrawingMode && !hasDrawn && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(17,24,39,0.85)",
            color: "#ffffff",
            padding: "7px 13px",
            borderRadius: 999,
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            zIndex: 5,
            whiteSpace: "nowrap",
          }}
        >
          Cliquez pour poser les coins, puis sur le premier point pour fermer.
        </div>
      )}
    </>
  );
}