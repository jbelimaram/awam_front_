import { useEffect, useState } from "react";
import Modal from "../Common/Modal";
import type { DashboardParcel } from "../../types/dashboard";
import type { ParcelUpdatePayload } from "../../types/parcel";

interface ParcelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: DashboardParcel | null;
  currentStatus: string | null;
  onSubmit: (payload: ParcelUpdatePayload) => Promise<void>;
}

interface FormState {
  name: string;
  culture_type: string;
  soil_type: string;
  irrigation_type: string;
  status: "active" | "inactive";
}

const EMPTY_FORM: FormState = {
  name: "",
  culture_type: "",
  soil_type: "",
  irrigation_type: "",
  status: "active",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #4b5563",
  marginTop: 4,
  background: "#111827",
  color: "#ffffff",
};

export default function ParcelFormModal({
  isOpen,
  onClose,
  parcel,
  currentStatus,
  onSubmit,
}: ParcelFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parcel && isOpen) {
      setForm({
        name: parcel.nom,
        culture_type: parcel.culture_type || "",
        soil_type: parcel.soil_type || "",
        irrigation_type: parcel.irrigation_type || "",
        status: currentStatus === "inactive" ? "inactive" : "active",
      });
      setError(null);
    }
  }, [parcel, currentStatus, isOpen]);

  if (!parcel) return null;

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      setError("Le nom est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        culture_type: form.culture_type.trim() || null,
        soil_type: form.soil_type.trim() || null,
        irrigation_type: form.irrigation_type.trim() || null,
        status: form.status,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier la parcelle">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 12, color: "#d1d5db" }}>
          Nom
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "#d1d5db" }}>
          Culture
          <input
            type="text"
            value={form.culture_type}
            onChange={(e) => setForm({ ...form, culture_type: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "#d1d5db" }}>
          Type de sol
          <input
            type="text"
            value={form.soil_type}
            onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "#d1d5db" }}>
          Irrigation
          <input
            type="text"
            value={form.irrigation_type}
            onChange={(e) => setForm({ ...form, irrigation_type: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "#d1d5db" }}>
          Statut
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
            disabled={submitting}
            style={fieldStyle}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        {error && <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ flex: 1, background: "transparent", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: 6, padding: "8px 0", cursor: "pointer" }}
          >
            Annuler
          </button>
          <button
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