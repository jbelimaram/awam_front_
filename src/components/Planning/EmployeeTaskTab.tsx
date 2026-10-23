import { useEffect, useState } from "react";
import { activityService } from "../../Services/activityService";
import { STATUS_LABELS, type Activity } from "../../types/activity";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";
import { shortDay, taskDay } from "./planningUtils";

interface EmployeeTasksTabProps {
  employeeId: number;
  taskTypes: TaskType[];
  /** Parcelles, pour afficher leur nom */
  parcels: { id: number; nom: string }[];
  /** Ouvre la planification de la ferme */
  onOpenPlanning: () => void;
}

/** Onglet Planification d'un employé : ses tâches à réaliser et à entretenir. */
export default function EmployeeTasksTab({ employeeId, taskTypes, parcels, onOpenPlanning }: EmployeeTasksTabProps) {
  const [tasks, setTasks] = useState<Activity[] | null>(null);

  useEffect(() => {
    setTasks(null);
    activityService.employeeTasks(employeeId).then(setTasks).catch(() => setTasks([]));
  }, [employeeId]);

  const parcelName = (id: number) => parcels.find((p) => p.id === id)?.nom ?? "Parcelle";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#111827" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "0 0 6px" }}>Tâches en cours</p>
      {tasks === null && <p style={{ color: "#6b7280", margin: 0 }}>Chargement…</p>}
      {tasks?.length === 0 && <p style={{ color: "#6b7280", margin: 0 }}>Aucune tâche à réaliser ni à entretenir.</p>}
      {tasks?.map((t) => (
        <div key={t.id} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ width: 78, color: "#6b7280", textTransform: "capitalize" }}>{shortDay(taskDay(t))}</span>
          <span style={{ flex: 1 }}>
            <strong>{teamLabel(t.activity_type, taskTypes)}</strong>
            <span style={{ color: "#6b7280" }}> · {parcelName(t.parcel_id)}</span>
          </span>
          <span style={{ fontSize: 11, color: t.status === "a_entretenir" ? "#b45309" : "#1d4ed8" }}>{STATUS_LABELS[t.status]}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpenPlanning}
        style={{ marginTop: 14, border: "1px solid #1b4332", background: "#fff", color: "#1b4332", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Ouvrir la planification →
      </button>
    </div>
  );
}