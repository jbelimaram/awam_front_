import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { alertService } from "../../Services/alertService";
import { diagnosisService } from "../../Services/diagnosisService";
import { subscribeParcelEvents, useParcelEventTick } from "../../hooks/useParcelEvents";
import type { Alert } from "../../types/alert";
import type { ParcelInterpretation } from "../../types/diagnosis";
import { ALERT_LEVEL_STYLE, alertLevelStyle } from "../../utils/alertLevels";

/**
 * Fenêtres de l'historique, en jours calendaires. Les indices remontent
 * plus loin : le satellite ne repasse que tous les 5 jours environ, et une
 * image nuageuse est perdue ; sur 5 jours, il n'y aurait souvent rien.
 */
const INDICE_DAYS = 30;
const ALERT_DAYS = 5;

type EventKind = "indice" | "alert";
type HistoryFilter = "all" | EventKind;

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "indice", label: "Indices" },
  { key: "alert", label: "Alertes" },
];

/** Verdict d'un indice face à son seuil */
const INDICATOR_VERDICT: Record<string, string> = {
  low: "sous le seuil",
  high: "au-dessus du seuil",
  normal: "normal",
};

/** Un événement du fil : analyse satellite ou alerte */
interface HistoryEvent {
  key: string;
  kind: EventKind;
  /** Jour de l'événement (AAAA-MM-JJ) */
  day: string;
  /** Pour l'ordre dans la journée : plus grand = plus récent */
  sortKey: string;
  icon: string;
  /** Fond et couleur de l'icône ronde */
  iconBg: string;
  iconFg: string;
  title: string;
  detail: string;
  badge?: { text: string; color: string; bg: string };
}

const formatNumber = (v: number, unit: string) =>
  `${v.toFixed(unit === "%" ? 0 : 2).replace(".", ",")}${unit ? ` ${unit}` : ""}`;

/** « AUJOURD'HUI », « HIER », sinon « LUNDI 24 OCTOBRE » */
function dayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// ----------------------------------------------------------------------
// Conversion des données en événements du fil
// ----------------------------------------------------------------------

function indiceEvent(it: ParcelInterpretation): HistoryEvent {
  const lv = ALERT_LEVEL_STYLE[it.severity] ?? ALERT_LEVEL_STYLE.normal;
  // L'indice le plus parlant : hors de sa plage normale s'il y en a un
  const key = it.indicators.find((i) => i.level === "low" || i.level === "high") ?? it.indicators[0];
  const verdict = key
    ? `${key.name} ${formatNumber(key.value, key.unit)} ${INDICATOR_VERDICT[key.level] ?? ""}${key.threshold_label ? ` (${key.threshold_label})` : ""}`
    : "";
  return {
    key: `ind-${it.crop_id}-${it.scene_date}`,
    kind: "indice",
    day: it.scene_date,
    sortKey: `${it.scene_date}T00:00:01`,
    icon: "📈",
    iconBg: lv.bg,
    iconFg: lv.color,
    title: `Analyse satellite · ${it.crop_label}`,
    detail: [it.reading, verdict].filter(Boolean).join(" · "),
    badge: { text: it.severity_label, color: lv.color, bg: lv.bg },
  };
}

function alertEvent(a: Alert): HistoryEvent | null {
  const day = a.last_scene_date ?? a.created_at?.slice(0, 10);
  if (!day) return null;
  const lv = alertLevelStyle(a.severity);
  return {
    key: `al-${a.id}`,
    kind: "alert",
    day,
    sortKey: `${day}T00:00:02`,
    icon: "⚠️",
    iconBg: lv.bg,
    iconFg: lv.color,
    title: `${a.severity_label} · ${a.crop_label ?? "Culture"}`,
    detail: [a.cause, `${a.parcel_name} · ${a.farm_name}`].filter(Boolean).join(" · "),
    badge: { text: "Alerte", color: lv.color, bg: lv.bg },
  };
}

// ----------------------------------------------------------------------
// La carte
// ----------------------------------------------------------------------

