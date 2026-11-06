import { useEffect, useMemo, useState } from "react";
import Dialog from "../Common/Dialog";
import { dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
import { irrigationService } from "../../Services/irrigationService";
import type { Crop } from "../../types/crop";
import type { Equipment, EquipmentKind, EquipmentPayload, WaterSource } from "../../types/irrigation";
import { KIND_META, SOURCE_LABELS, fmt } from "./equipmentDisplay";
import BusyLabel from "../Common/BusyLabel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parcelId: number;
  parcelName: string;
  /** Cultures de la parcelle, pour « cultures desservies » */
  crops: Crop[];
  /** Équipement à modifier ; vide pour un nouvel équipement */
  equipment: Equipment | null;
  onSaved: (equipment: Equipment) => void;
}

/** Champs saisis, gardés en texte le temps de la saisie */
interface Form {
  name: string;
  kind: EquipmentKind;
  cropIds: number[];
  waterSource: WaterSource;
  hasMeter: boolean;
  canCapacity: string;
  hoseFlow: string;
  hoseDiameter: string;
  hoseLength: string;
  emitterFlow: string;
  emittersPerPlant: string;
  plantSpacing: string;
  rowSpacing: string;
  active: boolean;
  notes: string;
}

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
/** Texte saisi → nombre (virgule acceptée) ; vide → null */
const num = (v: string): number | null => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

function fromEquipment(e: Equipment | null): Form {
  return {
    name: e?.name ?? "",
    kind: e?.kind ?? "tuyau",
    cropIds: e?.crop_ids ?? [],
    waterSource: e?.water_source ?? "puits",
    hasMeter: e?.has_meter ?? false,
    canCapacity: str(e?.can_capacity_l),
    hoseFlow: str(e?.hose_flow_l_min),
    hoseDiameter: str(e?.hose_diameter_in),
    hoseLength: str(e?.hose_length_m),
    emitterFlow: str(e?.emitter_flow_l_h),
    emittersPerPlant: str(e?.emitters_per_plant),
    plantSpacing: str(e?.plant_spacing_m),
    rowSpacing: str(e?.row_spacing_m),
    active: e?.active ?? true,
    notes: e?.notes ?? "",
  };
}

/** Champ numérique avec son unité à droite */
function NumberField({
  label, value, onChange, unit, placeholder, hint,
}: { label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string; hint?: string }) {
  return (
    <label style={dialogLabel}>
      {label}
      <span style={{ position: "relative", display: "block" }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          style={{ ...dialogInput, paddingRight: unit ? 46 : undefined }}
        />
        {unit && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af", pointerEvents: "none" }}>
            {unit}
          </span>
        )}
      </span>
      {hint && <span style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 400 }}>{hint}</span>}
    </label>
  );
}

/**
 * Ajouter ou modifier un équipement d'irrigation. Les champs proposés
 * changent selon le type (arrosoir, tuyau, goutte-à-goutte), et les valeurs
 * calculées (débit total, plants par hectare) s'affichent en direct.
 */
