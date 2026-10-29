import { useCallback, useEffect, useMemo, useState } from "react";
import { activityService } from "../../Services/activityService";
import { useToast } from "../../hooks/useToast";
import type { Activity, FarmHistoryItem } from "../../types/activity";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";
import { PEOPLE } from "../Common/dialogStyles";
import TaskDetailModal from "../Planning/TaskDetailModal";
import { taskStyle } from "../Planning/taskStyles";

interface EmployeesHistoryProps {
  farmId: number;
  farmName: string;
  links: FarmEmployee[];
  taskTypes: TaskType[];
}

/** Périodes proposées ; « tout » = 10 ans */
const PERIODS: { days: number; label: string }[] = [
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "3 derniers mois" },
  { days: 3650, label: "Tout l'historique" },
];

const ALL = "";

const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #eef0ee", borderRadius: 12, padding: "12px 16px", minWidth: 0,
};
const select: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff",
  color: "#111827", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer",
};
const kpi: React.CSSProperties = { background: "#f6f7f6", borderRadius: 10, padding: "10px 12px", minWidth: 0 };
const kpiLabel: React.CSSProperties = { fontSize: 11.5, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 };
const kpiValue: React.CSSProperties = {
  fontSize: 18, fontWeight: 600, color: "#111827", marginTop: 2,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

/** Jour (AAAA-MM-JJ) d'une opération faite */
const dayOf = (a: Activity) => (a.performed_at ?? "").slice(0, 10);

function dayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function since(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const n = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "hier";
  if (n < 7) return `il y a ${n} jours`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** L'élément le plus fréquent d'une liste, avec son nombre */
function mostFrequent(values: string[]): [string, number] | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: [string, number] | null = null;
  for (const entry of counts) if (!best || entry[1] > best[1]) best = entry;
  return best;
}

/**
 * Historique des opérations des employés d'une ferme (onglet « Historique »
 * de la page Employés) :
 *   - filtres : période (30 jours par défaut), employé, équipe, type ;
 *   - quatre chiffres clés ;
 *   - à gauche, le fil des opérations faites, par jour, aux icônes et
 *     couleurs douces du calendrier ; un clic ouvre son détail ;
 *   - à droite, la répartition par employé, en violet doux (la couleur des
 *     personnes) ; un clic sur un nom filtre toute la vue sur lui.
 */
export default function EmployeesHistory({ farmId, farmName, links, taskTypes }: EmployeesHistoryProps) {
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [items, setItems] = useState<FarmHistoryItem[] | null>(null);
  const [employee, setEmployee] = useState(ALL);
  const [team, setTeam] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [detail, setDetail] = useState<FarmHistoryItem | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      setItems(await activityService.farmHistory(farmId, days));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Historique indisponible.");
      setItems([]);
    }
  }, [farmId, days, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const label = useCallback((code: string) => teamLabel(code, taskTypes), [taskTypes]);

  /** Opérations après les filtres d'équipe et de type */
  const byTeamAndType = useMemo(
    () => (items ?? []).filter((a) => (team === ALL || a.team === team) && (type === ALL || a.activity_type === type)),
    [items, team, type],
  );
  /** Opérations après tous les filtres, employé compris */
  const shown = useMemo(
    () => byTeamAndType.filter((a) => employee === ALL || a.employees.some((e) => String(e.id) === employee)),
    [byTeamAndType, employee],
  );

  /** Choix des filtres : seulement ce qui existe sur la période */
  const employeeOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of links) map.set(l.employee.id, l.employee.full_name);
    for (const a of items ?? []) for (const e of a.employees) map.set(e.id, e.full_name);
    return [...map.entries()].sort((x, y) => x[1].localeCompare(y[1], "fr"));
  }, [links, items]);
  const teamOptions = useMemo(() => [...new Set((items ?? []).map((a) => a.team).filter(Boolean) as string[])], [items]);
  const typeOptions = useMemo(() => [...new Set((items ?? []).map((a) => a.activity_type))], [items]);

  /** Fil des opérations, par jour */
  const byDay = useMemo(() => {
    const map = new Map<string, FarmHistoryItem[]>();
    for (const a of shown) map.set(dayOf(a), [...(map.get(dayOf(a)) ?? []), a]);
    return [...map.entries()];
  }, [shown]);

  /**
   * Répartition par employé : nombre d'opérations et dernière date. Elle
   * ignore le filtre d'employé, pour garder tout le monde à l'écran et
   * passer de l'un à l'autre ; l'employé choisi y est surligné.
   */
  const perEmployee = useMemo(() => {
    const map = new Map<number, { name: string; count: number; last: string }>();
    for (const a of byTeamAndType) {
      for (const e of a.employees) {
        const cur = map.get(e.id) ?? { name: e.full_name, count: 0, last: "" };
        cur.count += 1;
        if (dayOf(a) > cur.last) cur.last = dayOf(a);
        map.set(e.id, cur);
      }
    }
    return [...map.entries()].sort((x, y) => y[1].count - x[1].count || x[1].name.localeCompare(y[1].name, "fr"));
  }, [byTeamAndType]);
  const maxCount = perEmployee[0]?.[1].count ?? 1;

  const topType = mostFrequent(shown.map((a) => a.activity_type));
  const topParcel = mostFrequent(shown.map((a) => a.parcel_name));

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
  const remove = async (t: Activity) => {
    if (!window.confirm(`Supprimer « ${label(t.activity_type)} » de l'historique ?`)) return;
    try {
      await activityService.remove(t.id);
      showToast("success", "Opération supprimée.");
      setDetail(null);
      load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const filtered = employee !== ALL || team !== ALL || type !== ALL;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Titre et filtres */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Historique des opérations · {farmName}</strong>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={select} aria-label="Période">
          {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
        <select value={employee} onChange={(e) => setEmployee(e.target.value)} style={select} aria-label="Employé">
          <option value={ALL}>Tous les employés</option>
          {employeeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)} style={select} aria-label="Équipe">
          <option value={ALL}>Toutes les équipes</option>
          {teamOptions.map((t) => <option key={t} value={t}>Équipe {label(t).toLowerCase()}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} style={select} aria-label="Type de tâche">
          <option value={ALL}>Tous les types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </select>
        {filtered && (
          <button
            type="button"
            onClick={() => { setEmployee(ALL); setTeam(ALL); setType(ALL); }}
            style={{ border: "none", background: "transparent", color: "#3B6D11", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Chiffres clés */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <div style={kpi}>
          <div style={kpiLabel}><span aria-hidden>📋</span> Opérations</div>
          <div style={kpiValue}>{items === null ? "…" : shown.length}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}><span aria-hidden>👥</span> Employés actifs</div>
          <div style={kpiValue}>{items === null ? "…" : employee === ALL ? perEmployee.length : shown.length ? 1 : 0}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}><span aria-hidden>{topType ? taskStyle(topType[0]).icon : "🏷"}</span> Type le plus fréquent</div>
          <div style={{ ...kpiValue, fontSize: 15 }}>{topType ? `${label(topType[0])} · ${topType[1]}` : "—"}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}><span aria-hidden>🌾</span> Parcelle la plus suivie</div>
          <div style={{ ...kpiValue, fontSize: 15 }}>{topParcel ? `${topParcel[0]} · ${topParcel[1]}` : "—"}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Fil des opérations */}
        <div style={{ ...card, flex: "1.6 1 360px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Opérations réalisées</div>
          {items === null ? (
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "8px 0" }}>Chargement…</p>
          ) : byDay.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0" }}>
              Aucune opération réalisée sur cette période{filtered ? " avec ces filtres" : ""}.
            </p>
          ) : (
            byDay.map(([day, list]) => (
              <section key={day}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af", margin: "10px 0 2px" }}>{dayHeading(day)}</div>
                {list.map((a) => {
                  const st = taskStyle(a.activity_type);
                  const followUp = a.status === "a_entretenir";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setDetail(a)}
                      title="Voir le détail"
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                        border: "none", borderRadius: 8, background: "transparent", padding: "7px 6px",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f7f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: st.bg, color: st.fg,
                          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        }}
                      >
                        {st.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {label(a.activity_type)} · {a.parcel_name}{a.crop_label ? `, ${a.crop_label}` : ""}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.employees.map((e) => e.full_name).join(", ") || "Aucun employé"}
                          {a.team ? ` · Équipe ${label(a.team).toLowerCase()}` : ""}
                        </span>
                      </span>
                      <span
                        style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "2px 9px",
                          background: followUp ? "#FAEEDA" : "#EAF3DE", color: followUp ? "#633806" : "#27500A",
                        }}
                      >
                        {followUp ? "À entretenir" : "Réalisée"}
                      </span>
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {/* Répartition par employé */}
        <div style={{ ...card, flex: "1 1 240px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Par employé</div>
          {perEmployee.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>Personne n'a encore d'opération sur cette période.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {perEmployee.map(([id, p]) => {
                const on = employee === String(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEmployee(on ? ALL : String(id))}
                    title={on ? "Voir tous les employés" : `Voir seulement ${p.name}`}
                    style={{
                      display: "block", width: "100%", textAlign: "left", border: `1px solid ${on ? PEOPLE.border : "transparent"}`,
                      background: on ? PEOPLE.tint : "transparent", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#111827" }}>
                      <span style={{ fontWeight: on ? 600 : 400 }}>{p.name}</span>
                      <span style={{ fontWeight: 600 }}>{p.count}</span>
                    </span>
                    <span style={{ display: "block", height: 6, borderRadius: 3, background: PEOPLE.tint, marginTop: 4 }}>
                      <span
                        style={{
                          display: "block", height: 6, borderRadius: 3, background: "#AFA9EC",
                          width: `${Math.max(6, Math.round((p.count / maxCount) * 100))}%`,
                        }}
                      />
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 3 }}>Dernière : {since(p.last)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TaskDetailModal
        task={detail}
        attached={[]}
        onClose={() => setDetail(null)}
        label={(a) => label(a.activity_type)}
        cropLabel={() => detail?.crop_label ?? null}
        teamName={label}
        overdue={false}
        onComplete={() => {}}
        onCloseFollowUp={closeFollowUp}
        onEdit={() => {}}
        onDelete={remove}
        onOpen={() => {}}
      />
    </div>
  );
}