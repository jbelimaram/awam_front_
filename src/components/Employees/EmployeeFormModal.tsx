import { useEffect, useState } from "react";
import Dialog from "../Common/Dialog";
import { PEOPLE, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
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

const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6b7280", margin: "6px 0 0" };
const twoColumns: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={link ? "Modifier l'employé" : "Ajouter un employé"}
      subtitle={link ? `${link.employee.full_name} · ${farmName}` : farmName}
      width={400}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting} style={dialogButton.primary}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={twoColumns}>
          <label style={dialogLabel}>
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
              style={dialogInput}
            />
          </label>
          <label style={dialogLabel}>
            Téléphone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="20 123 456"
              disabled={submitting}
              style={dialogInput}
            />
          </label>
        </div>

        <div style={dialogCard(PEOPLE.tint)}>
          <div style={dialogSection(PEOPLE.text)}><span aria-hidden>🧑‍🌾</span> Rôle dans la ferme</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FarmEmployeeRole)}
            disabled={submitting}
            aria-label="Rôle dans la ferme"
            style={{ ...dialogInput, marginTop: 0 }}
          >
            <option value="membre">Membre</option>
            <option value="coordinateur">Coordinateur</option>
          </select>
          {role === "coordinateur" && (
            <p style={hintStyle}>
              Un seul coordinateur par ferme : l'actuel coordinateur de {farmName} repassera membre.
            </p>
          )}
        </div>

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}