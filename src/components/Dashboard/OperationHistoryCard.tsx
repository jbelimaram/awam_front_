import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { activityService } from "../../Services/activityService";
import { useToast } from "../../hooks/useToast";
import type { Activity } from "../../types/activity";

/** Fenêtre de l'historique affiché, en jours calendaires. */
const HISTORY_DAYS = 5;

const TYPE_ICONS: Record<string, string> = {
  irrigation: "💧",
  recolte: "🌾",
  récolte: "🌾",
  plantation: "🌱",
};

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

/**
 * Historique des opérations des 5 derniers jours, groupé par jour :
 * « ce jour-là, tel employé a fait telle tâche ».
 * L'historique plus ancien reste en base (route sans paramètre `days`).
 */
export default function OperationHistoryCard() {
  const { selectedParcelId } = useSelection();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedParcelId) {
      setActivities([]);
      return;
    }
    setLoading(true);
    try {
      const data = await activityService.listByParcel(selectedParcelId, HISTORY_DAYS);
      setActivities(data);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Historique indisponible.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [selectedParcelId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Regroupement par jour, du plus récent au plus ancien
  const days = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      const key = a.performed_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [activities]);

  if (!selectedParcelId) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
        Sélectionnez une parcelle pour voir son historique.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 14, color: "#111827" }}>Historique</strong>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{HISTORY_DAYS} derniers jours</span>
      </div>

      {loading && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>}

      {!loading && days.length === 0 && (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Aucune opération sur cette période.
        </p>
      )}

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
              {dayLabel(items[0].performed_at)}
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
    </div>
  );
}