import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { activityService } from "../../Services/activityService";
import { alertService } from "../../Services/alertService";
import { diagnosisService } from "../../Services/diagnosisService";
import { subscribeParcelEvents, useParcelEventTick } from "../../hooks/useParcelEvents";
import { useToast } from "../../hooks/useToast";
import type { Activity } from "../../types/activity";
import type { Alert } from "../../types/alert";
import type { Level, ParcelInterpretation } from "../../types/diagnosis";
import { ALERT_LEVEL_STYLE, alertLevelStyle, formatAlertDate } from "../../utils/alertLevels";

/** Fenêtre de l'historique affiché, en jours calendaires. */
const HISTORY_DAYS = 5;

/** Filtres de la carte : tout, ou une seule partie */
type HistoryFilter = "all" | "indices" | "alerts" | "employees";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "indices", label: "Indices" },
  { key: "alerts", label: "Alertes" },
  { key: "employees", label: "Employés" },
];

const TYPE_ICONS: Record<string, string> = {
  irrigation: "💧",
  recolte: "🌾",
  récolte: "🌾",
  plantation: "🌱",
};

/** Verdict d'un indice face à son seuil */
const INDICATOR_LEVEL: Record<Level, { label: string; color: string }> = {
  low: { label: "sous le seuil", color: "#b91c1c" },
  normal: { label: "normal", color: "#15803d" },
  high: { label: "au-dessus", color: "#1d4ed8" },
  info: { label: "non évalué", color: "#6b7280" },
};

const muted: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: 0 };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 };

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const formatValue = (value: number, unit: string) =>
  `${value.toFixed(unit === "%" ? 0 : 2).replace(".", ",")}${unit ? ` ${unit}` : ""}`;

// ======================================================================
// Employés : chaque employé avec la tâche faite (parcelle sélectionnée)
// ======================================================================

