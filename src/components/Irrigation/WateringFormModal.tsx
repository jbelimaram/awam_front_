import { useEffect, useMemo, useState } from "react";
import Dialog from "../Common/Dialog";
import { SECTION_TINT, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
import { dayToDateTime, isoDay, nowTime } from "../Planning/planningUtils";
import { irrigationService } from "../../Services/irrigationService";
import type { Crop } from "../../types/crop";
import type { Employee } from "../../types/employee";
import type { Equipment, Watering, WateringMethod, WateringQuantity } from "../../types/irrigation";
import { KIND_META, fmt } from "./equipmentDisplay";

export type WateringMode = "create" | "edit" | "complete";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: WateringMode;
  parcelId: number;
  parcelName: string;
  /** Surface de la parcelle (m²), pour la lame d'eau en mm */
  parcelAreaM2: number | null;
  equipment: Equipment[];
  crops: Crop[];
  employees: Employee[];
  /** L'arrosage à modifier ou à marquer réalisé */
  watering: Watering | null;
  onSaved: (watering: Watering) => void;
}

/** Façons de mesurer l'eau, selon l'équipement */
const METHOD_LABELS: Record<WateringMethod, string> = {
  arrosoirs: "Nombre d'arrosoirs",
  duree: "Durée",
  compteur: "Compteur",
  volume: "Volume estimé",
};

function methodsFor(e: Equipment | undefined): WateringMethod[] {
  if (!e) return ["volume"];
  if (e.kind === "arrosoir") return ["arrosoirs"];
  return ["duree", "compteur"];
}

function defaultMethod(e: Equipment | undefined): WateringMethod {
  if (!e) return "volume";
  if (e.kind === "arrosoir") return "arrosoirs";
  return e.has_meter ? "compteur" : "duree";
}

/** Débit d'un équipement (L/min), pour le calcul en direct */
function flowLPerMin(e: Equipment | undefined): number | null {
  if (!e) return null;
  if (e.kind === "tuyau") return e.hose_flow_l_min;
  if (e.kind === "goutte_a_goutte" && e.total_flow_l_h) return e.total_flow_l_h / 60;
  return null;
}

const num = (v: string): number | null => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** Minutes entre deux heures HH:MM ; null si incomplet ou négatif */
function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d > 0 ? d : null;
}

/**
 * Un arrosage : le planifier, le modifier, ou le marquer réalisé avec la
 * quantité réelle. Les champs de quantité s'adaptent à l'équipement, et le
 * volume s'affiche en direct, en litres et en mm sur la parcelle.
 */
