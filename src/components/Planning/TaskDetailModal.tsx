import Dialog from "../Common/Dialog";
import { dialogButton, dialogCard, dialogSection } from "../Common/dialogStyles";
import { STATUS_LABELS, type Activity } from "../../types/activity";
import { doneTime, plannedTime, shortDay, taskDay } from "./planningUtils";
import { taskStyle } from "./taskStyles";

interface TaskDetailModalProps {
  task: Activity | null;
  /** Tâches attachées, si c'est une tâche principale */
  attached: Activity[];
  onClose: () => void;
  label: (a: Activity) => string;
  cropLabel: (id?: number | null) => string | null;
  teamName: (code: string) => string;
  overdue: boolean;
  onComplete: (a: Activity) => void;
  onCloseFollowUp: (a: Activity) => void;
  onEdit: (a: Activity) => void;
  onDelete: (a: Activity) => void;
  onOpen: (a: Activity) => void;
}

/** Une ligne : « Libellé · valeur », séparée par un trait fin */
const line: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0",
  borderBottom: "1px solid #f0f1f0", fontSize: 13, color: "#374151",
};
const dim: React.CSSProperties = { color: "#6b7280" };

/** Couleur de l'étiquette d'état */
const STATE_BADGE: Record<string, { bg: string; fg: string }> = {
  a_realiser: { bg: "#eef5f0", fg: "#1b4332" },
  realisee: { bg: "#f3f4f6", fg: "#4b5563" },
  a_entretenir: { bg: "#FAEEDA", fg: "#633806" },
  overdue: { bg: "#FCEBEB", fg: "#A32D2D" },
};

/**
 * Détail d'une tâche du calendrier, dans le style clair d'AWAM : son état,
 * ses dates, sa culture, son équipe et ses employés, ses tâches attachées,
 * et ses actions dans le pied de la fenêtre.
 */
export default function TaskDetailModal({
  task, attached, onClose, label, cropLabel, teamName, overdue,
  onComplete, onCloseFollowUp, onEdit, onDelete, onOpen,
}: TaskDetailModalProps) {
  if (!task) return null;
  const st = taskStyle(task.activity_type);
  const crop = cropLabel(task.crop_id);
  const badge = overdue ? STATE_BADGE.overdue : STATE_BADGE[task.status] ?? STATE_BADGE.a_realiser;

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={`${st.icon} ${label(task)}`}
      subtitle={shortDay(taskDay(task))}
      width={440}
      footer={
        <>
          <button
            type="button"
            onClick={() => onDelete(task)}
            style={{ ...dialogButton.secondary, color: "#b91c1c", borderColor: "#fecaca", marginRight: "auto" }}
          >
            Supprimer
          </button>
          {task.status === "a_realiser" && (
            <>
              <button type="button" onClick={() => onEdit(task)} style={dialogButton.secondary}>
                ✎ Modifier
              </button>
              <button type="button" onClick={() => onComplete(task)} style={dialogButton.primary}>
                ✓ Marquer réalisée
              </button>
            </>
          )}
          {task.status === "a_entretenir" && (
            <button type="button" onClick={() => onCloseFollowUp(task)} style={dialogButton.primary}>
              ✓ Suivi terminé
            </button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={line}>
            <span style={dim}>État</span>
            <span style={{ fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.fg, borderRadius: 999, padding: "2px 10px" }}>
              {overdue ? "En retard" : STATUS_LABELS[task.status]}
            </span>
          </div>
          {task.planned_for && (
            <div style={line}>
              <span style={dim}>Date prévue</span>
              <span>{shortDay(task.planned_for)}{plannedTime(task) ? ` à ${plannedTime(task)}` : ""}</span>
            </div>
          )}
          {task.performed_at && (
            <div style={line}><span style={dim}>Réalisée le</span><span>{shortDay(taskDay({ ...task, planned_for: null }))} à {doneTime(task)}</span></div>
          )}
          <div style={line}><span style={dim}>Culture</span><span>{crop ?? "Toute la parcelle"}</span></div>
          <div style={line}><span style={dim}>Équipe</span><span>{task.team ? `Équipe ${teamName(task.team).toLowerCase()}` : "Aucune"}</span></div>
          <div style={{ ...line, borderBottom: "none" }}>
            <span style={dim}>Employés</span>
            <span style={{ textAlign: "right" }}>{task.employees.map((e) => e.full_name).join(", ") || "Aucun"}</span>
          </div>
        </div>

        {attached.length > 0 && (
          <div style={dialogCard("#f6f7f6")}>
            <div style={dialogSection("#374151")}><span aria-hidden>🔗</span> Tâches attachées</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {attached.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpen(c)}
                  style={{
                    display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 8,
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 10px",
                    cursor: "pointer", fontSize: 12.5, color: "#111827", fontFamily: "inherit",
                  }}
                >
                  <span>↳ {taskStyle(c.activity_type).icon} {label(c)} · {shortDay(taskDay(c))}</span>
                  <span style={{ color: "#6b7280", fontSize: 11.5 }}>{STATUS_LABELS[c.status]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}