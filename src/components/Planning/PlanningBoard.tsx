import { useCallback, useEffect, useMemo, useState } from "react";
import { activityService } from "../../Services/activityService";
import { cropService } from "../../Services/cropService";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, type Activity } from "../../types/activity";
import type { Crop } from "../../types/crop";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";
import CompleteTaskModal from "./CompleteTaskModal";
import TaskDetailModal from "./TaskDetailModal";
import TaskFormModal from "./TaskFormModal";
import { addDays, addMonths, doneTime, isoDay, isOverdue, mondayOf, monthGrid, monthLabel, plannedTime, shortDay, startOfMonth, taskDay } from "./planningUtils";
import { FOLLOW_UP_BORDER, OVERDUE_BORDER, OVERDUE_TEXT, taskStyle } from "./taskStyles";

interface PlanningBoardProps {
  parcelId: number;
  parcelName: string;
  links: FarmEmployee[];
  taskTypes: TaskType[];
}

/** Une ligne du calendrier : une tâche, principale ou attachée */
interface Line {
  task: Activity;
  attached: boolean;
}

/** Liste affichée à droite : un jour, ou un compteur du résumé */
interface TaskList {
  title: string;
  lines: Line[];
  /** Jour concerné, pour « Ajouter » ; absent pour un compteur */
  day?: string;
  /** Compteur : ses jours, encadrés dans le calendrier */
  highlight?: string[];
  /** Compteur « en retard » : jours encadrés en rouge */
  danger?: boolean;
}

/** Points de couleur affichés sous un jour, au plus */
const MAX_DOTS = 4;
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
/** Le résumé « en retard » remonte jusqu'à 6 mois */
const OVERDUE_LOOKBACK_DAYS = 180;

/** Vert d'AWAM */
const GREEN = "#1b4332";
const LINE = "#e5e7eb";

/**
 * Jour sélectionné : clair et encadré, dans la couleur de l'état de ses
 * tâches (priorité : en retard, à entretenir, à réaliser, réalisées).
 */
