import { useEffect, useState } from "react";
import Dialog from "../Common/Dialog";
import { SECTION_TINT, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
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

const twoColumns: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? "Nouvelle parcelle" : "Modifier la parcelle"}
      subtitle={isCreate ? "Le contour dessiné sur la carte sera enregistré avec elle" : parcel?.nom}
      width={430}
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
        <label style={dialogLabel}>
          Nom *
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
            placeholder="Ex. Kemel 1"
            style={dialogInput}
          />
        </label>

        {/* Cultures : choix dans le référentiel, plusieurs possibles */}
        <div style={dialogLabel}>
          Cultures
          <CultureSelect
            value={form.culture_type}
            onChange={(v) => setForm({ ...form, culture_type: v })}
            disabled={submitting}
            fieldStyle={dialogInput}
          />
        </div>

        <div style={dialogCard(SECTION_TINT.green)}>
          <div style={dialogSection("#3B6D11")}><span aria-hidden>🌾</span> Parcelle</div>
          <div style={twoColumns}>
            <label style={dialogLabel}>
              Statut
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                disabled={submitting}
                style={dialogInput}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label style={dialogLabel}>
              Type de sol
              <input
                type="text"
                value={form.soil_type}
                onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                disabled={submitting}
                placeholder="Ex. Sableuse"
                style={dialogInput}
              />
            </label>
            <label style={dialogLabel}>
              Irrigation
              <input
                type="text"
                value={form.irrigation_type}
                onChange={(e) => setForm({ ...form, irrigation_type: e.target.value })}
                disabled={submitting}
                placeholder="Ex. Goutte-à-goutte"
                style={dialogInput}
              />
            </label>
          </div>
        </div>

        {/* Analyse de laboratoire : facultative, uniquement à la création */}
        {isCreate && (
          <div style={{ borderTop: "1px solid #eef0ee", paddingTop: 10 }}>
            <button
              type="button"
              onClick={() => setShowAnalysis((v) => !v)}
              disabled={submitting}
              style={{
                width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 13, fontWeight: 600, color: "#3B6D11", fontFamily: "inherit",
              }}
            >
              <span>🧪 Analyse de sol et d'eau <span style={{ fontWeight: 400, color: "#9ca3af" }}>(facultatif)</span></span>
              <span style={{ color: "#9ca3af" }}>{showAnalysis ? "▲" : "▼"}</span>
            </button>
            {showAnalysis && (
              <div style={{ marginTop: 10 }}>
                <AnalysisFields form={analysis} onChange={setAnalysis} disabled={submitting} />
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}