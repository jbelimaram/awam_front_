import { useEffect, useMemo, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { diagnosisService } from "../../Services/diagnosisService";
import { useParcelEventTick } from "../../hooks/useParcelEvents";
import type { ParcelInterpretation } from "../../types/diagnosis";
import { ALERT_LEVEL_STYLE } from "../../utils/alertLevels";

/**
 * Fenêtre de l'historique, en jours calendaires : le satellite ne repasse
 * que tous les 5 jours environ, et une image nuageuse est perdue. Les
 * alertes ne sont plus ici : elles ont leur page, « Alertes ».
 */
const INDICE_DAYS = 30;

type EventKind = "indice";

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

// ----------------------------------------------------------------------
// La carte
// ----------------------------------------------------------------------

/**
 * Historique des analyses satellite de la parcelle sélectionnée, en un seul
 * fil chronologique, à la manière d'un journal d'activité, les plus
 * récentes en haut.
 *
 * Chaque événement a une icône ronde aux couleurs de son niveau, un titre
 * court, une ligne de détail et une étiquette de niveau.
 *
 * Une seule zone défile : le titre reste fixé en haut.
 */
export default function OperationHistoryCard() {
  const { selectedParcelId } = useSelection();
  const [indices, setIndices] = useState<ParcelInterpretation[] | null>(null);

  // Nouvelle analyse : les données sont relues
  const tick = useParcelEventTick(selectedParcelId, ["indices"]);

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

  const loading = indices === null;

  /** Toutes les analyses, regroupées par jour, les plus récentes en haut */
  const days = useMemo(() => {
    const events: HistoryEvent[] = (indices ?? [])
      .map(indiceEvent)
      .filter((e): e is HistoryEvent => e !== null);
    events.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    const byDay = new Map<string, HistoryEvent[]>();
    for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [indices]);

  const emptyText = !selectedParcelId
    ? "Sélectionnez une parcelle pour voir ses analyses."
    : `Aucune analyse sur les ${INDICE_DAYS} derniers jours.`;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* En-tête fixe : reste visible pendant le défilement */}
      <div style={{ position: "sticky", top: -16, zIndex: 1, background: "#fff", margin: "-16px -16px 0", padding: "16px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 15, color: "#111827" }}>Historique</strong>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Analyses satellite : {INDICE_DAYS} j</span>
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