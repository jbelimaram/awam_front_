import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";
import { useToast } from "../hooks/useToast";
import { alertService } from "../Services/alertService";
import { ALERT_TYPE_SATELLITE, ALERT_TYPE_VEGETATION, ALERT_TYPE_WATER, type Alert, type AlertsOverview } from "../types/alert";
import { alertLevelStyle, formatAlertDate } from "../utils/alertLevels";

type TypeFilter = "all" | typeof ALERT_TYPE_WATER | typeof ALERT_TYPE_SATELLITE | typeof ALERT_TYPE_VEGETATION;

/** Les types d'alertes : icône et nom */
const TYPES: Record<string, { icon: string; label: string }> = {
  [ALERT_TYPE_WATER]: { icon: "💧", label: "Besoin en eau" },
  [ALERT_TYPE_SATELLITE]: { icon: "🛰️", label: "Diagnostic satellitaire" },
  [ALERT_TYPE_VEGETATION]: { icon: "🛰️", label: "Anomalie de végétation" },
};
const typeOf = (a: Alert) => TYPES[a.alert_type] ?? { icon: "🔔", label: a.message };

const card: React.CSSProperties = { border: "1px solid #C0DD97", borderRadius: 12, overflow: "hidden", background: "#fff" };
const head: React.CSSProperties = { padding: "10px 14px", background: "#EAF3DE", display: "flex", alignItems: "baseline", gap: 10 };
const th: React.CSSProperties = {
  textAlign: "left", fontWeight: 600, color: "#27500A", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em",
  padding: "8px 14px", background: "#EAF3DE", borderBottom: "1px solid #C0DD97", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "9px 14px", borderBottom: "1px solid #eef0ee", color: "#111827", fontSize: 12.5 };
const button: React.CSSProperties = {
  fontSize: 12, padding: "4px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
  color: "#374151", cursor: "pointer", whiteSpace: "nowrap",
};
const primary: React.CSSProperties = { ...button, background: "#1b4332", borderColor: "#1b4332", color: "#fff", fontWeight: 600 };

function Kpi({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 12, padding: "10px 14px", border: `1px solid ${alert ? "#F7C1C1" : "#e5e7eb"}`,
        background: alert ? "#FCEBEB" : "#f6f7f6",
      }}
    >
      <div style={{ fontSize: 12, color: alert ? "#791F1F" : "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: alert ? "#791F1F" : "#111827" }}>{value}</div>
    </div>
  );
}

