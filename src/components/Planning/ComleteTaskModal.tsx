import { useEffect, useMemo, useState } from "react";
import Modal from "../Common/Modal";
import { activityService } from "../../Services/activityService";
import { useToast } from "../../hooks/useToast";
import type { Activity } from "../../types/activity";
import type { FarmEmployee } from "../../types/farmEmployee";
import { dayToDateTime, isoDay } from "./planningUtils";

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Activity | null;
  taskLabel: string;
  /** Employés de la ferme */
  links: FarmEmployee[];
  onSaved: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid #4b5563", marginTop: 3,
  background: "#111827", color: "#ffffff", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db", display: "block" };

/**
 * Marquer une tâche réalisée : sa date réelle, et les employés qui l'ont
 * VRAIMENT faite (ceux prévus sont cochés d'office). « À entretenir » si
 * elle demande encore un suivi.
 */
export default function CompleteTaskModal({ isOpen, onClose, task, taskLabel, links, onSaved }: CompleteTaskModalProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [followUp, setFollowUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) return;
    setDate(isoDay(new Date()));
    setChecked(new Set(task.employees.map((e) => e.id)));
    setFollowUp(false);
    setError(null);
  }, [isOpen, task]);

  /** Employés proposés : ceux prévus, et les actifs de la ferme */
  const people = useMemo(() => {
    const map = new Map<number, string>();
    task?.employees.forEach((e) => map.set(e.id, e.full_name));
    links.filter((l) => l.employee.is_active !== false).forEach((l) => map.set(l.employee.id, l.employee.full_name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [task, links]);

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!task) return;
    if (!date) return setError("Indiquez la date réelle.");
    if (date > isoDay(new Date())) return setError("La date réelle ne peut pas être dans le futur.");
    if (checked.size === 0) return setError("Cochez au moins un employé qui a fait la tâche.");
    setSaving(true);
    setError(null);
    try {
      await activityService.complete(task.id, {
        performed_at: dayToDateTime(date),
        employee_ids: [...checked],
        follow_up: followUp,
      });
      showToast("success", followUp ? `${taskLabel} réalisée, à entretenir.` : `${taskLabel} réalisée.`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Marquer réalisée · ${taskLabel}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#e5e7eb" }}>
        <label style={labelStyle}>
          Date réelle *
          <input type="date" value={date} max={isoDay(new Date())} onChange={(e) => { setDate(e.target.value); setError(null); }} disabled={saving} style={fieldStyle} aria-label="Date réelle" />
        </label>

        <div>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Employés qui l'ont faite *</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 150, overflowY: "auto" }}>
            {people.map(([id, name]) => (
              <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: checked.has(id) ? "#1f3a2e" : "#1f2937" }}>
                <input type="checkbox" checked={checked.has(id)} onChange={() => toggle(id)} disabled={saving} />
                {name}
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} disabled={saving} />
          <span>
            Demande un suivi <span style={{ color: "#9ca3af" }}>· la tâche passera « à entretenir »</span>
          </span>
        </label>

        {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, background: "transparent", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: 6, padding: "8px 0", cursor: "pointer" }}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "…" : "Marquer réalisée"}
          </button>
        </div>
      </div>
    </Modal>
  );
}