function EmployeeHistory({ parcelId }: { parcelId: number | null }) {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!parcelId) {
      setActivities([]);
      return;
    }
    setLoading(true);
    try {
      const data = await activityService.listByParcel(parcelId, HISTORY_DAYS);
      setActivities(data);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Historique indisponible.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [parcelId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Regroupement par jour, du plus récent au plus ancien
  const days = useMemo(() => {
    const map = new Map<string, Activity[]>();
    // L'historique ne reçoit que des tâches faites, qui ont une date réelle
    for (const a of activities) {
      if (!a.performed_at) continue;
      const key = a.performed_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [activities]);

  if (!parcelId) return <p style={muted}>Sélectionnez une parcelle pour voir ses opérations.</p>;
  if (loading) return <p style={muted}>Chargement…</p>;
  if (days.length === 0) return <p style={muted}>Aucune opération sur cette période.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
      {days.map(([day, items]) => (
        <div key={day}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "capitalize",
              marginBottom: 4,
            }}
          >
            {dayLabel(items[0].performed_at ?? day)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map((a) => (
              <div
                key={a.id}
                style={{
                  borderLeft: "3px solid #1b4332",
                  paddingLeft: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <div style={{ fontSize: 13, color: "#111827", textTransform: "capitalize" }}>
                  {TYPE_ICONS[a.activity_type.toLowerCase()] ?? "📋"} {a.activity_type}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {a.employees.length > 0
                    ? a.employees.map((e) => e.full_name).join(", ")
                    : "Aucun employé affecté"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ======================================================================
// Indices : chaque analyse avec son interprétation (parcelle sélectionnée)
// ======================================================================

function IndiceHistory({ parcelId }: { parcelId: number | null }) {
  const [items, setItems] = useState<ParcelInterpretation[] | null>(null);
  // Nouvelle analyse ou nouvelle interprétation : la liste est relue
  const tick = useParcelEventTick(parcelId, ["indices", "alerts"]);

  useEffect(() => {
    if (!parcelId) {
      setItems(null);
      return;
    }
    let cancelled = false;
    setItems(null);
    diagnosisService
      .interpretations(parcelId, HISTORY_DAYS)
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [parcelId, tick]);

  if (!parcelId) return <p style={muted}>Sélectionnez une parcelle pour voir ses indices.</p>;
  if (items === null) return <p style={muted}>Chargement…</p>;
  if (items.length === 0) return <p style={muted}>Aucune analyse interprétée sur cette période.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
      {items.map((it) => {
        const lv = ALERT_LEVEL_STYLE[it.severity] ?? ALERT_LEVEL_STYLE.normal;
        return (
          <div key={`${it.crop_id}-${it.scene_date}`} style={{ borderLeft: `3px solid ${lv.color}`, paddingLeft: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {formatAlertDate(it.scene_date)} · <span style={{ color: "#111827", fontWeight: 600 }}>{it.crop_label}</span> ·{" "}
              <span style={{ color: lv.color, fontWeight: 700 }}>
                <span aria-hidden>{lv.symbol}</span> {it.severity_label}
              </span>
            </div>
            {it.indicators.map((ind) => {
              const verdict = INDICATOR_LEVEL[ind.level] ?? INDICATOR_LEVEL.info;
              return (
                <div key={ind.name} style={{ fontSize: 12, color: "#111827" }}>
                  {ind.name} {formatValue(ind.value, ind.unit)} ·{" "}
                  <span style={{ color: verdict.color }}>{verdict.label}</span>
                  {ind.threshold_label && <span style={{ color: "#9ca3af" }}> ({ind.threshold_label})</span>}
                </div>
              );
            })}
            {it.reading && <div style={{ fontSize: 11, color: "#6b7280" }}>{it.reading}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ======================================================================
// Alertes : toutes les fermes, regroupées dans l'ordre de la barre latérale
// ======================================================================

function AlertHistory() {
  const { farms } = useSelection();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  const load = useCallback(() => {
    alertService.recent(HISTORY_DAYS).then(setAlerts).catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    load();
    return subscribeParcelEvents((event) => {
      if (event.kind === "alerts") load();
    });
  }, [load]);

  // Une section par ferme, dans l'ordre où les fermes apparaissent à gauche
  const groups = useMemo(() => {
    if (!alerts) return [];
    const byFarm = new Map<number | string, Alert[]>();
    for (const a of alerts) {
      const key = a.farm_id ?? a.farm_name ?? "?";
      const list = byFarm.get(key);
      if (list) list.push(a);
      else byFarm.set(key, [a]);
    }
    const ordered: { name: string; items: Alert[] }[] = [];
    for (const farm of farms) {
      const items = byFarm.get(farm.id);
      if (items) {
        ordered.push({ name: farm.name, items });
        byFarm.delete(farm.id);
      }
    }
    for (const items of byFarm.values()) ordered.push({ name: items[0].farm_name ?? "Ferme", items });
    return ordered;
  }, [alerts, farms]);

  if (alerts === null) return <p style={muted}>Chargement…</p>;
  if (alerts.length === 0) return <p style={muted}>Aucune alerte sur cette période.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
      {groups.map((group) => (
        <div key={group.name}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>{group.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.items.map((a) => {
              const lv = alertLevelStyle(a.severity);
              return (
                <div key={a.id} style={{ borderLeft: `3px solid ${lv.color}`, paddingLeft: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {formatAlertDate(a.last_scene_date)} ·{" "}
                    <span style={{ color: lv.color, fontWeight: 700 }}>
                      <span aria-hidden>{lv.symbol}</span> {a.severity_label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#111827" }}>
                    {a.crop_label ?? "Culture"} · {a.parcel_name} · {a.farm_name}
                  </div>
                  {a.cause && <div style={{ fontSize: 11, color: "#6b7280" }}>{a.cause}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ======================================================================
// La carte
// ======================================================================

/**
 * Historique des 5 derniers jours, avec un filtre :
 *   - Employés : chaque employé avec la tâche faite, sur la parcelle
 *     sélectionnée ;
 *   - Indices  : chaque analyse de la parcelle sélectionnée, avec ses
 *     indices et leur interprétation ;
 *   - Alertes  : les alertes de toutes les fermes, regroupées par ferme ;
 *   - Tout     : les trois parties.
 */
export default function OperationHistoryCard() {
  const { selectedParcelId } = useSelection();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const show = (part: HistoryFilter) => filter === "all" || filter === part;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 14, color: "#111827" }}>Historique</strong>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{HISTORY_DAYS} derniers jours</span>
      </div>

      <div role="tablist" aria-label="Filtrer l'historique" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "3px 10px",
                fontSize: 12,
                borderRadius: 999,
                border: `1px solid ${active ? "#1b4332" : "#d1d5db"}`,
                background: active ? "#1b4332" : "#fff",
                color: active ? "#fff" : "#374151",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {show("employees") && (
          <section>
            {filter === "all" && <div style={sectionTitle}>Employés</div>}
            <EmployeeHistory parcelId={selectedParcelId} />
          </section>
        )}
        {show("indices") && (
          <section>
            {filter === "all" && <div style={sectionTitle}>Indices</div>}
            <IndiceHistory parcelId={selectedParcelId} />
          </section>
        )}
        {show("alerts") && (
          <section>
            {filter === "all" && <div style={sectionTitle}>Alertes · toutes les fermes</div>}
            <AlertHistory />
          </section>
        )}
      </div>
    </div>
  );
}