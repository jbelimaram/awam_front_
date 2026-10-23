import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import EmployeeFormModal from "../components/Employees/EmployeeFormModal";
import EmployeeInfoTab from "../components/Employees/EmployeeInfoTab";
import EmployeeTeamTab from "../components/Employees/EmployeeTeamTab";
import TeamsBoard from "../components/Employees/TeamsBoard";
import EmployeeTasksTab from "../components/Planning/EmployeeTaskTab";
import PlanningBoard from "../components/Planning/PlanningBoard";
import { SelectionProvider } from "../context/SelectionContext";
import { employeeService } from "../Services/employeeService";
import { farmEmployeeService } from "../Services/farmEmployeeService";
import { taskTypeService } from "../Services/taskTypeService";
import { useSelection } from "../hooks/useSelection";
import { useToast } from "../hooks/useToast";
import type { FarmEmployee } from "../types/farmEmployee";
import type { TaskType } from "../types/taskType";
import { teamLabel } from "../utils/teams";

type TabKey = "info" | "teams" | "planning" | "interventions";

/** Les quatre fonctionnalités de la gestion des employés */
const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Fiche" },
  { key: "teams", label: "Équipes" },
  { key: "planning", label: "Planification" },
  { key: "interventions", label: "Interventions" },
];

/** Ce que contiendront les onglets des prochaines étapes */
const NEXT_STEPS: Record<Exclude<TabKey, "info" | "teams" | "planning">, string> = {
  interventions: "Enregistrer les interventions et les tâches : réalisées, à réaliser, à entretenir.",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};
const muted: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: 0 };
const groupTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "8px 0 2px", padding: "0 10px",
};

/** Actifs d'abord ; parmi eux, le coordinateur, puis l'ordre alphabétique */
const byRoleThenName = (a: FarmEmployee, b: FarmEmployee) =>
  Number(a.employee.is_active === false) - Number(b.employee.is_active === false) ||
  Number(b.role === "coordinateur") - Number(a.role === "coordinateur") ||
  a.employee.full_name.localeCompare(b.employee.full_name, "fr");

