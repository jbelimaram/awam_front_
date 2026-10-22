import { useNavigate } from "react-router-dom";

/**
 * Lien vers la page Employés, dans la page de ferme. La gestion des
 * employés, des équipes, de la planification et des interventions se
 * fait entièrement dans sa propre page.
 */
export default function EmployeesLinkCard() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <strong style={{ fontSize: 14, color: "#111827" }}>Employés</strong>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "6px 0 12px" }}>
        Employés, équipes, planification des affectations et interventions.
      </p>
      <button
        type="button"
        onClick={() => navigate("/employes")}
        style={{
          border: "none", background: "#1b4332", color: "#ffffff", borderRadius: 6,
          padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        Gérer les employés →
      </button>
    </div>
  );
}