export default function WateringFormModal({
  isOpen, onClose, mode, parcelId, parcelName, parcelAreaM2, equipment, crops, employees, watering, onSaved,
}: Props) {
  const [done, setDone] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [cropId, setCropId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [method, setMethod] = useState<WateringMethod>("volume");
  const [canCount, setCanCount] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meterVolume, setMeterVolume] = useState("");
  const [volume, setVolume] = useState("");
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Équipements proposés : ceux en service, et celui de l'arrosage */
  const choices = useMemo(
    () => equipment.filter((e) => e.active || e.id === watering?.equipment_id),
    [equipment, watering],
  );
  const selected = choices.find((e) => String(e.id) === equipmentId);

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;
    const w = watering;
    const isDone = mode === "complete" || (mode === "edit" && w !== null && w.status !== "a_realiser");
    setDone(isDone);
    if (mode === "complete" || (isDone && !w?.performed_at)) {
      setDay(isoDay(new Date()));
      setTime(nowTime());
    } else if (isDone && w?.performed_at) {
      const d = new Date(w.performed_at);
      setDay(isoDay(d));
      setTime(d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setDay(w?.planned_for ?? isoDay(new Date()));
      setTime(hhmm(w?.planned_time));
    }
    setCropId(str(w?.crop_id));
    const eq = equipment.find((e) => e.id === w?.equipment_id);
    setEquipmentId(str(w?.equipment_id));
    setMethod(w?.method ?? defaultMethod(eq));
    setCanCount(str(w?.can_count));
    setStartTime(hhmm(w?.start_time));
    setEndTime(hhmm(w?.end_time));
    setMeterVolume(str(w?.meter_volume_l));
    setVolume(w?.method === "volume" ? str(w?.volume_l) : "");
    setEmployeeIds(w?.employees.map((e) => e.id) ?? []);
    setError(null);
  }, [isOpen, mode, watering, equipment]);

  const chooseEquipment = (id: string) => {
    setEquipmentId(id);
    setMethod(defaultMethod(choices.find((e) => String(e.id) === id)));
    setError(null);
  };

  /** Volume calculé en direct, comme le back */
  const liters = useMemo((): number | null => {
    if (method === "arrosoirs") {
      const n = num(canCount);
      return n && selected?.can_capacity_l ? n * selected.can_capacity_l : null;
    }
    if (method === "duree") {
      const minutes = minutesBetween(startTime, endTime);
      const flow = flowLPerMin(selected);
      return minutes && flow ? minutes * flow : null;
    }
    if (method === "compteur") return num(meterVolume);
    return num(volume);
  }, [method, canCount, startTime, endTime, meterVolume, volume, selected]);

  const toggleEmployee = (id: number) =>
    setEmployeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const quantity = (): WateringQuantity => ({
    equipment_id: selected ? selected.id : null,
    method,
    can_count: method === "arrosoirs" ? num(canCount) : null,
    start_time: method === "duree" && startTime ? startTime : null,
    end_time: method === "duree" && endTime ? endTime : null,
    meter_volume_l: method === "compteur" ? num(meterVolume) : null,
    volume_l: method === "volume" ? num(volume) : null,
  });

  const save = async () => {
    if (!day) return setError("Indiquez la date.");
    if (done) {
      if (!time) return setError("Indiquez l'heure de réalisation.");
      if (employeeIds.length === 0) return setError("Indiquez au moins un employé qui a fait l'arrosage.");
      if (method === "duree" && startTime && endTime && !minutesBetween(startTime, endTime)) {
        return setError("L'heure de fin doit être après l'heure de début.");
      }
      if (liters === null) return setError("Indiquez la quantité d'eau réellement apportée.");
    }
    setSaving(true);
    setError(null);
    try {
      const q = quantity();
      const crop = cropId ? Number(cropId) : null;
      let saved: Watering;
      if (mode === "complete" && watering) {
        saved = await irrigationService.completeWatering(watering.id, {
          ...q, performed_at: dayToDateTime(day, time), employee_ids: employeeIds,
        });
      } else if (mode === "edit" && watering) {
        saved = await irrigationService.updateWatering(watering.id, {
          ...q,
          crop_id: crop,
          employee_ids: employeeIds,
          ...(done ? { performed_at: dayToDateTime(day, time) } : { planned_for: day, planned_time: time || null }),
        });
      } else {
        saved = await irrigationService.createWatering({
          ...q,
          parcel_id: parcelId,
          status: done ? "realisee" : "a_realiser",
          crop_id: crop,
          employee_ids: employeeIds,
          ...(done ? { performed_at: dayToDateTime(day, time) } : { planned_for: day, planned_time: time || null }),
        });
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "complete" ? "Marquer l'arrosage réalisé" : mode === "edit" ? "Modifier l'arrosage" : "Nouvel arrosage";
  const meta = selected ? KIND_META[selected.kind] : null;
  const tint = meta ? meta.section : SECTION_TINT.blue;
  const textColor = meta ? meta.text : "#185FA5";
  const activeEmployees = employees.filter((e) => e.is_active !== false || employeeIds.includes(e.id));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Parcelle ${parcelName}`}
      width={540}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving} style={dialogButton.primary}>
            {saving ? "Enregistrement…" : mode === "complete" ? "Marquer réalisé" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* À faire, ou déjà fait (seulement pour un nouvel arrosage) */}
        {mode === "create" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { value: false, label: "📅 À faire" },
              { value: true, label: "✓ Déjà fait" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => { setDone(o.value); setTime(o.value ? nowTime() : ""); setError(null); }}
                style={{
                  padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                  border: `1px solid ${done === o.value ? "#1b4332" : "#d1d5db"}`,
                  background: done === o.value ? "#EAF3DE" : "#ffffff", color: done === o.value ? "#1b4332" : "#374151",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <label style={dialogLabel}>
            {done ? "Date réelle *" : "Date prévue *"}
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={dialogInput} />
          </label>
          <label style={dialogLabel}>
            {done ? "Heure *" : "Heure"}
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={dialogInput} />
          </label>
          <label style={dialogLabel}>
            Culture
            <select value={cropId} onChange={(e) => setCropId(e.target.value)} disabled={mode === "complete"} style={dialogInput}>
              <option value="">Toute la parcelle</option>
              {crops.filter((c) => c.status === "active" || String(c.id) === cropId).map((c) => (
                <option key={c.id} value={c.id}>{c.species_label ?? c.species}{c.variety ? ` · ${c.variety}` : ""}</option>
              ))}
            </select>
          </label>
        </div>

        {/* L'eau : équipement, façon de la mesurer, quantité */}
        <div style={dialogCard(tint)}>
          <div style={dialogSection(textColor)}>
            <span aria-hidden>{meta ? meta.icon : "💧"}</span> {done ? "Eau apportée" : "Eau prévue"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={dialogLabel}>
              Équipement
              <select value={equipmentId} onChange={(e) => chooseEquipment(e.target.value)} style={dialogInput}>
                <option value="">Sans équipement</option>
                {choices.map((e) => (
                  <option key={e.id} value={e.id}>{KIND_META[e.kind].icon} {e.name}</option>
                ))}
              </select>
            </label>
            {methodsFor(selected).length > 1 ? (
              <label style={dialogLabel}>
                Mesure
                <select value={method} onChange={(e) => setMethod(e.target.value as WateringMethod)} style={dialogInput}>
                  {methodsFor(selected).map((m) => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </label>
            ) : <span />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {method === "arrosoirs" && (
              <label style={dialogLabel}>
                Nombre d'arrosoirs {done ? "*" : ""}
                <input value={canCount} onChange={(e) => setCanCount(e.target.value)} inputMode="numeric" placeholder="20" style={dialogInput} />
              </label>
            )}
            {method === "duree" && (
              <>
                <label style={dialogLabel}>
                  Début {done ? "*" : ""}
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={dialogInput} />
                </label>
                <label style={dialogLabel}>
                  Fin {done ? "*" : ""}
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={dialogInput} />
                </label>
              </>
            )}
            {method === "compteur" && (
              <label style={dialogLabel}>
                Volume lu au compteur {done ? "*" : ""}
                <input value={meterVolume} onChange={(e) => setMeterVolume(e.target.value)} inputMode="decimal" placeholder="1500" style={dialogInput} />
              </label>
            )}
            {method === "volume" && (
              <label style={dialogLabel}>
                Volume estimé (L) {done ? "*" : ""}
                <input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="decimal" placeholder="300" style={dialogInput} />
              </label>
            )}
          </div>

          {method === "duree" && selected && !flowLPerMin(selected) && (
            <p style={{ fontSize: 11.5, color: "#854F0B", margin: "6px 0 0" }}>
              Le débit de cet équipement n'est pas connu : complétez-le dans l'onglet Équipements, ou choisissez « Compteur ».
            </p>
          )}
          {liters !== null && (
            <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: textColor }}>
              → {fmt(liters, 0)} L
              {method === "duree" && minutesBetween(startTime, endTime) ? ` en ${minutesBetween(startTime, endTime)} min` : ""}
              {parcelAreaM2 ? `, soit ${fmt(liters / parcelAreaM2, 2)} mm sur la parcelle` : ""}
            </div>
          )}
        </div>

        {/* Employés */}
        <div>
          <div style={dialogLabel}>{done ? "Employés qui l'ont fait *" : "Employés"}</div>
          {activeEmployees.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Aucun employé : ajoutez-en dans la page Employés.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {activeEmployees.map((e) => {
                const on = employeeIds.includes(e.id);
                return (
                  <label
                    key={e.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                      fontSize: 12.5, color: "#111827", background: on ? "#EEEDFE" : "#fff",
                      border: `1px solid ${on ? "#7F77DD" : "#d1d5db"}`,
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleEmployee(e.id)} style={{ accentColor: "#534AB7" }} />
                    {e.full_name}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}