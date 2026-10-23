import { useCallback, useEffect, useMemo, useState } from "react";
import { activityService } from "../../Services/activityService";
import { cropService } from "../../Services/cropService";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, type Activity, type ActivityStatus } from "../../types/activity";
import type { Crop } from "../../types/crop";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";
import CompleteTaskModal from "./ComleteTaskModal";
import TaskFormModal from "./TaskFormModal";
import { addDays, isoDay, mondayOf, shortDay, taskDay } from "./planningUtils";

interface PlanningBoardProps {
  parcelId: number;
  parcelName: string;
  links: FarmEmployee[];
  taskTypes: TaskType[];
}

const STATUS_STYLE: Record<ActivityStatus, { color: string; bg: string }> = {
  a_realiser: { color: "#1d4ed8", bg: "#eff6ff" },
  realisee: { color: "#15803d", bg: "#f0fdf4" },
  a_entretenir: { color: "#b45309", bg: "#fffbeb" },
};
const iconButton: React.CSSProperties = {
  border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 12, cursor: "pointer",
};

/**
 * Planification d'une parcelle, semaine par semaine : tâches à réaliser,
 * réalisées et à entretenir, avec leurs tâches attachées en dessous.
 */
export default function PlanningBoard({ parcelId, parcelName, links, taskTypes }: PlanningBoardProps) {
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [tasks, setTasks] = useState<Activity[] | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [formTask, setFormTask] = useState<Activity | null | undefined>(undefined);
  const [completing, setCompleting] = useState<Activity | null>(null);

  const start = isoDay(weekStart);
  const end = isoDay(addDays(weekStart, 6));

  const load = useCallback(() => {
    activityService.planning(parcelId, start, end).then(setTasks).catch(() => setTasks([]));
  }, [parcelId, start, end]);

  useEffect(() => {
    setTasks(null);
    load();
  }, [load]);

  useEffect(() => {
    cropService.listByParcel(parcelId).then(setCrops).catch(() => setCrops([]));
  }, [parcelId]);

  const label = (a: Activity) => teamLabel(a.activity_type, taskTypes);
  const cropLabel = (id?: number | null) => {
    const c = crops.find((x) => x.id === id);
    return c ? c.species_label ?? c.species : null;
  };

  /** Jours de la semaine, avec leurs tâches principales et leurs attachées */
  const days = useMemo(() => {
    const list = tasks ?? [];
    const ids = new Set(list.map((t) => t.id));
    return Array.from({ length: 7 }, (_, i) => {
      const day = isoDay(addDays(weekStart, i));
      const mains = list.filter((t) => taskDay(t) === day && !(t.parent_id && ids.has(t.parent_id)));
      return {
        day,
        items: mains.map((t) => ({ task: t, children: list.filter((c) => c.parent_id === t.id) })),
      };
    });
  }, [tasks, weekStart]);

  const remove = async (t: Activity, hasChildren: boolean) => {
    const extra = hasChildren ? "\n\nSes tâches attachées seront aussi supprimées." : "";
    if (!window.confirm(`Supprimer la tâche « ${label(t)} » du ${shortDay(taskDay(t))} ?${extra}`)) return;
    try {
      await activityService.remove(t.id);
      showToast("success", "Tâche supprimée.");
      load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const closeFollowUp = async (t: Activity) => {
    try {
      await activityService.update(t.id, { status: "realisee" });
      showToast("success", "Suivi terminé : tâche réalisée.");
      load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Opération impossible.");
    }
  };

  const renderTask = (t: Activity, attached = false) => {
    const st = STATUS_STYLE[t.status];
    const crop = cropLabel(t.crop_id);
    return (
      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginLeft: attached ? 22 : 0 }}>
        {attached && <span style={{ color: "#9ca3af" }}>↳</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#111827" }}>
            <strong>{label(t)}</strong>
            {crop && <span style={{ color: "#6b7280" }}> · {crop}</span>}
            {t.team && <span style={{ color: "#6b7280" }}> · Équipe {teamLabel(t.team, taskTypes).toLowerCase()}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {t.employees.map((e) => e.full_name).join(", ") || "Aucun employé"}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
          {STATUS_LABELS[t.status]}
        </span>
        {t.status === "a_realiser" && (
          <button type="button" style={{ ...iconButton, color: "#15803d", borderColor: "#86efac" }} onClick={() => setCompleting(t)} title="Marquer réalisée">✓</button>
        )}
        {t.status === "a_entretenir" && (
          <button type="button" style={{ ...iconButton, color: "#15803d", borderColor: "#86efac" }} onClick={() => closeFollowUp(t)} title="Suivi terminé">✓ Suivi terminé</button>
        )}
        {t.status === "a_realiser" && (
          <button type="button" style={iconButton} onClick={() => setFormTask(t)} title="Modifier la tâche">✎</button>
        )}
        <button
          type="button"
          style={{ ...iconButton, color: "#b91c1c", borderColor: "#fecaca" }}
          onClick={() => remove(t, !attached && (tasks ?? []).some((c) => c.parent_id === t.id))}
          title="Supprimer la tâche"
        >
          🗑
        </button>
      </div>
    );
  };

  const today = isoDay(new Date());

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 15, color: "#111827" }}>Planification · {parcelName}</strong>
        <button
          type="button"
          onClick={() => setFormTask(null)}
          style={{ border: "none", background: "#1b4332", color: "#fff", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          ＋ Nouvelle tâche
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
        <button type="button" style={iconButton} onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Semaine précédente">‹</button>
        <span>
          Semaine du {shortDay(start)} au {shortDay(end)}
        </span>
        <button type="button" style={iconButton} onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Semaine suivante">›</button>
        <button type="button" style={{ ...iconButton, marginLeft: 4 }} onClick={() => setWeekStart(mondayOf(new Date()))}>
          Cette semaine
        </button>
      </div>

      {tasks === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {days.map(({ day, items }) => (
            <div key={day} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ width: 78, flexShrink: 0, fontSize: 12, fontWeight: 600, color: day === today ? "#1b4332" : "#6b7280", textTransform: "capitalize", paddingTop: 6 }}>
                {shortDay(day)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {items.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#d1d5db", paddingTop: 6 }}>—</div>
                ) : (
                  items.map(({ task, children }) => (
                    <div key={task.id}>
                      {renderTask(task)}
                      {children.map((c) => renderTask(c, true))}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskFormModal
        isOpen={formTask !== undefined}
        onClose={() => setFormTask(undefined)}
        parcelId={parcelId}
        parcelName={parcelName}
        links={links}
        taskTypes={taskTypes}
        crops={crops}
        task={formTask ?? null}
        defaultDate={today >= start && today <= end ? today : start}
        onSaved={load}
      />
      <CompleteTaskModal
        isOpen={completing !== null}
        onClose={() => setCompleting(null)}
        task={completing}
        taskLabel={completing ? label(completing) : ""}
        links={links}
        onSaved={load}
      />
    </div>
  );
}