function AlertsContent({ showFarmForm, onCloseFarmForm }: { showFarmForm: boolean; onCloseFarmForm: () => void }) {
  const { refreshFarms, farms: allFarms, parcels: allParcels } = useSelection();
  /** La ferme de chaque parcelle : une alerte est rattachée à sa ferme par sa parcelle */
  const farmOfParcel = useMemo(() => new Map(allParcels.map((p) => [p.id, p.farm_id])), [allParcels]);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<AlertsOverview | null>(null);
  const [type, setType] = useState<TypeFilter>("all");
  const [farm, setFarm] = useState<string>("all");
  const [parcel, setParcel] = useState<string>("all");
  const [view, setView] = useState<"active" | "closed">("active");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  /** Alerte ouverte depuis la cloche : dépliée et montrée à l'arrivée */
  const requestedId = (location.state as { alertId?: number } | null)?.alertId ?? null;
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    try {
      setData(await alertService.overview());
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Alertes indisponibles.");
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data || requestedId === null) return;
    if (data.active.some((a) => a.id === requestedId)) {
      setView("active");
      setExpandedId(requestedId);
      setTimeout(() => rowRefs.current[requestedId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [data, requestedId, location.key]);

  /** Toutes les fermes de l'utilisateur */
  const farms = useMemo(() => allFarms.map((f) => [String(f.id), f.name] as const), [allFarms]);

  /** Les parcelles de la ferme choisie */
  const parcels = useMemo(
    () => allParcels.filter((p) => farm === "all" || String(p.farm_id) === farm).map((p) => [String(p.id), p.nom] as const),
    [allParcels, farm],
  );

  const keep = (a: Alert) =>
    (type === "all" || a.alert_type === type) &&
    (farm === "all" || String(farmOfParcel.get(a.parcel_id) ?? a.farm_id) === farm) &&
    (parcel === "all" || String(a.parcel_id) === parcel);

  /** Vers la fiche des facteurs de risque de l'alerte */
  const showFactors = (a: Alert) =>
    navigate("/facteurs-risque", {
      state: { alertId: a.id, month: a.created_at.slice(0, 7), farmId: a.farm_id, parcelId: a.parcel_id },
    });

  const resolve = async (a: Alert, resolution: "treated" | "false_alarm") => {
    setBusyId(a.id);
    try {
      await alertService.resolve(a.id, resolution);
      showToast(
        "success",
        resolution === "false_alarm" ? "Alerte clôturée : fausse alerte." : "Alerte clôturée : problème vérifié et traité.",
      );
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Impossible de clôturer l'alerte.");
    } finally {
      setBusyId(null);
    }
  };

  /** Planifier : vers la bonne page, la bonne ferme, la bonne parcelle et le bon onglet */
  const plan = (a: Alert) => {
    if (a.alert_type === ALERT_TYPE_WATER) {
      navigate("/irrigation", { state: { farmId: a.farm_id, parcelId: a.parcel_id, tab: "waterings" } });
    } else {
      navigate("/employes", { state: { farmId: a.farm_id, parcelId: a.parcel_id, view: "planning" } });
    }
  };

  const chip = (key: TypeFilter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setType(key)}
      style={{
        fontSize: 12.5, borderRadius: 999, padding: "5px 12px", cursor: "pointer",
        border: `1px solid ${type === key ? "#1b4332" : "#d1d5db"}`,
        background: type === key ? "#1b4332" : "#fff", color: type === key ? "#fff" : "#4b5563",
      }}
    >
      {label}
    </button>
  );


  /** Les listes ferme et parcelle : même forme que les filtres de type, toujours sur fond blanc */
  const selectStyle = (chosen: boolean): React.CSSProperties => ({
    fontSize: 12.5, borderRadius: 999, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${chosen ? "#1b4332" : "#d1d5db"}`,
    background: "#fff", color: chosen ? "#1b4332" : "#4b5563", fontWeight: chosen ? 600 : 400,
    outlineColor: "#1b4332",
  });


  const active = (data?.active ?? []).filter(keep);
  const closed = (data?.closed ?? []).filter(keep);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 16, boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <strong style={{ fontSize: 17, color: "#111827" }}>Alertes</strong>
        <span style={{ fontSize: 12, color: "#6b7280" }}>vérifiées chaque matin</span>
      </div>

      {data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
            <Kpi label="Alertes actives" value={data.active_count} alert={data.active_count > 0} />
            <Kpi label={`Clôturées · ${data.closed_days} derniers jours`} value={data.closed_count} />
            <Kpi label="Cultures concernées" value={data.crops_concerned} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {chip("all", "Toutes")}
            {chip(ALERT_TYPE_WATER, `${TYPES[ALERT_TYPE_WATER].icon} ${TYPES[ALERT_TYPE_WATER].label}`)}
            {chip(ALERT_TYPE_SATELLITE, `${TYPES[ALERT_TYPE_SATELLITE].icon} ${TYPES[ALERT_TYPE_SATELLITE].label}`)}
            {chip(ALERT_TYPE_VEGETATION, `${TYPES[ALERT_TYPE_VEGETATION].icon} ${TYPES[ALERT_TYPE_VEGETATION].label}`)}
            <select
              value={farm}
              onChange={(e) => {
                setFarm(e.target.value);
                setParcel("all");
              }}
              aria-label="Ferme"
              style={selectStyle(farm !== "all")}
            >
              <option value="all">Toutes les fermes</option>
              {farms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select
              value={parcel}
              onChange={(e) => setParcel(e.target.value)}
              aria-label="Parcelle"
              style={selectStyle(parcel !== "all")}
            >
              <option value="all">Toutes les parcelles</option>
              {parcels.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <div style={{ display: "inline-flex", marginLeft: "auto", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
              {(["active", "closed"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    border: "none", padding: "5px 12px", fontSize: 12.5, cursor: "pointer",
                    background: view === v ? "#EAF3DE" : "#fff", color: view === v ? "#173404" : "#4b5563",
                    fontWeight: view === v ? 600 : 400,
                  }}
                >
                  {v === "active" ? "Actives" : "Clôturées"}
                </button>
              ))}
            </div>
          </div>

          {view === "active" ? (
            <div style={card}>
              <div style={head}>
                <strong style={{ fontSize: 13.5, color: "#173404" }}>Alertes actives</strong>
                <span style={{ fontSize: 12, color: "#3B6D11" }}>de la plus récente à la plus ancienne</span>
              </div>
              {active.length === 0 ? (
                <p style={{ margin: 0, padding: "16px 14px", fontSize: 13, color: "#15803d" }}>✓ Aucune alerte active.</p>
              ) : (
                active.map((a) => {
                  const t = typeOf(a);
                  const lv = alertLevelStyle(a.severity);
                  // Alertes du satellite (diagnostic et anomalie de végétation) : détail dépliable, intervention
                  const satellite = a.alert_type !== ALERT_TYPE_WATER;
                  const expanded = expandedId === a.id;
                  return (
                    <div key={a.id} ref={(el) => { rowRefs.current[a.id] = el; }} style={{ borderTop: "1px solid #eef0ee" }}>
                      <div
                        onClick={satellite ? () => setExpandedId(expanded ? null : a.id) : undefined}
                        style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 14px", cursor: satellite ? "pointer" : "default", flexWrap: "wrap" }}
                      >
                        <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: lv.color }} />
                        {satellite && (
                          <span style={{ fontSize: 12, color: "#6b7280", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                        )}
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                            {t.icon} {t.label} — {a.crop_label ?? "Toute la parcelle"}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            {a.farm_name} · {a.parcel_name} · ouverte le {formatAlertDate(a.created_at)}
                            {satellite && a.last_scene_date ? ` · image du ${formatAlertDate(a.last_scene_date)}` : ""}
                          </div>
                          {!satellite && a.evidence && <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>{a.evidence}</div>}
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "2px 9px", background: lv.bg, color: lv.color, whiteSpace: "nowrap" }}>
                          {a.severity_label}
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                          <button type="button" style={primary} onClick={() => plan(a)}>
                            {satellite ? "Planifier une intervention" : "Planifier un arrosage"}
                          </button>
                          <button type="button" style={button} onClick={() => showFactors(a)}>⚖️ Facteurs de risque</button>
                          <button type="button" style={button} disabled={busyId === a.id} onClick={() => resolve(a, "treated")}>Traitée</button>
                          <button type="button" style={button} disabled={busyId === a.id} onClick={() => resolve(a, "false_alarm")}>Fausse alerte</button>
                        </div>
                      </div>
                      {satellite && expanded && (
                        <div style={{ padding: "0 14px 12px 44px", fontSize: 12.5, color: "#111827", display: "flex", flexDirection: "column", gap: 4 }}>
                          {a.cause && <div><span style={{ color: "#6b7280" }}>Cause probable : </span>{a.cause}</div>}
                          {a.evidence && <div><span style={{ color: "#6b7280" }}>Ce qui l'indique : </span>{a.evidence}</div>}
                          {a.action && <div><span style={{ color: "#6b7280" }}>Action conseillée : </span>{a.action}</div>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={card}>
              <div style={head}>
                <strong style={{ fontSize: 13.5, color: "#173404" }}>Alertes clôturées</strong>
                <span style={{ fontSize: 12, color: "#3B6D11" }}>{data.closed_days} derniers jours</span>
              </div>
              {closed.length === 0 ? (
                <p style={{ margin: 0, padding: "16px 14px", fontSize: 13, color: "#6b7280" }}>Aucune alerte clôturée sur cette période.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr><th style={th}>Alerte</th><th style={th}>Ferme · parcelle</th><th style={th}>Culture</th><th style={th}>Ouverte</th><th style={th}>Clôturée</th><th style={th}>Raison</th></tr>
                    </thead>
                    <tbody>
                      {closed.map((a) => (
                        <tr key={a.id}>
                          <td style={td}>{typeOf(a).icon} {typeOf(a).label}</td>
                          <td style={td}>{a.farm_name} · {a.parcel_name}</td>
                          <td style={td}>{a.crop_label ?? "Toute la parcelle"}</td>
                          <td style={td}>{formatAlertDate(a.created_at)}</td>
                          <td style={td}>{formatAlertDate(a.resolved_at)}</td>
                          <td style={td}>{a.resolution_label ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <FarmFormModal isOpen={showFarmForm} onClose={onCloseFarmForm} onSaved={(farmId) => refreshFarms(farmId)} />
    </div>
  );
}

/**
 * Page « Alertes » : toutes les alertes de toutes les fermes, par type
 * (besoin en eau, diagnostic satellitaire), actives et clôturées sur
 * 30 jours. Les alertes s'ouvrent et se ferment chaque matin, ou par
 * l'utilisateur (« Traitée », « Fausse alerte »).
 */
export default function AlertsPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <AlertsContent showFarmForm={showFarmForm} onCloseFarmForm={() => setShowFarmForm(false)} />
      </DashboardLayout>
    </SelectionProvider>
  );
}