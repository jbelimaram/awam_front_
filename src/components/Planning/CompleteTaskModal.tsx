import { useEffect, useMemo, useState } from "react";
import Dialog from "../Common/Dialog";
import { PEOPLE, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
import { activityService } from "../../Services/activityService";
import { useToast } from "../../hooks/useToast";
import type { Activity } from "../../types/activity";
import type { FarmEmployee } from "../../types/farmEmployee";
import { dayToDateTime, isoDay, nowTime } from "./planningUtils";

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Activity | null;
  taskLabel: string;
  /** Employés de la ferme */
  links: FarmEmployee[];
  onSaved: () => void;
}


/**
 * Marquer une tâche réalisée : sa date et son heure réelles (l'heure
 * actuelle par défaut), et les employés qui l'ont
 * VRAIMENT faite (ceux prévus sont cochés d'office). « À entretenir » si
 * elle demande encore un suivi.
 */
export default function CompleteTaskModal({ isOpen, onClose, task, taskLabel, links, onSaved }: CompleteTaskModalProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [followUp, setFollowUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) return;
    setDate(isoDay(new Date()));
    setTime(nowTime());
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
    if (!time) return setError("Indiquez l'heure de réalisation.");
    if (date === isoDay(new Date()) && time > nowTime()) return setError("L'heure de réalisation ne peut pas être dans le futur.");
    if (checked.size === 0) return setError("Cochez au moins un employé qui a fait la tâche.");
    setSaving(true);
    setError(null);
    try {
      await activityService.complete(task.id, {
        performed_at: dayToDateTime(date, time),
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Marquer réalisée"
      subtitle={taskLabel}
      width={400}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={dialogButton.primary}>
            {saving ? "Enregistrement…" : "✓ Marquer réalisée"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 8 }}>
          <label style={dialogLabel}>
            Date réelle *
            <input type="date" value={date} max={isoDay(new Date())} onChange={(e) => { setDate(e.target.value); setError(null); }} disabled={saving} style={dialogInput} aria-label="Date réelle" />
          </label>
          <label style={dialogLabel}>
            Heure *
            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(null); }} disabled={saving} style={dialogInput} aria-label="Heure de réalisation" />
          </label>
        </div>

        {/* Employés qui ont vraiment fait la tâche : ceux prévus sont cochés */}
        <div style={dialogCard(PEOPLE.tint)}>
          <div style={dialogSection(PEOPLE.text)}><span aria-hidden>👥</span> Employés qui l'ont faite *</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto" }}>
            {people.map(([id, name]) => {
              const on = checked.has(id);
              return (
                <label
                  key={id}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                    background: "#fff", border: `1px solid ${on ? PEOPLE.accent : "#d1d5db"}`, fontSize: 12.5, color: "#111827",
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(id)} disabled={saving} style={{ accentColor: PEOPLE.accent }} />
                  {name}
                </label>
              );
            })}
          </div>
        </div>

        {/* Suivi : la tâche passera « à entretenir » */}
        <label
          style={{
            ...dialogCard("#FAEEDA"), display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
            fontSize: 12.5, color: "#412402",
          }}
        >
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} disabled={saving} style={{ accentColor: "#BA7517", marginTop: 2 }} />
          <span>
            <strong>Demande un suivi</strong>
            <span style={{ display: "block", fontSize: 11.5, color: "#633806" }}>La tâche passera « à entretenir ».</span>
          </span>
        </label>

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}