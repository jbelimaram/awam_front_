import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";

interface EmployeeTeamTabProps {
  /** Employé sélectionné, dans la ferme choisie */
  link: FarmEmployee;
  /** Tous les employés de la ferme, pour afficher les coéquipiers */
  links: FarmEmployee[];
  farmName: string;
  taskTypes: TaskType[];
  /** Ouvre la vue des équipes de la ferme */
  onOpenTeams: () => void;
}

const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "0 0 6px" };

/**
 * Onglet Équipes d'un employé : son équipe dans cette ferme et ses
 * coéquipiers. Les équipes se construisent et se modifient dans la vue
 * des équipes, où l'on coche plusieurs membres à la fois.
 */
export default function EmployeeTeamTab({ link, links, farmName, taskTypes, onOpenTeams }: EmployeeTeamTabProps) {
  const current = link.team ?? null;
  const teammates = current ? links.filter((l) => l.team === current && l.id !== link.id) : [];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#111827" }}>
      <p style={sectionTitle}>Équipe à {farmName}</p>
      <strong style={{ fontSize: 15 }}>
        {current ? `Équipe ${teamLabel(current, taskTypes).toLowerCase()}` : "Sans équipe"}
      </strong>

      {current && (
        <div style={{ marginTop: 12 }}>
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

      <button
        type="button"
        onClick={onOpenTeams}
        style={{ marginTop: 14, border: "1px solid #1b4332", background: "#fff", color: "#1b4332", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Gérer les équipes de {farmName} →
      </button>
    </div>
  );
}