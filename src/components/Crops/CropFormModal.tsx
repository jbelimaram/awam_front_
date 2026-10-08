import { useEffect, useState } from "react";
import Modal from "../Common/Modal";
import { cropService } from "../../Services/cropService";
import { useToast } from "../../hooks/useToast";
import type {
  Crop,
  CropCreatePayload,
  CropStatus,
  CropUpdatePayload,
  SpeciesOption,
} from "../../types/crop";

interface CropFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelId: number;
  crop?: Crop | null;
  onSaved: (cropId: number) => void | Promise<void>;
}

interface FormState {
  species: string;
  variety: string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date: string;
  density: string;
  in_production: boolean;
  status: CropStatus;
  notes: string;
}

const EMPTY: FormState = {
  species: "",
  variety: "",
  planting_date: "",
  expected_harvest_date: "",
  actual_harvest_date: "",
  density: "",
  in_production: false,
  status: "active",
  notes: "",
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

const disabledFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", margin: "3px 0 0" };

/**
 * Création et modification d'une culture.
 *
 * Règles reprises du back :
 * - l'espèce se choisit dans le référentiel ;
 * - la récolte prévue est calculée automatiquement depuis le calendrier
 *   si l'utilisateur la laisse vide ;
 * - pour un arbre fruitier, elle n'est calculée que si le verger est en
 *   production ;
 * - une fois la culture récoltée, la date prévue est figée et seule la
 *   date réelle se saisit.
 */
export default function CropFormModal({
  isOpen,
  onClose,
  parcelId,
  crop = null,
  onSaved,
}: CropFormModalProps) {
  const isEdit = Boolean(crop);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  // La date prévue n'est envoyée que si l'utilisateur l'a modifiée :
  // sinon le back la calcule depuis le calendrier.
  const [expectedTouched, setExpectedTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Le référentiel ne change pas : une seule lecture suffit
  useEffect(() => {
    if (!isOpen || species.length > 0) return;
    cropService.listSpecies().then(setSpecies).catch(() => setSpecies([]));
  }, [isOpen, species.length]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setExpectedTouched(false);
    setForm(
      crop
        ? {
            species: crop.species,
            variety: crop.variety ?? "",
            planting_date: crop.planting_date ?? "",
            expected_harvest_date: crop.expected_harvest_date ?? "",
            actual_harvest_date: crop.actual_harvest_date ?? "",
            density: crop.density != null ? String(crop.density) : "",
            in_production: crop.in_production,
            status: crop.status,
            notes: crop.notes ?? "",
          }
        : EMPTY
    );
  }, [isOpen, crop]);

  const selectedSpecies = species.find((s) => s.code === form.species);
  const isOrchard = selectedSpecies?.is_orchard ?? false;
  const isHarvested = form.status === "harvested";

  const handleSubmit = async () => {
    if (!form.species) {
      setError("Choisissez une espèce.");
      return;
    }
    if (isHarvested && !form.actual_harvest_date) {
      setError("Indiquez la date de récolte réelle.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const common = {
      species: form.species,
      variety: form.variety.trim() || null,
      planting_date: form.planting_date || null,
      density: form.density ? Number(form.density.replace(",", ".")) : null,
      in_production: isOrchard ? form.in_production : false,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    try {
      let saved: Crop;
      if (isEdit) {
        const payload: CropUpdatePayload = { ...common };
        // Date prévue : seulement si modifiée et culture encore en cours
        if (expectedTouched && !isHarvested) {
          payload.expected_harvest_date = form.expected_harvest_date || null;
        }
        if (isHarvested) {
          payload.actual_harvest_date = form.actual_harvest_date || null;
        }
        saved = await cropService.update(crop!.id, payload);
      } else {
        const payload: CropCreatePayload = { ...common, parcel_id: parcelId };
        if (expectedTouched && form.expected_harvest_date) {
          payload.expected_harvest_date = form.expected_harvest_date;
        }
        saved = await cropService.create(payload);
      }
      showToast("success", isEdit ? "Culture modifiée." : "Culture créée.");
      await onSaved(saved.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Modifier la culture" : "Nouvelle culture"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* ---- Espèce ---- */}
        <label style={labelStyle}>
          Espèce
          <select
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          >
            <option value="">— Choisir —</option>
            {species.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <p style={hintStyle}>
          L'espèce détermine les stades, les seuils d'indices et les besoins en eau.
        </p>

        {/* ---- Verger en production (arbres uniquement) ---- */}
        {isOrchard && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#d1d5db",
              background: "#1f2937",
              borderRadius: 6,
              padding: "7px 9px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.in_production}
              onChange={(e) => setForm({ ...form, in_production: e.target.checked })}
              disabled={submitting}
            />
            <span>
              Verger en production
              <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                Cochez si les arbres donnent déjà une récolte. Sans cela, aucune
                date de récolte n'est proposée.
              </span>
            </span>
          </label>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={labelStyle}>
            Variété
            <input
              type="text"
              value={form.variety}
              onChange={(e) => setForm({ ...form, variety: e.target.value })}
              disabled={submitting}
              placeholder="Ex. Chemlali"
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Statut
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as CropStatus })}
              disabled={submitting}
              style={fieldStyle}
            >
              <option value="active">En cours</option>
              <option value="harvested">Récoltée</option>
              <option value="abandoned">Abandonnée</option>
            </select>
          </label>

          <label style={labelStyle}>
            Plantation
            <input
              type="date"
              value={form.planting_date}
              onChange={(e) => setForm({ ...form, planting_date: e.target.value })}
              disabled={submitting}
              style={fieldStyle}
            />
          </label>

          {/* ---- Récolte prévue : figée une fois la culture récoltée ---- */}
          <label style={labelStyle}>
            Récolte prévue
            <input
              type="date"
              value={form.expected_harvest_date}
              onChange={(e) => {
                setExpectedTouched(true);
                setForm({ ...form, expected_harvest_date: e.target.value });
              }}
              disabled={submitting || isHarvested}
              style={isHarvested ? disabledFieldStyle : fieldStyle}
            />
          </label>
        </div>

        {!isHarvested && (
          <p style={hintStyle}>
            Laissez « Récolte prévue » vide : elle est calculée automatiquement
            depuis le calendrier de l'espèce et la date de plantation.
          </p>
        )}

        {/* ---- Récolte réelle : uniquement si la culture est récoltée ---- */}
        {isHarvested && (
          <label style={labelStyle}>
            Récolte réelle
            <input
              type="date"
              value={form.actual_harvest_date}
              onChange={(e) => setForm({ ...form, actual_harvest_date: e.target.value })}
              disabled={submitting}
              style={fieldStyle}
            />
            <span style={{ ...hintStyle, display: "block" }}>
              La récolte prévue est figée : seule la date réelle se renseigne.
            </span>
          </label>
        )}

        <label style={labelStyle}>
          Densité (plants/ha)
          <input
            type="number"
            value={form.density}
            onChange={(e) => setForm({ ...form, density: e.target.value })}
            disabled={submitting}
            placeholder="Ex. 8000"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Notes
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            disabled={submitting}
            style={fieldStyle}
          />
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