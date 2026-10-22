import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import EmployeeFormModal from "../components/Employees/EmployeeFormModal";
import EmployeeInfoTab from "../components/Employees/EmployeeInfoTab";
import EmployeeTeamTab from "../components/Employees/EmployeeTeamTab";
import TaskTypesModal from "../components/Employees/TaskTypesModal";
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
const NEXT_STEPS: Record<Exclude<TabKey, "info" | "teams">, string> = {
  planning:
    "Planifier les affectations des équipes et des employés selon les besoins des parcelles, sous-parcelles et cultures.",
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

/** Le coordinateur d'abord, puis les membres par ordre alphabétique */
const byRoleThenName = (a: FarmEmployee, b: FarmEmployee) =>
  Number(b.role === "coordinateur") - Number(a.role === "coordinateur") ||
  a.employee.full_name.localeCompare(b.employee.full_name, "fr");

function EmployeesContent({
  showFarmForm,
  onCloseFarmForm,
}: {
  showFarmForm: boolean;
  onCloseFarmForm: () => void;
}) {
  const { farms, selectedFarmId, refreshFarms } = useSelection();
  const { showToast } = useToast();

  const [links, setLinks] = useState<FarmEmployee[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FarmEmployee | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [showTaskTypes, setShowTaskTypes] = useState(false);

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
                  onClick={() => setSelectedLinkId(l.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                    borderRadius: 6, border: "none",
                    background: isActive ? "#1b4332" : "transparent",
                    color: isActive ? "#ffffff" : "#111827",
                    cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.employee.full_name}
                  </span>
                  {l.role === "coordinateur" && (
                    <span style={{ fontSize: 11, opacity: isActive ? 0.85 : 0.6 }}>Coordinateur</span>
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
        {!selected ? (
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
              />
            ) : tab === "teams" && selectedFarmId ? (
              <EmployeeTeamTab
                link={selected}
                links={links}
                farmId={selectedFarmId}
                farmName={farmName}
                taskTypes={taskTypes}
                onChanged={() => loadEmployees(selected.id)}
                onManageTypes={() => setShowTaskTypes(true)}
              />
            ) : tab === "teams" ? null : (
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

      <TaskTypesModal
        isOpen={showTaskTypes}
        onClose={() => setShowTaskTypes(false)}
        taskTypes={taskTypes}
        onChanged={() => {
          loadTaskTypes();
          // Un renommage change aussi l'équipe des employés concernés
          loadEmployees();
        }}
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