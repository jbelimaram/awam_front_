import { useEffect, useState } from "react";
import Modal from "../Common/Modal";
import CultureSelect from "./CultureSelect";
import type { DashboardParcel } from "../../types/dashboard";
import type { GeoJsonGeometry, ParcelUpdatePayload } from "../../types/parcel";
import { parcelService } from "../../Services/parcelService";
import { parcelAnalysisService } from "../../Services/parcelAnalalysisService";
import AnalysisFields, {
  EMPTY_ANALYSIS_FORM,
  isAnalysisEmpty,
  toAnalysisPayload,
  type AnalysisFormState,
} from "./AnalysisFields";

/**
 * Deux modes :
 *  - modification : passer `parcel` (+ `currentStatus`) et `onSubmit`
 *  - création     : passer `farmId`, `geometry` (polygone dessiné) et `onCreated`
 */
interface ParcelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel?: DashboardParcel | null;
  currentStatus?: string | null;
  onSubmit?: (payload: ParcelUpdatePayload) => Promise<void>;
  farmId?: number | null;
  geometry?: GeoJsonGeometry | null;
  onCreated?: (parcelId: number) => void | Promise<void>;
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

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db" };

export default function ParcelFormModal({
  isOpen,
  onClose,
  parcel,
  currentStatus = null,
  onSubmit,
  farmId = null,
  geometry = null,
  onCreated,
}: ParcelFormModalProps) {
  const isCreate = !parcel;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [analysis, setAnalysis] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);
  const [showAnalysis, setShowAnalysis] = useState(false);
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
    } else if (!parcel && isOpen) {
      setForm(EMPTY_FORM);
      setAnalysis(EMPTY_ANALYSIS_FORM);
      setShowAnalysis(false);
      setError(null);
    }
  }, [parcel, currentStatus, isOpen]);

  if (isCreate && (farmId == null || !geometry)) return null;

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      setError("Le nom est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fields = {
      name,
      culture_type: form.culture_type.trim() || null,
      soil_type: form.soil_type.trim() || null,
      irrigation_type: form.irrigation_type.trim() || null,
    };
    try {
      if (isCreate) {
        const created = await parcelService.create({
          ...fields,
          farm_id: farmId as number,
          geometry: geometry as GeoJsonGeometry,
        });
        // Le statut se règle à part : une nouvelle parcelle inactive
        // ne doit pas déclencher d'analyse satellite.
        if (form.status === "inactive") {
          await parcelService.update(created.id, { status: "inactive" });
        }
        // Analyse de laboratoire facultative, saisie en même temps que la parcelle
        if (!isAnalysisEmpty(analysis)) {
          await parcelAnalysisService.create(created.id, toAnalysisPayload(analysis));
        }
        await onCreated?.(created.id);
      } else {
        await onSubmit?.({ ...fields, status: form.status });
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : isCreate ? "Erreur lors de la création." : "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isCreate ? "Nouvelle parcelle" : "Modifier la parcelle"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          Nom
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
        </label>

        {/* Cultures : choix dans le référentiel, plusieurs possibles */}
        <div style={labelStyle}>
          Cultures
          <CultureSelect
            value={form.culture_type}
            onChange={(v) => setForm({ ...form, culture_type: v })}
            disabled={submitting}
            fieldStyle={fieldStyle}
          />
        </div>

        {/* Deux colonnes : le formulaire reste court malgré tous les champs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

          <label style={labelStyle}>
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

          <label style={labelStyle}>
            Type de sol
            <input
              type="text"
              value={form.soil_type}
              onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
              disabled={submitting}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Irrigation
            <input
              type="text"
              value={form.irrigation_type}
              onChange={(e) => setForm({ ...form, irrigation_type: e.target.value })}
              disabled={submitting}
              style={fieldStyle}
            />
          </label>
        </div>

        {/* Analyses de laboratoire : repliées par défaut, uniquement à la création */}
        {isCreate && (
          <div style={{ borderTop: "1px solid #374151", paddingTop: 10 }}>
            <button
              type="button"
              onClick={() => setShowAnalysis((v) => !v)}
              disabled={submitting}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#d1d5db",
                fontSize: 12,
                textAlign: "left",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Analyses de sol et d'eau (optionnel)</span>
              <span>{showAnalysis ? "▲" : "▼"}</span>
            </button>

            {showAnalysis && (
              <div style={{ marginTop: 10 }}>
                <AnalysisFields form={analysis} onChange={setAnalysis} disabled={submitting} />
              </div>
            )}
          </div>
        )}

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