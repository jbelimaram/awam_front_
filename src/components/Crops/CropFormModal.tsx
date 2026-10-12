import { useEffect, useState } from "react";
import DateField from "../Common/DateField";
import Modal from "../Common/Modal";
import VarietyField from "./VarietyField";
import { cropService } from "../../Services/cropService";
import { useToast } from "../../hooks/useToast";
import type {
  Crop,
  CropStatus,
  CropSuggestions,
  CropUpdatePayload,
  SpeciesOption,
} from "../../types/crop";

interface CropFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelId: number;
  /** Culture à ouvrir directement (bouton « Modifier » de la fiche) */
  crop?: Crop | null;
  /** Appelé après enregistrement, avec la culture à sélectionner ensuite */
  onSaved: (cropId?: number) => void | Promise<void>;
}

/**
 * Une ligne du formulaire : culture déjà suivie (`id` présent) ou
 * nouvelle culture à déclarer (`id` absent).
 */
interface CropRow {
  /** Clé stable : id de la culture, ou code de l'espèce pour une nouvelle */
  key: string;
  id?: number;
  code: string;
  /** Nouvelle culture : retenue ou non à l'enregistrement */
  checked: boolean;
  /** Culture suivie : marquée pour suppression, appliquée à l'enregistrement */
  deleted: boolean;
  /** Culture suivie : modifiée depuis l'ouverture du formulaire */
  dirty: boolean;
  variety: string;
  in_production: boolean;
  planting_date: string;
  density: string;
  status: CropStatus;
  expected_harvest_date: string;
  /** La date prévue n'est envoyée que si l'utilisateur l'a modifiée */
  expected_touched: boolean;
  actual_harvest_date: string;
  notes: string;
}

/** Ligne d'une nouvelle culture, champs vides. */
const newRow = (code: string): CropRow => ({
  key: `new-${code}`,
  code,
  checked: true,
  deleted: false,
  dirty: false,
  variety: "",
  in_production: false,
  planting_date: "",
  density: "",
  status: "active",
  expected_harvest_date: "",
  expected_touched: false,
  actual_harvest_date: "",
  notes: "",
});

/** Ligne d'une culture suivie, champs remplis depuis la base. */
const existingRow = (crop: Crop): CropRow => ({
  key: `crop-${crop.id}`,
  id: crop.id,
  code: crop.species,
  checked: true,
  deleted: false,
  dirty: false,
  variety: crop.variety ?? "",
  in_production: crop.in_production,
  planting_date: crop.planting_date ?? "",
  density: crop.density != null ? String(crop.density) : "",
  status: crop.status,
  expected_harvest_date: crop.expected_harvest_date ?? "",
  expected_touched: false,
  actual_harvest_date: crop.actual_harvest_date ?? "",
  notes: crop.notes ?? "",
});

/** Mois et année d'une date ISO : « 03/2010 ». */
const monthYear = (iso: string) => {
  const [y, m] = iso.split("-");
  return m && y ? `${m}/${y}` : iso;
};

/** Résumé d'une culture, affiché quand sa ligne est repliée. */
function rowSummary(row: CropRow, isOrchard: boolean): string {
  if (row.deleted) return "sera supprimée à l'enregistrement";
  if (!row.checked) return "non retenue";
  const parts: string[] = [];
  if (row.variety) parts.push(row.variety);
  if (row.planting_date) parts.push(`plantée ${monthYear(row.planting_date)}`);
  if (isOrchard && row.in_production) parts.push("en production");
  if (row.status === "harvested") parts.push("récoltée");
  if (row.status === "abandoned") parts.push("abandonnée");
  if (row.dirty) parts.push("modifiée");
  return parts.length ? parts.join(" · ") : "à compléter";
}

const toDensity = (v: string) => (v ? Number(v.replace(",", ".")) : null);

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
const disabledFieldStyle: React.CSSProperties = { ...fieldStyle, opacity: 0.45, cursor: "not-allowed" };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", margin: "3px 0 0" };
const sectionStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4,
};
const iconButtonStyle: React.CSSProperties = {
  background: "none", border: "none", padding: "2px 4px",
  cursor: "pointer", fontSize: 13, lineHeight: 1,
};

/**
 * Gestion des cultures d'une parcelle : création, modification et
 * suppression dans un seul formulaire.
 *
 * - CULTURES SUIVIES : chaque culture existante, avec ✎ pour déplier ses
 *   champs et 🗑 pour la marquer à supprimer.
 * - À DÉCLARER : espèces lues sur la parcelle, déjà cochées, et ajout
 *   d'une autre espèce.
 *
 * Une seule ligne est dépliée à la fois, pour garder le formulaire court.
 * Rien n'est envoyé avant « Enregistrer » : « Annuler » annule tout, y
 * compris une suppression marquée par erreur.
 */
