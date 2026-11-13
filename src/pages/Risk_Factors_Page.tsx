import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import RiskFactorSheet from "../components/Risk/RiskFactorSheet";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";
import { useToast } from "../hooks/useToast";
import { riskService } from "../Services/riskService";
import { ALERT_TYPE_SATELLITE, ALERT_TYPE_VEGETATION, ALERT_TYPE_WATER } from "../types/alert";
import type { AlertRiskFactors } from "../types/risk";
import { alertLevelStyle } from "../utils/alertLevels";

/** Les types d'alertes : icône et nom (mêmes que la page Alertes) */
const TYPES: Record<string, { icon: string; label: string }> = {
  [ALERT_TYPE_WATER]: { icon: "💧", label: "Besoin en eau" },
  [ALERT_TYPE_SATELLITE]: { icon: "🛰️", label: "Diagnostic satellitaire" },
  [ALERT_TYPE_VEGETATION]: { icon: "🛰️", label: "Anomalie de végétation" },
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

/** Les listes et le mois : même forme que les filtres de la page Alertes, toujours sur fond blanc */
const selectStyle = (chosen: boolean): React.CSSProperties => ({
  fontSize: 12.5, borderRadius: 999, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
  border: `1px solid ${chosen ? "#1b4332" : "#d1d5db"}`,
  background: "#fff", color: chosen ? "#1b4332" : "#4b5563", fontWeight: chosen ? 600 : 400,
  outlineColor: "#1b4332",
});

interface NavState { alertId?: number; month?: string; farmId?: number; parcelId?: number }

function RiskContent({ showFarmForm, onCloseFarmForm }: { showFarmForm: boolean; onCloseFarmForm: () => void }) {
  const { farms, parcels, refreshFarms } = useSelection();
  const { showToast } = useToast();
  const location = useLocation();
  const nav = (location.state as NavState | null) ?? {};
  const [month, setMonth] = useState(nav.month ?? currentMonth());
  const [farmId, setFarmId] = useState<number | null>(nav.farmId ?? null);
  const [parcelId, setParcelId] = useState<number | null>(nav.parcelId ?? null);
  const [items, setItems] = useState<AlertRiskFactors[] | null>(null);
  /** Alertes dépliées : celle demandée depuis la page Alertes l'est à l'arrivée */
  const [openIds, setOpenIds] = useState<number[]>(nav.alertId ? [nav.alertId] : []);
  const toggle = (id: number) => setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  // Arrivée depuis la page Alertes : les filtres de l'alerte choisie
  useEffect(() => {
    const s = (location.state as NavState | null) ?? {};
    if (s.month) setMonth(s.month);
    if (s.farmId) setFarmId(s.farmId);
    if (s.parcelId) setParcelId(s.parcelId);
    if (s.alertId) setOpenIds((ids) => (ids.includes(s.alertId!) ? ids : [...ids, s.alertId!]));
  }, [location.key, location.state]);

  const farmParcels = useMemo(() => parcels.filter((p) => farmId === null || p.farm_id === farmId), [parcels, farmId]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    riskService
      .list(month, farmId, parcelId)
      .then((d) => alive && setItems(d))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Facteurs de risque indisponibles."));
    return () => {
      alive = false;
    };
  }, [month, farmId, parcelId, showToast]);

  useEffect(() => {
    const id = nav.alertId;
    if (items && id) setTimeout(() => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [items, nav.alertId]);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 16, boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <strong style={{ fontSize: 17, color: "#111827" }}>Facteurs de risque</strong>
      </div>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
        <span style={{ padding: "7px 14px", borderBottom: "2px solid #1b4332", color: "#1b4332", fontSize: 13, fontWeight: 600 }}>
          Identification
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select
          aria-label="Ferme"
          style={selectStyle(farmId !== null)}
          value={farmId ?? ""}
          onChange={(e) => {
            setFarmId(e.target.value ? Number(e.target.value) : null);
            setParcelId(null);
          }}
        >
          <option value="">Toutes les fermes</option>
          {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select aria-label="Parcelle" style={selectStyle(parcelId !== null)} value={parcelId ?? ""} onChange={(e) => setParcelId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Toutes les parcelles</option>
          {farmParcels.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <input aria-label="Mois" type="month" style={selectStyle(false)} value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>

      {items === null ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#15803d" }}>✓ Aucune alerte pendant ce mois, pour cette sélection.</p>
      ) : (
        <div style={{ border: "1px solid #C0DD97", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          {/* En-tête de la liste, comme la page Alertes */}
          <div style={{ padding: "10px 14px", background: "#EAF3DE", display: "flex", alignItems: "baseline", gap: 10 }}>
            <strong style={{ fontSize: 13.5, color: "#173404" }}>Alertes du mois</strong>
            <span style={{ fontSize: 12, color: "#3B6D11" }}>{items.length} alerte{items.length > 1 ? "s" : ""} · cliquer pour voir les facteurs</span>
          </div>
          {items.map(({ alert: a, factors }) => {
            const t = TYPES[a.alert_type] ?? { icon: "🔔", label: a.message };
            const lv = alertLevelStyle(a.severity);
            const open = openIds.includes(a.id);
            const flagged = factors.factors.filter((f) => f.flagged === true);
            // Manque d'eau : celui écrit dans l'alerte d'eau (« il manque 2,0 mm »)
            const missing = a.alert_type === ALERT_TYPE_WATER ? /il manque ([\d\s,.]+) mm/.exec(a.evidence ?? "")?.[1]?.trim() : undefined;
            return (
              <div
                key={a.id}
                ref={(el) => { refs.current[a.id] = el; }}
                style={{ borderTop: "1px solid #eef0ee", background: nav.alertId === a.id ? "#f9fafb" : "#fff" }}
              >
                {/* Ligne repliée : type, culture, ferme et parcelle, période, manque d'eau, origine, facteurs signalés */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(a.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(a.id)}
                  style={{ padding: "11px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }}
                >
                  {/* Barre de couleur du niveau, comme la page Alertes */}
                  <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: lv.color }} />
                  <span style={{ fontSize: 12, color: "#6b7280", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <strong style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {t.icon} {t.label} — {a.crop_label ?? "Toute la parcelle"}
                    </strong>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {a.farm_name} · {a.parcel_name}
                      {factors.anomaly_period ? ` · du ${shortDay(factors.anomaly_period.start)} au ${shortDay(factors.anomaly_period.end)}` : ""}
                      {missing ? ` · il manque ${missing} mm` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {factors.decision_label && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Origine probable : <strong style={{ color: "#111827" }}>{factors.decision_label}</strong>
                      </div>
                    )}
                    {flagged.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {flagged.map((f) => (
                          <span
                            key={f.key}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, borderRadius: 999,
                              padding: "2px 9px", border: "1px solid #e5e7eb", background: "#fff", color: "#4b5563",
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D85A30" }} />
                            {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "2px 9px", background: lv.bg, color: lv.color }}>
                    {a.severity_label}
                  </span>
                </div>
                {open && (
                <div style={{ padding: "0 14px 14px 44px" }}>
                  {a.cause && <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 8 }}>{a.cause}{a.evidence ? ` · ${a.evidence}` : ""}</div>}
                  <RiskFactorSheet f={factors} />
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FarmFormModal isOpen={showFarmForm} onClose={onCloseFarmForm} onSaved={(id) => refreshFarms(id)} />
    </div>
  );
}

/**
 * Page « Facteurs de risque » : pour chaque alerte du mois, les facteurs
 * environnementaux et les pratiques agricoles présents avant l'anomalie, et
 * l'origine probable. Onglet « Identification » ; la cartographie des
 * risques viendra dans un second onglet.
 */
export default function RiskFactorsPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <RiskContent showFarmForm={showFarmForm} onCloseFarmForm={() => setShowFarmForm(false)} />
      </DashboardLayout>
    </SelectionProvider>
  );
}