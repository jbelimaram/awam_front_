import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Dialog from "../Common/Dialog";
import { SECTION_TINT, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
import { BASE_MAPS } from "../Dashboard/ParcelMapCard";
import { climateService } from "../../Services/climateService";
import type { ClimateSite } from "../../types/climate";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (site: ClimateSite) => void;
}

/** Vue de départ : la Tunisie entière (sud-ouest, nord-est) */
const TUNISIA: [[number, number], [number, number]] = [[7.5, 30.2], [11.6, 37.6]];

/**
 * « Étudier un lieu » : un clic sur la carte place le lieu (ou ses
 * coordonnées se saisissent à la main), puis on lui donne un nom. Sa
 * projection climatique est ensuite préparée en arrière-plan.
 */
export default function ClimateSiteFormModal({ isOpen, onClose, onCreated }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setLat("");
    setLon("");
    setError(null);
  }, [isOpen]);

  // Petite carte : créée à l'ouverture, détruite à la fermeture
  useEffect(() => {
    if (!isOpen || !container.current) return;
    const base = BASE_MAPS.satellite;
    const m = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: { base: { type: "raster", tiles: [base.tiles], tileSize: 256, maxzoom: base.maxzoom, attribution: base.attribution } },
        layers: [{ id: "base", type: "raster", source: "base" }],
      },
      bounds: TUNISIA,
    });
    // La fenêtre finit de s'ouvrir après la création de la carte : on la
    // recale sur sa taille définitive, puis sur la Tunisie entière
    const fit = () => {
      m.resize();
      m.fitBounds(TUNISIA, { padding: 10, duration: 0 });
    };
    m.once("load", fit);
    const timer = window.setTimeout(fit, 250);
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("click", (e) => {
      setLat(e.lngLat.lat.toFixed(4));
      setLon(e.lngLat.lng.toFixed(4));
      setError(null);
    });
    map.current = m;
    return () => {
      window.clearTimeout(timer);
      marker.current?.remove();
      marker.current = null;
      m.remove();
      map.current = null;
    };
  }, [isOpen]);

  // Le repère suit les coordonnées, qu'elles viennent d'un clic ou de la saisie
  useEffect(() => {
    const m = map.current;
    const la = Number(lat);
    const lo = Number(lon);
    if (!m || lat === "" || lon === "" || !Number.isFinite(la) || !Number.isFinite(lo)) return;
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) return;
    if (!marker.current) marker.current = new maplibregl.Marker({ color: "#1b4332" }).setLngLat([lo, la]).addTo(m);
    else marker.current.setLngLat([lo, la]);
    // Des coordonnées saisies à la main peuvent tomber hors de la vue
    if (!m.getBounds().contains([lo, la])) m.easeTo({ center: [lo, la], duration: 400 });
  }, [lat, lon]);

  const save = async () => {
    const la = Number(lat);
    const lo = Number(lon);
    if (!name.trim()) return setError("Donnez un nom au lieu.");
    if (lat === "" || lon === "" || !Number.isFinite(la) || !Number.isFinite(lo)) {
      return setError("Cliquez sur la carte, ou saisissez la latitude et la longitude.");
    }
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) return setError("Ces coordonnées ne correspondent à aucun lieu.");
    setSaving(true);
    setError(null);
    try {
      const site = await climateService.createSite({ name: name.trim(), latitude: la, longitude: lo });
      onCreated(site);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Étudier un lieu"
      subtitle="Son climat 2020-2040 sera préparé en arrière-plan"
      width={520}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving} style={dialogButton.primary}>
            {saving ? "Enregistrement…" : "Étudier ce lieu"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={dialogLabel}>
          Nom du lieu *
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            maxLength={150}
            placeholder="Ex. Terrain de Siliana nord"
            style={dialogInput}
          />
        </label>

        <div style={dialogCard(SECTION_TINT.blue)}>
          <div style={dialogSection("#185FA5")}><span aria-hidden>📍</span> Position</div>
          <div
            ref={container}
            style={{ height: 230, borderRadius: 8, overflow: "hidden", border: "1px solid #d1d5db", cursor: "crosshair" }}
          />
          <div style={{ fontSize: 11.5, color: "#6b7280", margin: "6px 0 8px" }}>
            Cliquez sur la carte pour placer le lieu, ou saisissez ses coordonnées.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={dialogLabel}>
              Latitude
              <input value={lat} onChange={(e) => { setLat(e.target.value); setError(null); }} inputMode="decimal" placeholder="36.0800" style={dialogInput} />
            </label>
            <label style={dialogLabel}>
              Longitude
              <input value={lon} onChange={(e) => { setLon(e.target.value); setError(null); }} inputMode="decimal" placeholder="9.3700" style={dialogInput} />
            </label>
          </div>
        </div>

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}