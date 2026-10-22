import { useState } from "react";
import { farmEmployeeService } from "../../Services/farmEmployeeService";
import { useToast } from "../../hooks/useToast";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";

interface EmployeeTeamTabProps {
  /** Employé sélectionné, dans la ferme choisie */
  link: FarmEmployee;
  /** Tous les employés de la ferme, pour afficher les coéquipiers */
  links: FarmEmployee[];
  farmId: number;
  farmName: string;
  taskTypes: TaskType[];
  /** Appelé après un changement d'équipe */
  onChanged: () => void;
  /** Ouvre la gestion des types de tâche */
  onManageTypes: () => void;
}

const section: React.CSSProperties = { padding: "10px 0", borderBottom: "1px solid #f3f4f6" };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "0 0 6px" };
const selectStyle: React.CSSProperties = {
  padding: "6px 9px", borderRadius: 6, border: "1px solid #cbd5e1",
  background: "#fff", color: "#111827", fontSize: 13, minWidth: 200,
};

/**
 * Onglet Équipes d'un employé : son équipe dans cette ferme, le
 * déplacement vers une autre équipe (il quitte automatiquement
 * l'ancienne), le retrait de l'équipe, et ses coéquipiers.
 */
export default function EmployeeTeamTab({
  link, links, farmId, farmName, taskTypes, onChanged, onManageTypes,
}: EmployeeTeamTabProps) {
  const { showToast } = useToast();
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const current = link.team ?? null;
  const teammates = current
    ? links.filter((l) => l.team === current && l.id !== link.id)
    : [];

  const changeTeam = async (team: string | null) => {
    setSaving(true);
    try {
      await farmEmployeeService.update(farmId, link.id, { team });
      showToast(
        "success",
        team
          ? `${link.employee.full_name} est maintenant dans l'équipe ${teamLabel(team, taskTypes)}.`
          : `${link.employee.full_name} est maintenant sans équipe.`,
      );
      setTarget("");
      onChanged();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Changement d'équipe impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#111827" }}>
      <div style={section}>
        <p style={sectionTitle}>Équipe à {farmName}</p>
        <strong style={{ fontSize: 15 }}>
          {current ? `Équipe ${teamLabel(current, taskTypes).toLowerCase()}` : "Sans équipe"}
        </strong>
      </div>

      <div style={section}>
        <p style={sectionTitle}>{current ? "Déplacer vers une autre équipe" : "Affecter à une équipe"}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={saving}
            style={selectStyle}
            aria-label="Équipe de destination"
          >
            <option value="">Choisir une équipe…</option>
            {taskTypes
              .filter((t) => t.code !== current)
              .map((t) => (
                <option key={t.code} value={t.code}>
                  Équipe {t.label.toLowerCase()}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!target || saving}
            onClick={() => changeTeam(target)}
            style={{
              border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600,
              background: target ? "#1b4332" : "#9ca3af", color: "#fff",
              cursor: target && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "…" : current ? "Déplacer" : "Affecter"}
          </button>
          {current && (
            <button
              type="button"
              disabled={saving}
              onClick={() => changeTeam(null)}
              style={{ border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
            >
              Retirer de l'équipe
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onManageTypes}
          style={{ marginTop: 8, padding: 0, border: "none", background: "none", color: "#1b4332", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
        >
          Gérer les types de tâche
        </button>
      </div>

      {current && (
        <div style={{ ...section, borderBottom: "none" }}>
          <p style={sectionTitle}>Coéquipiers</p>
          {teammates.length === 0 ? (
            <span style={{ color: "#6b7280" }}>Aucun autre membre dans cette équipe.</span>
          ) : (
            teammates.map((l) => (
              <div key={l.id} style={{ padding: "2px 0" }}>
                {l.employee.full_name}
                {l.role === "coordinateur" && <span style={{ color: "#6b7280" }}> · coordinateur</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}