const SELECTED_STYLE = {
  late: { bg: "#FCEBEB", border: "#E24B4A", text: "#791F1F" },
  followUp: { bg: "#FAEEDA", border: "#BA7517", text: "#633806" },
  todo: { bg: "#EAF3DE", border: "#3B6D11", text: "#27500A" },
  done: { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" },
};

/** État d'un jour, pour la couleur de sa sélection */
function dayState(lines: Line[], today: string): keyof typeof SELECTED_STYLE {
  if (lines.some((l) => isOverdue(l.task, today))) return "late";
  if (lines.some((l) => l.task.status === "a_entretenir")) return "followUp";
  if (lines.length > 0 && lines.every((l) => l.task.status === "realisee")) return "done";
  return "todo";
}

/** Survol des jours et des tâches : impossible en style en ligne */
const CALENDAR_CSS = `
.awam-cal-cell[aria-pressed="false"]:hover { background: #eaf4ee !important; border-color: #b9d8c4 !important; }
.awam-cal-task:hover { filter: brightness(0.97); }
`;

/** Initiales d'un employé : « Ahmed Ben Salah » → « AB » */
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

/**
 * Planification d'une parcelle, en deux cartes côte à côte :
 *   - à gauche, le CALENDRIER du mois en tuiles arrondies : sous chaque
 *     numéro, les points de couleur de ses types de tâche et « N tâches »,
 *     ou « En retard » en rouge ; aujourd'hui est encadré de vert ; le jour
 *     choisi est clair et encadré, dans la couleur de l'état de ses tâches
 *     (rouge : en retard ; ambre : à entretenir ; vert : à réaliser ;
 *     gris : toutes réalisées) ;
 *   - à droite, les TÂCHES DU JOUR CHOISI : type, état, culture, équipe et
 *     employés ; ou celles d'un compteur du résumé ;
 *   - en haut, un résumé cliquable : aujourd'hui, en retard, cette semaine.
 * L'état d'une tâche se lit au style : barrée si réalisée, étiquette rouge
 * si en retard, pointillés si à entretenir. Sur un écran étroit, la carte
 * des tâches passe sous le calendrier.
 */
export default function PlanningBoard({ parcelId, parcelName, links, taskTypes }: PlanningBoardProps) {
  const { showToast } = useToast();
  const today = isoDay(new Date());
  const weekStart = isoDay(mondayOf(new Date()));
  const weekEnd = isoDay(addDays(mondayOf(new Date()), 6));

  /** Mois affiché (1er du mois) */
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  /** Jour choisi : ses tâches s'affichent à droite */
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState<Activity[] | null>(null);
  /** Tâches des 6 derniers mois à la fin de la semaine : pour le résumé */
  const [summaryTasks, setSummaryTasks] = useState<Activity[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [formTask, setFormTask] = useState<Activity | null | undefined>(undefined);
  const [formDate, setFormDate] = useState(today);
  const [completing, setCompleting] = useState<Activity | null>(null);
  const [detail, setDetail] = useState<Activity | null>(null);
  /** Liste d'un compteur du résumé, à la place du jour choisi */
  const [taskList, setTaskList] = useState<TaskList | null>(null);

  /** Jours affichés : les semaines complètes du mois */
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const start = isoDay(days[0]);
  const end = isoDay(days[days.length - 1]);

  const loadSummary = useCallback(() => {
    activityService
      .planning(parcelId, isoDay(addDays(new Date(), -OVERDUE_LOOKBACK_DAYS)), weekEnd)
      .then(setSummaryTasks)
      .catch(() => setSummaryTasks([]));
  }, [parcelId, weekEnd]);

  const load = useCallback(() => {
    activityService.planning(parcelId, start, end).then(setTasks).catch(() => setTasks([]));
    loadSummary();
  }, [parcelId, start, end, loadSummary]);

  useEffect(() => {
    setTasks(null);
    load();
  }, [load]);

  useEffect(() => {
    cropService.listByParcel(parcelId).then(setCrops).catch(() => setCrops([]));
  }, [parcelId]);

  const label = (a: Activity) => teamLabel(a.activity_type, taskTypes);
  const teamName = (code: string) => teamLabel(code, taskTypes);
  const cropLabel = (id?: number | null) => {
    const c = crops.find((x) => x.id === id);
    return c ? c.species_label ?? c.species : null;
  };

  /** Ordonne des tâches : chaque principale, suivie de ses attachées */
  const toLines = useCallback((list: Activity[], all: Activity[]): Line[] => {
    const ids = new Set(all.map((t) => t.id));
    const lines: Line[] = [];
    for (const t of list) {
      if (t.parent_id && ids.has(t.parent_id) && list.some((p) => p.id === t.parent_id)) continue;
      lines.push({ task: t, attached: Boolean(t.parent_id) });
      for (const c of list.filter((x) => x.parent_id === t.id)) lines.push({ task: c, attached: true });
    }
    return lines;
  }, []);

  /** Lignes de chaque jour */
  const linesByDay = useMemo(() => {
    const list = tasks ?? [];
    const byDay = new Map<string, Activity[]>();
    for (const t of list) {
      const parent = t.parent_id ? list.find((p) => p.id === t.parent_id) : undefined;
      // Une tâche attachée s'affiche sous sa principale, au jour de la principale
      const day = parent ? taskDay(parent) : taskDay(t);
      byDay.set(day, [...(byDay.get(day) ?? []), t]);
    }
    const map = new Map<string, Line[]>();
    for (const [day, dayTasks] of byDay) map.set(day, toLines(dayTasks, list));
    return map;
  }, [tasks, toLines]);

  /** Résumé : aujourd'hui, en retard, cette semaine (tâches encore à faire) */
  const summary = useMemo(() => {
    const todo = summaryTasks.filter((t) => t.status === "a_realiser");
    return {
      today: todo.filter((t) => taskDay(t) === today),
      overdue: todo.filter((t) => isOverdue(t, today)),
      week: todo.filter((t) => taskDay(t) >= weekStart && taskDay(t) <= weekEnd),
    };
  }, [summaryTasks, today, weekStart, weekEnd]);

  const childrenOf = (t: Activity) =>
    [...(tasks ?? []), ...summaryTasks].filter((c, i, arr) => c.parent_id === t.id && arr.findIndex((x) => x.id === c.id) === i);

  // --- Navigation --------------------------------------------------------
  const move = (step: number) => setAnchor((a) => addMonths(a, step));
  const goToday = () => {
    setAnchor(startOfMonth(new Date()));
    setSelected(today);
    setTaskList(null);
  };
  /** Le calendrier passe sur le mois d'un jour, s'il n'y est pas déjà */
  const showMonthOf = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (d.getFullYear() !== anchor.getFullYear() || d.getMonth() !== anchor.getMonth()) setAnchor(startOfMonth(d));
  };
  const selectDay = (iso: string) => {
    setSelected(iso);
    setTaskList(null);
    showMonthOf(iso);
  };

  /**
   * Clic sur un compteur du résumé (aujourd'hui, en retard, cette semaine) :
   *   - une seule date : ce jour est sélectionné, comme un clic dans le
   *     calendrier, qui passe sur son mois ;
   *   - plusieurs dates : la liste s'affiche à droite, et ces jours sont
   *     encadrés dans le calendrier, qui passe sur le mois de la plus récente.
   */
  const openCounter = (text: string, list: Activity[], danger: boolean) => {
    const dates = [...new Set(list.map(taskDay))].sort();
    if (dates.length === 1) {
      selectDay(dates[0]);
      return;
    }
    setTaskList({
      title: text.charAt(0).toUpperCase() + text.slice(1),
      lines: toLines(list, summaryTasks),
      highlight: dates,
      danger,
    });
    showMonthOf(dates[dates.length - 1]);
  };

  // --- Actions -----------------------------------------------------------
  const openNew = (day: string) => {
    setFormDate(day);
    setFormTask(null);
  };

  const remove = async (t: Activity) => {
    const extra = childrenOf(t).length ? "\n\nSes tâches attachées seront aussi supprimées." : "";
    if (!window.confirm(`Supprimer la tâche « ${label(t)} » du ${shortDay(taskDay(t))} ?${extra}`)) return;
    try {
      await activityService.remove(t.id);
      showToast("success", "Tâche supprimée.");
      setDetail(null);
      setTaskList(null);
      load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const closeFollowUp = async (t: Activity) => {
    try {
      await activityService.update(t.id, { status: "realisee" });
      showToast("success", "Suivi terminé : tâche réalisée.");
      setDetail(null);
      load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Opération impossible.");
    }
  };

  // --- Une tâche dans la liste : une ligne claire -------------------------
  const card = ({ task, attached }: Line) => {
    const st = taskStyle(task.activity_type);
    const overdue = isOverdue(task, today);
    const done = task.status === "realisee";
    const followUp = task.status === "a_entretenir";
    const crop = cropLabel(task.crop_id);
    const state = overdue ? "En retard" : STATUS_LABELS[task.status];
    const badge = overdue
      ? { bg: "#FCEBEB", fg: OVERDUE_TEXT }
      : done
        ? { bg: "#f3f4f6", fg: "#6b7280" }
        : followUp
          ? { bg: "#FAEEDA", fg: "#633806" }
          : { bg: "#eef5f0", fg: GREEN };
    return (
      <button
        key={task.id}
        type="button"
        className="awam-cal-task"
        onClick={() => setDetail(task)}
        aria-label={`${label(task)}, ${state.toLowerCase()}`}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%", minWidth: 0, textAlign: "left", cursor: "pointer",
          background: "#fff", border: `1px solid ${LINE}`, borderLeft: `4px solid ${done ? "#d1d5db" : st.accent}`,
          borderRadius: 10, padding: "10px 12px", marginLeft: attached ? 24 : 0, maxWidth: attached ? "calc(100% - 24px)" : "100%",
          outline: followUp ? `1px dashed ${FOLLOW_UP_BORDER}` : "none", outlineOffset: -2,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: done ? "#f3f4f6" : st.bg,
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}
        >
          {done ? "✓" : st.icon}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: done ? "#9ca3af" : "#111827", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attached && <span style={{ color: "#9ca3af", fontWeight: 400 }}>↳ </span>}
            {!done && !followUp && plannedTime(task) && (
              <span style={{ color: "#3B6D11", marginRight: 6 }}>{plannedTime(task)}</span>
            )}
            {label(task)}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {[
              done || followUp ? `Réalisée à ${doneTime(task)}` : null,
              crop ?? "Toute la parcelle",
              task.team ? `Équipe ${teamName(task.team).toLowerCase()}` : null,
            ].filter(Boolean).join(" · ")}
          </span>
        </span>
        {task.employees.length > 0 && (
          <span style={{ display: "flex", flexShrink: 0 }}>
            {task.employees.slice(0, 3).map((e, k) => (
              <span
                key={e.id}
                title={e.full_name}
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: "#f3f4f6", border: "2px solid #fff", marginLeft: k ? -6 : 0,
                  fontSize: 10, fontWeight: 600, color: "#374151", display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {initials(e.full_name)}
              </span>
            ))}
            {task.employees.length > 3 && <span style={{ fontSize: 11, color: "#6b7280", alignSelf: "center", marginLeft: 4 }}>+{task.employees.length - 3}</span>}
          </span>
        )}
        <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, background: badge.bg, color: badge.fg, borderRadius: 999, padding: "3px 10px" }}>
          {state}
        </span>
      </button>
    );
  };

  /** Légende : les types visibles dans la période affichée */
  const visibleTypes = useMemo(
    () =>
      [...new Set((tasks ?? []).map((t) => t.activity_type))].sort((a, b) =>
        teamLabel(a, taskTypes).localeCompare(teamLabel(b, taskTypes), "fr"),
      ),
    [tasks, taskTypes],
  );

  /** Un compteur du résumé, cliquable s'il n'est pas vide */
  const counter = (text: string, list: Activity[], danger = false) => (
    <button
      type="button"
      onClick={() => list.length && openCounter(text, list, danger)}
      disabled={!list.length}
      style={{
        border: "none", background: "transparent", padding: 0, fontSize: 13, cursor: list.length ? "pointer" : "default",
        color: danger && list.length ? OVERDUE_TEXT : "#6b7280", fontWeight: danger && list.length ? 600 : 400,
        // textDecorationLine (et non textDecoration) : ne pas mêler la forme
        // générale et la couleur du soulignement, React le signale
        textDecorationLine: list.length ? "underline" : "none", textUnderlineOffset: 3, textDecorationColor: "#d1d5db",
      }}
    >
      {danger && list.length > 0 && <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: OVERDUE_BORDER, marginRight: 5, verticalAlign: 1 }} />}
      <strong style={{ color: danger && list.length ? OVERDUE_TEXT : "#111827" }}>{list.length}</strong> {text}
    </button>
  );

  /** Liste affichée à droite : un compteur du résumé, sinon le jour choisi */
  const panel: TaskList = taskList ?? {
    title: new Date(`${selected}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    lines: linesByDay.get(selected) ?? [],
    day: selected,
  };

  /** Couleurs des points sous un jour : une par type, dans l'ordre */
  const dotsOf = (lines: Line[]) => [...new Set(lines.filter((l) => !l.attached).map((l) => taskStyle(l.task.activity_type).accent))];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{CALENDAR_CSS}</style>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Planification</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 2 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{parcelName}</span>
            {counter("aujourd'hui", summary.today)}
            {counter("en retard", summary.overdue, true)}
            {counter("cette semaine", summary.week)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openNew(panel.day ?? today)}
          style={{ border: "none", background: GREEN, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          ＋ Nouvelle tâche
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Calendrier : jours en tuiles, comme une carte de planification */}
        <div style={{ flex: "1 1 520px", maxWidth: 620, minWidth: 0, border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px 16px", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 12, position: "relative" }}>
            <button type="button" onClick={() => move(-1)} aria-label="Mois précédent" style={{ border: "none", background: "transparent", color: GREEN, fontSize: 18, cursor: "pointer", padding: "0 6px" }}>‹</button>
            <strong style={{ fontSize: 15, color: "#111827", minWidth: 130, textAlign: "center" }}>{monthLabel(anchor)}</strong>
            <button type="button" onClick={() => move(1)} aria-label="Mois suivant" style={{ border: "none", background: "transparent", color: GREEN, fontSize: 18, cursor: "pointer", padding: "0 6px" }}>›</button>
            <button type="button" onClick={goToday} style={{ position: "absolute", right: 0, border: `1px solid ${LINE}`, background: "#fff", color: "#374151", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
              Aujourd'hui
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: i >= 5 ? "#9ca3af" : "#374151" }}>
                {d.charAt(0)}
              </div>
            ))}
            {days.map((d) => {
              const iso = isoDay(d);
              const isToday = iso === today;
              const isSelected = !taskList && iso === selected;
              /** Jour d'un compteur ouvert : encadré, rouge pour « en retard » */
              const isHighlighted = Boolean(taskList?.highlight?.includes(iso));
              const outside = d.getMonth() !== anchor.getMonth();
              const lines = linesByDay.get(iso) ?? [];
              const count = lines.length;
              const late = lines.some((l) => isOverdue(l.task, today));
              const dots = dotsOf(lines);
              const hint = late ? "En retard" : count ? `${count} tâche${count > 1 ? "s" : ""}` : "";
              const sel = SELECTED_STYLE[dayState(lines, today)];
              return (
                <button
                  key={iso}
                  type="button"
                  className="awam-cal-cell"
                  onClick={() => selectDay(iso)}
                  aria-label={`${shortDay(iso)}, ${count} tâche${count > 1 ? "s" : ""}`}
                  aria-pressed={isSelected}
                  style={{
                    height: 58, borderRadius: 10, cursor: "pointer", padding: "6px 4px 5px", minWidth: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                    background: isSelected ? sel.bg : outside ? "#f9faf9" : count ? "#fff" : "#f3f5f3",
                    border: isHighlighted
                      ? `2px solid ${taskList?.danger ? OVERDUE_BORDER : GREEN}`
                      : isSelected
                      ? `2px solid ${sel.border}`
                      : isToday
                        ? `2px solid ${GREEN}`
                        : count && !outside
                          ? `1px solid ${late ? "#F7C1C1" : "#cfe3d6"}`
                          : "1px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: isToday || isSelected ? 700 : 500, color: isSelected ? sel.text : outside ? "#c9cdc9" : "#1f2937" }}>
                    {d.getDate()}
                  </span>
                  {hint && !outside ? (
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ display: "flex", gap: 2 }}>
                        {dots.slice(0, MAX_DOTS).map((c) => (
                          <span key={c} style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
                        ))}
                      </span>
                      <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 600, color: isSelected ? sel.text : late ? OVERDUE_TEXT : GREEN, whiteSpace: "nowrap" }}>
                        {hint}
                      </span>
                    </span>
                  ) : (
                    isToday && <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? sel.text : GREEN }}>Aujourd'hui</span>
                  )}
                </button>
              );
            })}
          </div>

          {visibleTypes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
              {visibleTypes.map((code) => (
                <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: taskStyle(code).accent }} />
                  {teamLabel(code, taskTypes)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tâches du jour choisi (ou d'un compteur) */}
        <div style={{ flex: "1 1 340px", minWidth: 0, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, background: "#f8fbf9" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <strong style={{ fontSize: 15, color: "#111827" }}>{panel.title.charAt(0).toUpperCase() + panel.title.slice(1)}</strong>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {panel.lines.length} tâche{panel.lines.length > 1 ? "s" : ""}
            </span>
            {taskList && (
              <button type="button" onClick={() => setTaskList(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer" }}>
                ✕ Fermer
              </button>
            )}
          </div>

          {panel.lines.length === 0 ? (
            <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
              Aucune tâche ce jour.
              {panel.day && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" onClick={() => openNew(panel.day!)} style={{ border: `1px solid ${GREEN}`, background: "#fff", color: GREEN, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    ＋ Planifier une tâche
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {panel.lines.map((line) => (
                <div key={line.task.id} style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                  {!panel.day && (
                    <span style={{ width: 70, flexShrink: 0, paddingTop: 7 }}>
                      {!line.attached && (
                        <button
                          type="button"
                          onClick={() => selectDay(taskDay(line.task))}
                          title="Voir ce jour dans le calendrier"
                          style={{
                            border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit",
                            fontSize: 11.5, color: "#1b4332", textDecoration: "underline", textUnderlineOffset: 2,
                            textTransform: "capitalize",
                          }}
                        >
                          {shortDay(taskDay(line.task))}
                        </button>
                      )}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>{card(line)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontSize: 11.5, color: "#9ca3af" }}>
            <span><span style={{ textDecoration: "line-through" }}>✓ barrée</span> : réalisée</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: OVERDUE_BORDER }} /> en retard
            </span>
            <span><span style={{ outline: `1px dashed ${FOLLOW_UP_BORDER}`, padding: "0 4px", borderRadius: 3 }}>pointillés</span> : à entretenir</span>
          </div>
        </div>
      </div>

      <TaskDetailModal
        task={detail}
        attached={detail ? childrenOf(detail) : []}
        onClose={() => setDetail(null)}
        label={label}
        cropLabel={cropLabel}
        teamName={teamName}
        overdue={detail ? isOverdue(detail, today) : false}
        onComplete={(t) => {
          setDetail(null);
          setTaskList(null);
          setCompleting(t);
        }}
        onCloseFollowUp={closeFollowUp}
        onEdit={(t) => {
          setDetail(null);
          setTaskList(null);
          setFormTask(t);
        }}
        onDelete={remove}
        onOpen={setDetail}
      />

      <TaskFormModal
        isOpen={formTask !== undefined}
        onClose={() => setFormTask(undefined)}
        parcelId={parcelId}
        parcelName={parcelName}
        links={links}
        taskTypes={taskTypes}
        crops={crops}
        task={formTask ?? null}
        defaultDate={formDate}
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