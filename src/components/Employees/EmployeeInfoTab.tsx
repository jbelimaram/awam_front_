import type { FarmEmployee } from "../../types/farmEmployee";

interface EmployeeInfoTabProps {
  link: FarmEmployee;
  farmName: string;
  onEdit: () => void;
  onDelete: () => void;
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
};
const label: React.CSSProperties = { color: "#6b7280" };
const value: React.CSSProperties = { color: "#111827", fontWeight: 600, textAlign: "right" };

const ROLE_LABEL: Record<string, string> = { coordinateur: "Coordinateur", membre: "Membre" };

const fmtMonth = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" }) : "—";

/** Onglet Fiche : identité de l'employé et son rôle dans la ferme choisie. */
export default function EmployeeInfoTab({ link, farmName, onEdit, onDelete }: EmployeeInfoTabProps) {
  const isCoordinator = link.role === "coordinateur";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 15, color: "#111827" }}>
          <strong>{link.employee.full_name}</strong>
          {isCoordinator && <span style={{ color: "#6b7280" }}> · Coordinateur de {farmName}</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#111827", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer" }}
          >
            ✎ Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Supprimer l'employé"
            style={{ border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 6, padding: "5px 10px", fontSize: 13, cursor: "pointer" }}
          >
            🗑
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
        <div style={row}><span style={label}>Téléphone</span><span style={value}>{link.employee.phone || "—"}</span></div>
        <div style={row}><span style={label}>Rôle</span><span style={value}>{ROLE_LABEL[link.role ?? "membre"] ?? link.role}</span></div>
        <div style={row}><span style={label}>Ferme</span><span style={value}>{farmName}</span></div>
        <div style={row}><span style={label}>Dans la ferme depuis</span><span style={value}>{fmtMonth(link.hired_at)}</span></div>
      </div>
    </div>
  );
}