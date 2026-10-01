import { useCallback, useEffect, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { activityService } from "../../Services/activityService";
import type { Activity } from "../../types/activity";

export default function OperationHistoryCard() {
  const { selectedParcelId } = useSelection();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedParcelId) {
      setActivities([]);
      return;
    }
    setLoading(true);
    try {
      const data = await activityService.listByParcel(selectedParcelId);
      setActivities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedParcelId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!selectedParcelId) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#666" }}>
        Sélectionne une parcelle pour voir son historique.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <strong style={{ display: "block", marginBottom: 8 }}>Historique des opérations</strong>

      {loading && <p style={{ color: "#666" }}>Chargement…</p>}
      {!loading && activities.length === 0 && (
        <p style={{ color: "#666" }}>Aucune activité enregistrée.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
        {activities.map((a) => (
          <div key={a.id} style={{ borderLeft: "3px solid #2563eb", paddingLeft: 8 }}>
            <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{a.activity_type}</div>
            <div style={{ color: "#666", fontSize: 11 }}>
              {new Date(a.performed_at).toLocaleDateString("fr-FR")} ·{" "}
              {a.employees.map((e) => e.full_name).join(", ") || "aucun employé"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}