/**
 * Historique des 5 derniers jours, en un seul fil chronologique, à la
 * manière d'un journal d'activité : analyses satellite de la parcelle
 * sélectionnée et alertes de toutes les fermes, mélangées par date, les
 * plus récentes en haut.
 *
 * Chaque événement a une icône ronde aux couleurs de son niveau, un titre
 * court, une ligne de détail et une étiquette de niveau.
 *
 * Une seule zone défile : le titre et les filtres restent fixés en haut.
 */
export default function OperationHistoryCard() {
  const { selectedParcelId } = useSelection();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [indices, setIndices] = useState<ParcelInterpretation[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  // Nouvelle analyse ou nouvelle alerte : les données sont relues
  const tick = useParcelEventTick(selectedParcelId, ["indices", "alerts"]);

  useEffect(() => {
    if (!selectedParcelId) {
      setIndices([]);
      return;
    }
    let cancelled = false;
    setIndices(null);
    diagnosisService
      .interpretations(selectedParcelId, INDICE_DAYS)
      .then((d) => !cancelled && setIndices(d))
      .catch(() => !cancelled && setIndices([]));
    return () => {
      cancelled = true;
    };
  }, [selectedParcelId, tick]);

  const loadAlerts = useCallback(() => {
    alertService.recent(ALERT_DAYS).then(setAlerts).catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    loadAlerts();
    return subscribeParcelEvents((event) => {
      if (event.kind === "alerts") loadAlerts();
    });
  }, [loadAlerts]);

  const loading = indices === null || alerts === null;

  /** Tous les événements, filtrés, regroupés par jour, les plus récents en haut */
  const days = useMemo(() => {
    const events: HistoryEvent[] = [
      ...(indices ?? []).map(indiceEvent),
      ...(alerts ?? []).map(alertEvent),
    ].filter((e): e is HistoryEvent => e !== null && (filter === "all" || e.kind === filter));
    events.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    const byDay = new Map<string, HistoryEvent[]>();
    for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [indices, alerts, filter]);

  const emptyText =
    !selectedParcelId && filter !== "alert"
      ? "Sélectionnez une parcelle pour voir ses analyses."
      : filter === "indice"
        ? `Aucune analyse sur les ${INDICE_DAYS} derniers jours.`
        : filter === "alert"
          ? `Aucune alerte sur les ${ALERT_DAYS} derniers jours.`
          : "Rien à signaler pour le moment.";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* En-tête fixe : reste visible pendant le défilement */}
      <div style={{ position: "sticky", top: -16, zIndex: 1, background: "#fff", margin: "-16px -16px 0", padding: "16px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <strong style={{ fontSize: 15, color: "#111827" }}>Historique</strong>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Indices : {INDICE_DAYS} j · alertes : {ALERT_DAYS} j
          </span>
        </div>
        <div role="tablist" aria-label="Filtrer l'historique" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  padding: "4px 12px", fontSize: 12, borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${active ? "#1b4332" : "#e5e7eb"}`,
                  background: active ? "#1b4332" : "#fff",
                  color: active ? "#fff" : "#374151", fontWeight: active ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fil chronologique */}
      {loading ? (
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "8px 0 0" }}>Chargement…</p>
      ) : days.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0" }}>{emptyText}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
          {days.map(([day, events]) => (
            <section key={day}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: "#9ca3af", textTransform: "uppercase", margin: "8px 0 6px" }}>
                {dayHeading(day)}
              </div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {events.map((e, i) => (
                  <li key={e.key} style={{ display: "flex", gap: 10, position: "relative", paddingBottom: i < events.length - 1 ? 12 : 4 }}>
                    {/* Trait vertical qui relie les événements du jour */}
                    {i < events.length - 1 && (
                      <span aria-hidden style={{ position: "absolute", left: 14, top: 30, bottom: 0, width: 2, background: "#eef0ee" }} />
                    )}
                    <span
                      aria-hidden
                      style={{
                        width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: e.iconBg, color: e.iconFg,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, position: "relative",
                      }}
                    >
                      {e.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.title}
                        </span>
                        {e.badge && (
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: e.badge.color, background: e.badge.bg, borderRadius: 999, padding: "2px 8px" }}>
                            {e.badge.text}
                          </span>
                        )}
                      </div>
                      {e.detail && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.detail}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}