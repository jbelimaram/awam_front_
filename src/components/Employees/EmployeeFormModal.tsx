import { useEffect, useState } from "react";
import Modal from "../Common/Modal";
import { employeeService } from "../../Services/employeeService";
import { farmEmployeeService } from "../../Services/farmEmployeeService";
import { useToast } from "../../hooks/useToast";
import type { FarmEmployee, FarmEmployeeRole } from "../../types/farmEmployee";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: number;
  farmName: string;
  /** Employé à modifier ; absent pour un ajout */
  link?: FarmEmployee | null;
  /** Appelé après l'enregistrement, avec l'identifiant du rattachement */
  onSaved: (linkId: number) => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 9px",
  borderRadius: 6,
  border: "1px solid #4b5563",
  marginTop: 3,
  background: "#111827",
  color: "#ffffff",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db", display: "block" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", margin: "3px 0 0" };

/**
 * Ajout ou modification d'un employé de la ferme : nom, téléphone, rôle.
 *
 * Ajout : l'employé est créé dans le compte, puis rattaché à la ferme.
 * Un seul coordinateur par ferme : en désigner un fait repasser l'ancien
 * en « membre » (règle appliquée par le back).
 */
export default function EmployeeFormModal({ isOpen, onClose, farmId, farmName, link, onSaved }: EmployeeFormModalProps) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<FarmEmployeeRole>("membre");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFullName(link?.employee.full_name ?? "");
    setPhone(link?.employee.phone ?? "");
    setRole(link?.role ?? "membre");
    setError(null);
  }, [isOpen, link]);

  const handleSubmit = async () => {
    const name = fullName.trim();
    if (!name) {
      setError("Indiquez le nom de l'employé.");
      return;
    }
    if (name.length > 150) {
      setError("Le nom ne doit pas dépasser 150 caractères.");
      return;
    }
    if (phone.trim().length > 30) {
      setError("Le téléphone ne doit pas dépasser 30 caractères.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let linkId: number;
      if (link) {
        await employeeService.update(link.employee.id, { full_name: name, phone: phone.trim() || null });
        if (role !== link.role) await farmEmployeeService.update(farmId, link.id, { role });
        linkId = link.id;
      } else {
        const created = await employeeService.create({ full_name: name, phone: phone.trim() || null });
        const added = await farmEmployeeService.addToFarm(farmId, { employee_id: created.id, role });
        linkId = added.id;
      }
      showToast("success", link ? "Employé modifié." : `${name} ajouté à ${farmName}.`);
      onSaved(linkId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={link ? "Modifier l'employé" : `Ajouter un employé · ${farmName}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui, sans-serif" }}>
        <label style={labelStyle}>
          Nom complet *
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            placeholder="Ahmed Ben Salah"
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Téléphone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="20 123 456"
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Rôle dans la ferme
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FarmEmployeeRole)}
            disabled={submitting}
            style={fieldStyle}
          >
            <option value="membre">Membre</option>
            <option value="coordinateur">Coordinateur</option>
          </select>
          {role === "coordinateur" && (
            <p style={hintStyle}>
              Un seul coordinateur par ferme : l'actuel coordinateur de {farmName} repassera membre.
            </p>
          )}
        </label>

        {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ flex: 1, background: "transparent", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: 6, padding: "8px 0", cursor: "pointer" }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ flex: 1, background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 0", fontWeight: 600, cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}