function EmployeesContent({
  showFarmForm,
  onCloseFarmForm,
}: {
  showFarmForm: boolean;
  onCloseFarmForm: () => void;
}) {
  const { farms, selectedFarmId, refreshFarms, selectedParcel, parcelsForSelectedFarm } = useSelection();
  const { showToast } = useToast();

  const [links, setLinks] = useState<FarmEmployee[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FarmEmployee | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  /** Zone principale : fiche d'un employé, équipes, ou planification */
  const [view, setView] = useState<"employee" | "teams" | "planning">("employee");

  const farmName = farms.find((f) => f.id === selectedFarmId)?.name ?? "";
  /**
   * Employés regroupés par équipe, dans l'ordre des types de tâche
   * (prédéfinis, puis libres), et « Sans équipe » en dernier.
   */
  const groups = useMemo(() => {
    const order = taskTypes.map((t) => t.code);
    const byTeam = new Map<string, FarmEmployee[]>();
    for (const l of links) {
      const key = l.team ?? "";
      const list = byTeam.get(key);
      if (list) list.push(l);
      else byTeam.set(key, [l]);
    }
    const rank = (key: string) => (key === "" ? Infinity : order.indexOf(key) === -1 ? order.length : order.indexOf(key));
    return [...byTeam.entries()]
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "fr"))
      .map(([key, items]) => ({
        key,
        title: key ? `Équipe ${teamLabel(key, taskTypes).toLowerCase()}` : "Sans équipe",
        items: [...items].sort(byRoleThenName),
      }));
  }, [links, taskTypes]);
  const selected = links.find((l) => l.id === selectedLinkId) ?? null;

  // --- Employés de la ferme choisie -----------------------------------
  const loadEmployees = useCallback(
    async (preferredLinkId?: number) => {
      if (!selectedFarmId) {
        setLinks([]);
        setSelectedLinkId(null);
        return;
      }
      setLoading(true);
      try {
        const data = await farmEmployeeService.listByFarm(selectedFarmId);
        setLinks(data);
        setSelectedLinkId((current) => {
          const wanted = preferredLinkId ?? current;
          return data.some((l) => l.id === wanted) ? wanted ?? null : null;
        });
      } catch (e) {
        showToast("error", e instanceof Error ? e.message : "Employés indisponibles.");
        setLinks([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedFarmId, showToast],
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // --- Types de tâche : ils nomment les équipes -------------------------
  const loadTaskTypes = useCallback(() => {
    taskTypeService.list().then(setTaskTypes).catch(() => setTaskTypes([]));
  }, []);

  useEffect(() => {
    loadTaskTypes();
  }, [loadTaskTypes]);

  /**
   * Rend l'employé inactif, ou le réactive, dans TOUTES ses fermes.
   * Inactif : il quitte ses équipes et n'est plus coordinateur ; son
   * historique est conservé.
   */
  const handleToggleActive = async () => {
    if (!selected) return;
    const name = selected.employee.full_name;
    const deactivate = selected.employee.is_active !== false;
    if (
      deactivate &&
      !window.confirm(
        `Rendre ${name} inactif ?\n\nDans toutes vos fermes, il quittera son équipe` +
          `${selected.role === "coordinateur" ? " et ne sera plus coordinateur" : ""}, et ne recevra plus de nouvelle tâche. ` +
          "Son historique est conservé, et vous pourrez le réactiver.",
      )
    ) {
      return;
    }
    try {
      await employeeService.update(selected.employee.id, { is_active: !deactivate });
      showToast("success", deactivate ? `${name} est maintenant inactif.` : `${name} est réactivé : affectez-le à une équipe si besoin.`);
      loadEmployees(selected.id);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Changement de statut impossible.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const name = selected.employee.full_name;
    if (!window.confirm(`Supprimer ${name} ? Il sera retiré de toutes vos fermes.`)) return;
    try {
      await employeeService.remove(selected.employee.id);
      showToast("success", `${name} supprimé.`);
      setSelectedLinkId(null);
      loadEmployees();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        gap: 12,
        padding: 12,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ---- Colonne gauche : parcelles puis employés ---- */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={cardStyle}>
          <ParcelSelectors />
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 14, color: "#111827" }}>Employés</strong>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              disabled={!selectedFarmId}
              title={selectedFarmId ? "Ajouter un employé" : "Sélectionnez une ferme"}
              style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid #cbd5e1",
                background: "#ffffff", color: "#1b4332", fontSize: 16, lineHeight: 1,
                cursor: selectedFarmId ? "pointer" : "not-allowed",
                opacity: selectedFarmId ? 1 : 0.45,
              }}
            >
              ＋
            </button>
          </div>

          {selectedFarmId && (
            <div role="tablist" aria-label="Vue" style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 8, padding: 3, marginBottom: 8 }}>
              {([["employee", "Employés"], ["teams", "Équipes"], ["planning", "Planification"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  style={{
                    flex: 1, border: "none", borderRadius: 6, padding: "5px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: view === key ? "#ffffff" : "transparent",
                    color: view === key ? "#1b4332" : "#6b7280",
                    boxShadow: view === key ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {!selectedFarmId && <p style={muted}>Sélectionnez une ferme dans la barre latérale.</p>}
          {selectedFarmId && loading && <p style={muted}>Chargement…</p>}
          {selectedFarmId && !loading && links.length === 0 && (
            <p style={muted}>Aucun employé. Utilisez « ＋ » pour en ajouter un.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {groups.map((group) => (
              <div key={group.key || "sans-equipe"}>
                <div style={groupTitle}>{group.title}</div>
                {group.items.map((l) => {
                  const isActive = l.id === selectedLinkId;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setSelectedLinkId(l.id);
                        setView("employee");
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                        borderRadius: 6, border: "none",
                        background: isActive ? "#1b4332" : "transparent",
                        color: isActive ? "#ffffff" : l.employee.is_active === false ? "#9ca3af" : "#111827",
                        cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%",
                      }}
                    >
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.employee.full_name}
                      </span>
                      {l.role === "coordinateur" && (
                        <span style={{ fontSize: 11, opacity: isActive ? 0.85 : 0.6 }}>Coordinateur</span>
                      )}
                      {l.employee.is_active === false && (
                        <span style={{ fontSize: 11, opacity: isActive ? 0.85 : 1, color: isActive ? undefined : "#b45309" }}>Inactif</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Zone principale ---- */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {view === "planning" && selectedFarmId ? (
          <div style={cardStyle}>
            {selectedParcel ? (
              <PlanningBoard
                parcelId={selectedParcel.id}
                parcelName={selectedParcel.nom}
                links={links}
                taskTypes={taskTypes}
              />
            ) : (
              <p style={{ ...muted, fontFamily: "system-ui, sans-serif" }}>
                Sélectionnez une parcelle, dans la carte Parcelles à gauche, pour voir et planifier ses tâches.
              </p>
            )}
          </div>
        ) : view === "teams" && selectedFarmId ? (
          <div style={cardStyle}>
            <TeamsBoard
              farmId={selectedFarmId}
              farmName={farmName}
              links={links}
              taskTypes={taskTypes}
              onChanged={() => {
                loadEmployees();
                loadTaskTypes();
              }}
            />
          </div>
        ) : !selected ? (
          <div style={{ ...cardStyle, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
            {selectedFarmId
              ? "Sélectionnez un employé, ou ajoutez-en un pour gérer ses équipes, ses affectations et ses interventions."
              : "Sélectionnez une ferme dans la barre latérale pour gérer ses employés."}
          </div>
        ) : (
          <div style={cardStyle}>
            {/* Onglets */}
            <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "7px 14px", border: "none", background: "transparent",
                    borderBottom: `2px solid ${tab === t.key ? "#1b4332" : "transparent"}`,
                    color: tab === t.key ? "#1b4332" : "#6b7280",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "info" ? (
              <EmployeeInfoTab
                link={selected}
                farmName={farmName}
                onEdit={() => {
                  setEditing(selected);
                  setShowForm(true);
                }}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ) : tab === "planning" ? (
              <EmployeeTasksTab
                employeeId={selected.employee.id}
                taskTypes={taskTypes}
                parcels={parcelsForSelectedFarm}
                onOpenPlanning={() => setView("planning")}
              />
            ) : tab === "teams" ? (
              <EmployeeTeamTab
                link={selected}
                links={links}
                farmName={farmName}
                taskTypes={taskTypes}
                onOpenTeams={() => setView("teams")}
              />
            ) : (
              <p style={{ ...muted, fontFamily: "system-ui, sans-serif" }}>
                <strong style={{ color: "#374151" }}>Prochaine étape.</strong> {NEXT_STEPS[tab]}
              </p>
            )}
          </div>
        )}
      </div>

      <FarmFormModal
        isOpen={showFarmForm}
        onClose={onCloseFarmForm}
        onSaved={(farmId) => refreshFarms(farmId)}
      />

      {selectedFarmId && (
        <EmployeeFormModal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          farmId={selectedFarmId}
          farmName={farmName}
          link={editing}
          onSaved={(linkId) => loadEmployees(linkId)}
        />
      )}
    </div>
  );
}

/**
 * Page Employés : même organisation que la page Cultures. La ferme se
 * choisit dans la barre latérale, la parcelle dans la colonne de gauche,
 * puis la gestion des employés se fait dans la zone principale.
 */
export default function EmployeesPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);

  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <EmployeesContent
          showFarmForm={showFarmForm}
          onCloseFarmForm={() => setShowFarmForm(false)}
        />
      </DashboardLayout>
    </SelectionProvider>
  );
}