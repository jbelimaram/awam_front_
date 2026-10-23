import { useEffect, useMemo, useState } from "react";
import Modal from "../Common/Modal";
import { activityService } from "../../Services/activityService";
import { useToast } from "../../hooks/useToast";
import type { Activity } from "../../types/activity";
import type { Crop } from "../../types/crop";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelId: number;
  parcelName: string;
  /** Employés de la ferme, avec leur équipe */
  links: FarmEmployee[];
  taskTypes: TaskType[];
  /** Cultures de la parcelle */
  crops: Crop[];
  /** Tâche à modifier ; absente pour planifier une nouvelle tâche */
  task?: Activity | null;
  /** Date proposée pour une nouvelle tâche (AAAA-MM-JJ) */
  defaultDate: string;
  onSaved: () => void;
}

interface AttachedRow {
  key: number;
  type: string;
  date: string;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid #4b5563", marginTop: 3,
  background: "#111827", color: "#ffffff", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#d1d5db", display: "block" };
const smallButton: React.CSSProperties = {
  background: "transparent", border: "1px solid #4b5563", color: "#d1d5db",
  borderRadius: 6, padding: "4px 9px", fontSize: 12, cursor: "pointer",
};

/**
 * Planifier une tâche (avec ses tâches attachées) ou la modifier.
 *
 * Choisir une équipe coche d'office ses membres ACTIFS ; on peut en
 * décocher ou en ajouter d'autres. Les tâches attachées reprennent la
 * parcelle, la culture, l'équipe et les employés de la tâche principale.
 */
export default function TaskFormModal({
  isOpen, onClose, parcelId, parcelName, links, taskTypes, crops, task, defaultDate, onSaved,
}: TaskFormModalProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(task);

  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [cropId, setCropId] = useState("");
  const [team, setTeam] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [attached, setAttached] = useState<AttachedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(task?.activity_type ?? "");
    setDate(task?.planned_for ?? defaultDate);
    setCropId(task?.crop_id ? String(task.crop_id) : "");
    setTeam(task?.team ?? "");
    setChecked(new Set(task?.employees.map((e) => e.id) ?? []));
    setAttached([]);
    setError(null);
  }, [isOpen, task, defaultDate]);

  /** Employés actifs de la ferme : seuls eux reçoivent une tâche à venir */
  const activeLinks = useMemo(
    () =>
      links
        .filter((l) => l.employee.is_active !== false)
        .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name, "fr")),
    [links],
  );
  /** Équipes formées dans la ferme */
  const teams = useMemo(() => [...new Set(links.map((l) => l.team).filter(Boolean))] as string[], [links]);

  const chooseTeam = (code: string) => {
    setTeam(code);
    setError(null);
    // Les membres actifs de l'équipe sont cochés d'office
    if (code) setChecked(new Set(activeLinks.filter((l) => l.team === code).map((l) => l.employee.id)));
  };

  /** Modifie une tâche attachée ; la valeur est lue AVANT la mise à jour */
  const updateAttached = (key: number, change: Partial<AttachedRow>) =>
    setAttached((rows) => rows.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!type) return setError("Choisissez le type de tâche.");
    if (!date) return setError("Indiquez la date prévue.");
    if (checked.size === 0) return setError("Cochez au moins un employé.");
    if (attached.some((a) => !a.type || !a.date)) return setError("Complétez ou retirez les tâches attachées.");

    const common = {
      crop_id: cropId ? Number(cropId) : null,
      team: team || null,
      employee_ids: [...checked],
    };

    setSaving(true);
    setError(null);
    try {
      if (task) {
        await activityService.update(task.id, { activity_type: type, planned_for: date, ...common });
        showToast("success", "Tâche modifiée.");
      } else {
        const main = await activityService.create({
          parcel_id: parcelId, activity_type: type, status: "a_realiser", planned_for: date, ...common,
        });
        for (const a of attached) {
          await activityService.create({
            parcel_id: parcelId, activity_type: a.type, status: "a_realiser", planned_for: a.date,
            parent_id: main.id, ...common,
          });
        }
        showToast(
          "success",
          attached.length
            ? `Tâche planifiée, avec ${attached.length} tâche${attached.length > 1 ? "s" : ""} attachée${attached.length > 1 ? "s" : ""}.`
            : "Tâche planifiée.",
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = taskTypes.map((t) => (
    <option key={t.code} value={t.code}>{t.label}</option>
  ));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Modifier la tâche" : `Nouvelle tâche · ${parcelName}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#e5e7eb" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={labelStyle}>
            Type de tâche *
            <select value={type} onChange={(e) => { setType(e.target.value); setError(null); }} disabled={saving} style={fieldStyle} aria-label="Type de tâche">
              <option value="">Choisir…</option>
              {typeOptions}
            </select>
          </label>
          <label style={labelStyle}>
            Date prévue *
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} disabled={saving} style={fieldStyle} aria-label="Date prévue" />
          </label>
          <label style={labelStyle}>
            Culture
            <select value={cropId} onChange={(e) => setCropId(e.target.value)} disabled={saving} style={fieldStyle} aria-label="Culture">
              <option value="">Toute la parcelle</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>{c.species_label ?? c.species}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Équipe chargée
            <select value={team} onChange={(e) => chooseTeam(e.target.value)} disabled={saving} style={fieldStyle} aria-label="Équipe chargée">
              <option value="">Aucune équipe</option>
              {teams.map((code) => (
                <option key={code} value={code}>Équipe {teamLabel(code, taskTypes).toLowerCase()}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div style={{ ...labelStyle, marginBottom: 6 }}>
            Employés * <span style={{ color: "#9ca3af" }}>· {checked.size} coché{checked.size > 1 ? "s" : ""}</span>
          </div>
          {activeLinks.length === 0 ? (
            <p style={{ margin: 0, color: "#9ca3af" }}>Aucun employé actif dans cette ferme.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 150, overflowY: "auto" }}>
              {activeLinks.map((l) => (
                <label
                  key={l.id}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: checked.has(l.employee.id) ? "#1f3a2e" : "#1f2937" }}
                >
                  <input type="checkbox" checked={checked.has(l.employee.id)} onChange={() => toggle(l.employee.id)} disabled={saving} />
                  {l.employee.full_name}
                </label>
              ))}
            </div>
          )}
        </div>

        {!isEdit && (
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Tâches attachées</div>
            {attached.map((a) => (
              <div key={a.key} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#9ca3af" }}>↳</span>
                <select
                  value={a.type}
                  onChange={(e) => updateAttached(a.key, { type: e.target.value })}
                  disabled={saving}
                  style={{ ...fieldStyle, marginTop: 0 }}
                  aria-label="Type de la tâche attachée"
                >
                  <option value="">Choisir…</option>
                  {typeOptions}
                </select>
                <input
                  type="date"
                  value={a.date}
                  onChange={(e) => updateAttached(a.key, { date: e.target.value })}
                  disabled={saving}
                  style={{ ...fieldStyle, marginTop: 0, maxWidth: 150 }}
                  aria-label="Date de la tâche attachée"
                />
                <button type="button" onClick={() => setAttached((rows) => rows.filter((r) => r.key !== a.key))} disabled={saving} style={smallButton} title="Retirer">
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAttached((rows) => [...rows, { key: Date.now(), type: "", date }])}
              disabled={saving}
              style={smallButton}
            >
              ＋ Attacher une tâche
            </button>
            {attached.length > 0 && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9ca3af" }}>
                Elles reprennent la culture, l'équipe et les employés de la tâche principale.
              </p>
            )}
          </div>
        )}

        {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, background: "transparent", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: 6, padding: "8px 0", cursor: "pointer" }}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "…" : isEdit ? "Enregistrer" : "Planifier"}
          </button>
        </div>
      </div>
    </Modal>
  );
}