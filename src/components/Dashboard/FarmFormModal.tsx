import { useEffect, useState } from "react";
import { farmService } from "../../Services/farmService";
import { useToast } from "../../hooks/useToast";
import { geocodeLocation } from "../../utils/geocode";
import type { Farm } from "../../types/farm";
import Dialog from "../Common/Dialog";
import { dialogButton, dialogInput, dialogLabel } from "../Common/dialogStyles";

interface FarmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm?: Farm | null;
  onSaved: (farmId: number) => void | Promise<void>;
}

const EMPTY = { name: "", location: "" };

/**
 * Création / modification d'une ferme, dans la fenêtre claire commune.
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier la ferme" : "Nouvelle ferme"}
      subtitle={isEdit ? farm?.name : "Ses parcelles s'ajoutent ensuite sur la carte"}
      width={400}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="submit" form="farm-form" disabled={submitting} style={dialogButton.primary}>
            {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </>
      }
    >
      <form id="farm-form" onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={dialogLabel}>
          Nom de la ferme *
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={submitting}
            maxLength={150}
            placeholder="Ex. Sidi Mechreg"
            style={dialogInput}
          />
        </label>

        <label style={dialogLabel}>
          Lieu <span style={{ color: "#9ca3af" }}>(facultatif)</span>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            disabled={submitting}
            placeholder="Ex. Makthar, Siliana"
            style={dialogInput}
          />
          <span style={{ display: "block", fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>
            Sert à afficher la météo de la ferme.
          </span>
        </label>

        {error && <p style={{ fontSize: 12.5, color: "#b91c1c", margin: 0 }}>{error}</p>}
      </form>
    </Dialog>
  );
}