export default function EquipmentFormModal({ isOpen, onClose, parcelId, parcelName, crops, equipment, onSaved }: Props) {
  const [form, setForm] = useState<Form>(fromEquipment(equipment));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(fromEquipment(equipment));
    setError(null);
  }, [isOpen, equipment]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };
  const toggleCrop = (id: number) =>
    set("cropIds", form.cropIds.includes(id) ? form.cropIds.filter((c) => c !== id) : [...form.cropIds, id]);

  /** Cultures proposées : celles en cours, et celles déjà desservies */
  const cropChoices = useMemo(
    () => crops.filter((c) => c.status === "active" || form.cropIds.includes(c.id)),
    [crops, form.cropIds],
  );

  /** Aperçu calculé en direct, comme le back */
  const preview = useMemo(() => {
    if (form.kind === "arrosoir") {
      const cap = num(form.canCapacity);
      return cap ? `${fmt(cap)} L versés à chaque arrosoir` : null;
    }
    if (form.kind === "tuyau") {
      const flow = num(form.hoseFlow);
      return flow ? `${fmt(flow * 60, 0)} litres par heure d'arrosage` : null;
    }
    const emitter = num(form.emitterFlow);
    const perPlant = num(form.emittersPerPlant);
    const a = num(form.plantSpacing);
    const b = num(form.rowSpacing);
    const parts: string[] = [];
    if (emitter && perPlant) parts.push(`${fmt(emitter * perPlant)} L/h par plant`);
    if (a && b) parts.push(`${fmt(10000 / (a * b), 0)} plants par hectare`);
    return parts.length ? parts.join(" · ") : null;
  }, [form]);

  const save = async () => {
    if (!form.name.trim()) return setError("Donnez un nom à l'équipement.");
    if (form.kind === "arrosoir" && !num(form.canCapacity)) return setError("Indiquez la capacité de l'arrosoir, en litres.");
    if (form.kind === "tuyau" && !num(form.hoseFlow) && !form.hasMeter) {
      return setError("Indiquez le débit du tuyau, ou cochez « compteur » si le volume est lu sur un compteur.");
    }
    if (form.kind === "goutte_a_goutte" && (!num(form.emitterFlow) || !num(form.emittersPerPlant))) {
      return setError("Indiquez le débit d'un goutteur et le nombre de goutteurs par plant.");
    }

    const payload: EquipmentPayload & { name: string; kind: EquipmentKind } = {
      name: form.name.trim(),
      kind: form.kind,
      crop_ids: form.cropIds,
      water_source: form.waterSource,
      has_meter: form.kind === "arrosoir" ? false : form.hasMeter,
      can_capacity_l: num(form.canCapacity),
      hose_flow_l_min: num(form.hoseFlow),
      hose_diameter_in: num(form.hoseDiameter),
      hose_length_m: num(form.hoseLength),
      emitter_flow_l_h: num(form.emitterFlow),
      emitters_per_plant: num(form.emittersPerPlant),
      plant_spacing_m: num(form.plantSpacing),
      row_spacing_m: num(form.rowSpacing),
      active: form.active,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      const saved = equipment
        ? await irrigationService.updateEquipment(equipment.id, payload)
        : await irrigationService.createEquipment({ ...payload, parcel_id: parcelId });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const meta = KIND_META[form.kind];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={equipment ? "Modifier l'équipement" : "Nouvel équipement"}
      subtitle={`Parcelle ${parcelName}`}
      width={520}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving} style={dialogButton.primary}>
            <BusyLabel busy={saving} text="Enregistrement…">{"Enregistrer"}</BusyLabel>
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={dialogLabel}>
          Nom *
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={120}
            placeholder="Ex. Tuyau du puits, Arrosoirs de la lavande"
            style={dialogInput}
          />
        </label>

        {/* Type : trois pastilles */}
        <div>
          <div style={dialogLabel}>Type *</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 4 }}>
            {(Object.keys(KIND_META) as EquipmentKind[]).map((k) => {
              const m = KIND_META[k];
              const on = form.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("kind", k)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px",
                    borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                    border: `1px solid ${on ? m.text : "#d1d5db"}`, background: on ? m.tint : "#ffffff", color: on ? m.text : "#374151",
                  }}
                >
                  <span aria-hidden>{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cultures desservies */}
        <div>
          <div style={dialogLabel}>Cultures desservies</div>
          {cropChoices.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Aucune culture en cours sur cette parcelle.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {cropChoices.map((c) => {
                const on = form.cropIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                      fontSize: 12.5, color: "#111827", background: on ? "#EAF3DE" : "#fff",
                      border: `1px solid ${on ? "#639922" : "#d1d5db"}`,
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleCrop(c.id)} style={{ accentColor: "#3B6D11" }} />
                    {c.species_label ?? c.species}
                    {c.variety ? ` · ${c.variety}` : ""}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Paramètres du type, dans un encadré teinté */}
        <div style={dialogCard(meta.section)}>
          <div style={dialogSection(meta.text)}>
            <span aria-hidden>{meta.icon}</span> {meta.label}
          </div>
          {form.kind === "arrosoir" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <NumberField label="Capacité *" value={form.canCapacity} onChange={(v) => set("canCapacity", v)} unit="L" placeholder="9" />
            </div>
          )}
          {form.kind === "tuyau" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <NumberField
                label={form.hasMeter ? "Débit" : "Débit *"} value={form.hoseFlow} onChange={(v) => set("hoseFlow", v)} unit="L/min" placeholder="18"
              />
              <NumberField label="Diamètre" value={form.hoseDiameter} onChange={(v) => set("hoseDiameter", v)} unit="″" placeholder="0,75" />
              <NumberField label="Longueur" value={form.hoseLength} onChange={(v) => set("hoseLength", v)} unit="m" placeholder="50" />
            </div>
          )}
          {form.kind === "goutte_a_goutte" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <NumberField label="Débit d'un goutteur *" value={form.emitterFlow} onChange={(v) => set("emitterFlow", v)} unit="L/h" placeholder="4" />
              <NumberField label="Goutteurs par plant *" value={form.emittersPerPlant} onChange={(v) => set("emittersPerPlant", v)} placeholder="4" />
              <NumberField label="Entre plants" value={form.plantSpacing} onChange={(v) => set("plantSpacing", v)} unit="m" placeholder="6" />
              <NumberField label="Entre lignes" value={form.rowSpacing} onChange={(v) => set("rowSpacing", v)} unit="m" placeholder="6" />
            </div>
          )}
          {form.kind !== "arrosoir" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: "#111827", cursor: "pointer" }}>
              <input type="checkbox" checked={form.hasMeter} onChange={(e) => set("hasMeter", e.target.checked)} style={{ accentColor: meta.text }} />
              Un compteur mesure le volume à la sortie de la pompe
            </label>
          )}
          {preview && (
            <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: meta.text }}>→ {preview}</div>
          )}
        </div>

        <label style={dialogLabel}>
          Source d'eau
          <select value={form.waterSource} onChange={(e) => set("waterSource", e.target.value as WaterSource)} style={dialogInput}>
            {(Object.keys(SOURCE_LABELS) as WaterSource[]).map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </label>

        <label style={dialogLabel}>
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ex. raccordé à la pompe du puits nord"
            style={{ ...dialogInput, resize: "none", fontFamily: "inherit" }}
          />
        </label>

        {equipment && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#111827", cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} style={{ accentColor: "#1b4332" }} />
            En service
            <span style={{ color: "#6b7280" }}>· décochez pour le garder sans le proposer aux arrosages</span>
          </label>
        )}

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}