export default function CropFormModal({
  isOpen,
  onClose,
  parcelId,
  crop = null,
  onSaved,
}: CropFormModalProps) {
  const { showToast } = useToast();

  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [suggestions, setSuggestions] = useState<CropSuggestions | null>(null);
  const [rows, setRows] = useState<CropRow[]>([]);
  const [loading, setLoading] = useState(false);
  // Une seule ligne dépliée à la fois : le formulaire reste court
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState("");

  const [invalidDates, setInvalidDates] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speciesByCode = (code: string) => species.find((s) => s.code === code);

  // Référentiel : une seule lecture
  useEffect(() => {
    if (!isOpen || species.length > 0) return;
    cropService.listSpecies().then(setSpecies).catch(() => setSpecies([]));
  }, [isOpen, species.length]);

  // Ouverture : cultures suivies + espèces lues sur la parcelle
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setInvalidDates({});
    setToAdd("");
    setRows([]);
    setSuggestions(null);
    setLoading(true);

    Promise.all([cropService.listByParcel(parcelId), cropService.suggestions(parcelId)])
      .then(([crops, s]) => {
        setSuggestions(s);
        const existing = crops.map(existingRow);
        const declared = s.suggested.map(newRow);
        setRows([...existing, ...declared]);
        // Ouverture directe d'une culture (fiche) ; sinon la première à déclarer
        setOpenKey(crop ? `crop-${crop.id}` : declared[0]?.key ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, [isOpen, crop, parcelId]);

  const existing = rows.filter((r) => r.id !== undefined);
  const declared = rows.filter((r) => r.id === undefined);

  const setDate = (key: string, valid: boolean) =>
    setInvalidDates((prev) => ({ ...prev, [key]: !valid }));

  /** Met à jour une ligne ; une culture suivie est alors marquée modifiée. */
  const updateRow = (key: string, patch: Partial<CropRow>) =>
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, ...patch, dirty: r.id !== undefined ? true : r.dirty } : r
      )
    );

  const toggleDelete = (row: CropRow) => {
    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, deleted: !r.deleted } : r)));
    if (!row.deleted && openKey === row.key) setOpenKey(null);
  };

  // Espèces encore ajoutables : ni déjà listées, ni déjà suivies
  const addable = species.filter(
    (s) =>
      !rows.some((r) => r.code === s.code) &&
      !(suggestions?.already_active ?? []).includes(s.code)
  );

  const addSpecies = () => {
    if (!toAdd) return;
    const row = newRow(toAdd);
    setRows((prev) => [...prev, row]);
    setOpenKey(row.key);
    setToAdd("");
  };

  // ------------------------------------------------------------------
  // Enregistrement : suppressions, modifications, créations
  // ------------------------------------------------------------------
  const handleSubmit = async () => {
    if (Object.values(invalidDates).some(Boolean)) {
      setError("Une date saisie n'existe pas. Corrigez-la avant d'enregistrer.");
      return;
    }

    const toDelete = existing.filter((r) => r.deleted);
    const toUpdate = existing.filter((r) => !r.deleted && r.dirty);
    const toCreate = declared.filter((r) => r.checked);

    if (toDelete.length + toUpdate.length + toCreate.length === 0) {
      setError("Aucune modification à enregistrer.");
      return;
    }

    const missingHarvest = [...toUpdate, ...toCreate].find(
      (r) => r.status === "harvested" && !r.actual_harvest_date
    );
    if (missingHarvest) {
      setOpenKey(missingHarvest.key);
      setError(
        `${speciesByCode(missingHarvest.code)?.label ?? missingHarvest.code} : indiquez la date de récolte réelle.`
      );
      return;
    }

    if (toDelete.length > 0) {
      const names = toDelete.map((r) => speciesByCode(r.code)?.label ?? r.code).join(", ");
      const confirmed = window.confirm(
        `${toDelete.length > 1 ? "Ces cultures seront supprimées" : "Cette culture sera supprimée"} ` +
          `avec tout son historique : ${names}. Continuer ?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);
    let selectId: number | undefined;

    try {
      for (const row of toDelete) {
        await cropService.remove(row.id!);
      }

      for (const row of toUpdate) {
        const harvested = row.status === "harvested";
        const payload: CropUpdatePayload = {
          variety: row.variety.trim() || null,
          planting_date: row.planting_date || null,
          density: toDensity(row.density),
          in_production: speciesByCode(row.code)?.is_orchard ? row.in_production : false,
          status: row.status,
          notes: row.notes.trim() || null,
        };
        if (row.expected_touched && !harvested) {
          payload.expected_harvest_date = row.expected_harvest_date || null;
        }
        if (harvested) {
          payload.actual_harvest_date = row.actual_harvest_date || null;
        }
        const saved = await cropService.update(row.id!, payload);
        selectId = saved.id;
      }

      for (const row of toCreate) {
        const harvested = row.status === "harvested";
        const created = await cropService.create({
          parcel_id: parcelId,
          species: row.code,
          variety: row.variety.trim() || null,
          planting_date: row.planting_date || null,
          density: toDensity(row.density),
          in_production: speciesByCode(row.code)?.is_orchard ? row.in_production : false,
          status: row.status,
          notes: row.notes.trim() || null,
          // Vide = calculée par le back depuis le calendrier
          expected_harvest_date:
            row.expected_touched && !harvested ? row.expected_harvest_date || null : undefined,
        });
        // Culture déjà récoltée : la date réelle est posée par une
        // modification, qui applique la règle « date prévue figée ».
        if (harvested) {
          await cropService.update(created.id, {
            status: "harvested",
            actual_harvest_date: row.actual_harvest_date,
          });
        }
        selectId = created.id;
      }

      const parts: string[] = [];
      if (toCreate.length) parts.push(`${toCreate.length} créée${toCreate.length > 1 ? "s" : ""}`);
      if (toUpdate.length) parts.push(`${toUpdate.length} modifiée${toUpdate.length > 1 ? "s" : ""}`);
      if (toDelete.length) parts.push(`${toDelete.length} supprimée${toDelete.length > 1 ? "s" : ""}`);
      showToast("success", `Cultures : ${parts.join(", ")}.`);

      await onSaved(selectId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Rendu d'une ligne (culture suivie ou à déclarer)
  // ------------------------------------------------------------------
  const renderRow = (row: CropRow) => {
    const spec = speciesByCode(row.code);
    const isExisting = row.id !== undefined;
    const active = isExisting ? !row.deleted : row.checked;
    const isOpen = openKey === row.key && active;
    const harvested = row.status === "harvested";
    const dateKey = (field: string) => `${row.key}.${field}`;

    return (
      <div
        key={row.key}
        style={{
          border: `1px solid ${row.deleted ? "#7f1d1d" : isOpen ? "#4b5563" : "#374151"}`,
          borderRadius: 7,
          background: row.deleted ? "rgba(127,29,29,0.15)" : isOpen ? "#1f2937" : "transparent",
          opacity: active || row.deleted ? 1 : 0.55,
        }}
      >
        {/* ---- Ligne résumée ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px" }}>
          {!isExisting && (
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(e) => {
                setRows((prev) =>
                  prev.map((r) => (r.key === row.key ? { ...r, checked: e.target.checked } : r))
                );
                if (!e.target.checked && openKey === row.key) setOpenKey(null);
              }}
              disabled={submitting}
            />
          )}

          <button
            type="button"
            onClick={() => active && setOpenKey(isOpen ? null : row.key)}
            disabled={!active}
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", padding: 0, minWidth: 0,
              color: "#ffffff", cursor: active ? "pointer" : "default",
              textAlign: "left", fontFamily: "inherit",
            }}
          >
            <strong
              style={{
                fontSize: 13, flexShrink: 0,
                textDecoration: row.deleted ? "line-through" : "none",
              }}
            >
              {spec?.label ?? row.code}
            </strong>
            <span
              style={{
                fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: row.deleted ? "#fca5a5" : row.dirty ? "#fbbf24" : "#9ca3af",
              }}
            >
              {rowSummary(row, Boolean(spec?.is_orchard))}
            </span>
            {!isExisting && active && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{isOpen ? "▾" : "▸"}</span>
            )}
          </button>

          {/* Culture suivie : modifier / supprimer */}
          {isExisting && (
            <>
              {!row.deleted && (
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : row.key)}
                  disabled={submitting}
                  title={isOpen ? "Replier" : "Modifier"}
                  style={{ ...iconButtonStyle, color: isOpen ? "#ffffff" : "#d1d5db" }}
                >
                  {isOpen ? "▾" : "✎"}
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleDelete(row)}
                disabled={submitting}
                title={row.deleted ? "Annuler la suppression" : "Supprimer"}
                style={{ ...iconButtonStyle, color: row.deleted ? "#d1d5db" : "#f87171", fontSize: row.deleted ? 11 : 13 }}
              >
                {row.deleted ? "Annuler" : "🗑"}
              </button>
            </>
          )}
        </div>

        {/* ---- Champs de la culture, uniquement si dépliée ---- */}
        {isOpen && (
          <div style={{ padding: "0 9px 9px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <label style={labelStyle}>
              Variété
              <VarietyField
                varieties={spec?.varieties ?? []}
                value={row.variety}
                onChange={(v) => updateRow(row.key, { variety: v })}
                disabled={submitting}
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Densité (plants/ha)
              <input
                type="number"
                value={row.density}
                onChange={(e) => updateRow(row.key, { density: e.target.value })}
                disabled={submitting}
                placeholder="Ex. 8000"
                style={fieldStyle}
              />
            </label>

            <DateField
              label="Date de plantation"
              value={row.planting_date}
              onChange={(v, valid) => {
                updateRow(row.key, { planting_date: v });
                setDate(dateKey("planting_date"), valid);
              }}
              disabled={submitting}
              labelStyle={labelStyle}
              inputStyle={fieldStyle}
            />

            <label style={labelStyle}>
              Statut
              <select
                value={row.status}
                onChange={(e) => updateRow(row.key, { status: e.target.value as CropStatus })}
                disabled={submitting}
                style={fieldStyle}
              >
                <option value="active">En cours</option>
                <option value="harvested">Récoltée</option>
                <option value="abandoned">Abandonnée</option>
              </select>
            </label>

            <DateField
              label="Récolte prévue"
              value={row.expected_harvest_date}
              onChange={(v, valid) => {
                updateRow(row.key, { expected_harvest_date: v, expected_touched: true });
                setDate(dateKey("expected_harvest_date"), valid);
              }}
              disabled={submitting || harvested}
              labelStyle={labelStyle}
              inputStyle={harvested ? disabledFieldStyle : fieldStyle}
            />

            {harvested ? (
              <DateField
                label="Récolte réelle"
                value={row.actual_harvest_date}
                onChange={(v, valid) => {
                  updateRow(row.key, { actual_harvest_date: v });
                  setDate(dateKey("actual_harvest_date"), valid);
                }}
                disabled={submitting}
                labelStyle={labelStyle}
                inputStyle={fieldStyle}
              />
            ) : (
              <label style={labelStyle}>
                Notes
                <input
                  type="text"
                  value={row.notes}
                  onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                  disabled={submitting}
                  style={fieldStyle}
                />
              </label>
            )}

            {spec?.is_orchard && (
              <div style={{ gridColumn: "1 / -1" }}>
                <OrchardCheckbox
                  checked={row.in_production}
                  onChange={(v) => updateRow(row.key, { in_production: v })}
                  disabled={submitting}
                />
              </div>
            )}

            <p style={{ ...hintStyle, gridColumn: "1 / -1" }}>
              {harvested
                ? "Récoltée : la récolte prévue est figée, seule la date réelle se renseigne."
                : "Récolte prévue vide : calculée automatiquement depuis le calendrier."}
            </p>
          </div>
        )}
      </div>
    );
  };

  const title = `Cultures de ${suggestions?.parcel_name ?? "la parcelle"}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={hintStyle}>Chargement des cultures de la parcelle…</p>}

        {/* ---- Cultures suivies : modifier / supprimer ---- */}
        {!loading && existing.length > 0 && (
          <>
            <div style={sectionStyle}>Cultures suivies</div>
            {existing.map(renderRow)}
          </>
        )}

        {/* ---- À déclarer : création ---- */}
        {!loading && (
          <>
            <div style={sectionStyle}>À déclarer</div>

            {declared.length === 0 && (
              <p style={hintStyle}>
                Aucune nouvelle culture lue sur la parcelle. Ajoutez une espèce ci-dessous.
              </p>
            )}
            {declared.map(renderRow)}

            {addable.length > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={toAdd}
                  onChange={(e) => setToAdd(e.target.value)}
                  disabled={submitting}
                  style={{ ...fieldStyle, flex: 1 }}
                >
                  <option value="">Ajouter une espèce…</option>
                  {addable.map((s) => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addSpecies}
                  disabled={!toAdd || submitting}
                  style={{
                    marginTop: 3, padding: "0 12px", borderRadius: 6, border: "none",
                    background: "#16a34a", color: "#ffffff", fontWeight: 600,
                    cursor: toAdd ? "pointer" : "not-allowed", opacity: toAdd ? 1 : 0.5,
                  }}
                >
                  ＋
                </button>
              </div>
            )}

            {suggestions && suggestions.unknown.length > 0 && (
              <p style={{ ...hintStyle, color: "#fbbf24" }}>
                Non reconnues dans le référentiel : {suggestions.unknown.join(", ")}
              </p>
            )}
          </>
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
            disabled={submitting || loading}
            style={{ flex: 1, background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 0", fontWeight: 600, cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Case « Verger en production », réservée aux arbres fruitiers. */
function OrchardCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        fontSize: 12, color: "#d1d5db", cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ marginTop: 2 }}
      />
      <span>
        Verger en production
        <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
          Cochez si les arbres donnent déjà une récolte.
        </span>
      </span>
    </label>
  );
}