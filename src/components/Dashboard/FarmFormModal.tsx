import { useEffect, useState } from "react";
import { farmService } from "../../Services/farmService";
import { useToast } from "../../hooks/useToast";
import { geocodeLocation } from "../../utils/geocode";
import type { Farm } from "../../types/farm";

interface FarmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm?: Farm | null;
  onSaved: (farmId: number) => void | Promise<void>;
}

const EMPTY = { name: "", location: "" };

/**
 * Création / modification d'une ferme.
 * La position (latitude, longitude) sert à la météo du tableau de bord :
 * elle est déduite du lieu saisi, sans que l'utilisateur ait à la connaître.
 */
export default function FarmFormModal({ isOpen, onClose, farm = null, onSaved }: FarmFormModalProps) {
  const isEdit = Boolean(farm);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm(farm ? { name: farm.name, location: farm.location ?? "" } : EMPTY);
  }, [isOpen, farm]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Le nom de la ferme est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const location = form.location.trim();
      // Position déduite du lieu : utilisée par la météo de la barre supérieure
      const coords = location ? await geocodeLocation(location) : null;

      const payload = {
        name,
        location: location || null,
        latitude: coords?.lat ?? farm?.latitude ?? null,
        longitude: coords?.lon ?? farm?.longitude ?? null,
      };

      const saved = isEdit
        ? await farmService.update(farm!.id, payload)
        : await farmService.create(payload);

      showToast("success", isEdit ? "Ferme modifiée avec succès." : "Ferme créée avec succès.");
      if (location && !coords) {
        showToast("error", "Lieu introuvable : la météo ne sera pas disponible pour cette ferme.");
      }
      await onSaved(saved.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 20,
          width: "100%",
          maxWidth: 380,
          fontFamily: "system-ui, sans-serif",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#111827" }}>
            {isEdit ? "Modifier la ferme" : "Nouvelle ferme"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4, color: "#374151" }}>
            Nom de la ferme
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={submitting}
            maxLength={150}
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          <label style={{ display: "block", fontSize: 13, marginBottom: 4, color: "#374151" }}>
            Lieu (optionnel)
          </label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            disabled={submitting}
            placeholder="Ex. Makthar, Siliana"
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 12px" }}>
            Sert à afficher la météo de la ferme.
          </p>

          {error && (
            <p style={{ fontSize: 13, color: "#b42318", marginBottom: 10 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                background: "#1b4332",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                fontSize: 14,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}