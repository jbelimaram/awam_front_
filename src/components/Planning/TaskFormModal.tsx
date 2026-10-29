import { useEffect, useMemo, useState } from "react";
import Dialog from "../Common/Dialog";
import { PEOPLE, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
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

/** Valeur de la liste pour une tâche personnalisée, tapée librement */
const OTHER = "__autre__";

interface AttachedRow {
  key: number;
  type: string;
  date: string;
}

const twoColumns: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const smallButton: React.CSSProperties = {
  background: "#fff", border: "1px solid #d1d5db", color: "#374151",
  borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer",
};

/**
 * Planifier une tâche (avec ses tâches attachées) ou la modifier.
 *
 * Le type se choisit dans la liste, ou se TAPE avec « Autre : nouveau
 * type… » : c'est une tâche personnalisée, enregistrée dans la tâche
 * elle-même et proposée ensuite dans toutes les fermes.
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
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState("");
  /** Heure prévue, facultative (HH:MM) */
  const [time, setTime] = useState("");
  const [cropId, setCropId] = useState("");
  const [team, setTeam] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [attached, setAttached] = useState<AttachedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(task?.activity_type ?? "");
    setCustomType("");
    setDate(task?.planned_for ?? defaultDate);
    setTime(task?.planned_time ? task.planned_time.slice(0, 5) : "");
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
    // Tâche personnalisée : le nom tapé (le back reprend une écriture existante)
    const taskType = type === OTHER ? customType.trim() : type;
    if (!taskType) return setError("Indiquez le nom de la nouvelle tâche.");
    if (taskType.length > 60) return setError("Le nom de la tâche ne doit pas dépasser 60 caractères.");
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
        await activityService.update(task.id, {
          activity_type: taskType, planned_for: date, planned_time: time ? `${time}:00` : null, ...common,
        });
        showToast("success", "Tâche modifiée.");
      } else {
        const main = await activityService.create({
          parcel_id: parcelId, activity_type: taskType, status: "a_realiser", planned_for: date,
          planned_time: time ? `${time}:00` : null, ...common,
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier la tâche" : "Nouvelle tâche"}
      subtitle={parcelName}
      width={440}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={dialogButton.primary}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Planifier"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={twoColumns}>
          <label style={dialogLabel}>
            Type de tâche *
            <select value={type} onChange={(e) => { setType(e.target.value); setError(null); }} disabled={saving} style={dialogInput} aria-label="Type de tâche">
              <option value="">Choisir…</option>
              {typeOptions}
              <option value={OTHER}>Autre : nouveau type…</option>
            </select>
            {type === OTHER && (
              <input
                value={customType}
                onChange={(e) => { setCustomType(e.target.value); setError(null); }}
                placeholder="Ex. Paillage"
                disabled={saving}
                style={dialogInput}
                aria-label="Nom de la nouvelle tâche"
              />
            )}
          </label>
          <label style={dialogLabel}>
            Culture
            <select value={cropId} onChange={(e) => setCropId(e.target.value)} disabled={saving} style={dialogInput} aria-label="Culture">
              <option value="">Toute la parcelle</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>{c.species_label ?? c.species}</option>
              ))}
            </select>
          </label>
          {/* Date prévue et heure facultative : chacune sur une demi-largeur */}
          <label style={dialogLabel}>
            Date prévue *
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} disabled={saving} style={dialogInput} aria-label="Date prévue" />
          </label>
          <label style={dialogLabel}>
            Heure <span style={{ color: "#9ca3af" }}>(facultative)</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={saving} style={dialogInput} aria-label="Heure prévue" />
          </label>
          <label style={dialogLabel}>
            Équipe chargée
            <select value={team} onChange={(e) => chooseTeam(e.target.value)} disabled={saving} style={dialogInput} aria-label="Équipe chargée">
              <option value="">Aucune équipe</option>
              {teams.map((code) => (
                <option key={code} value={code}>Équipe {teamLabel(code, taskTypes).toLowerCase()}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Employés : à cocher, dans un encadré teinté */}
        <div style={dialogCard(PEOPLE.tint)}>
          <div style={dialogSection(PEOPLE.text)}>
            <span aria-hidden>👥</span> Employés *
            <span style={{ fontWeight: 400, color: "#6b7280" }}>· {checked.size} coché{checked.size > 1 ? "s" : ""}</span>
          </div>
          {activeLinks.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>Aucun employé actif dans cette ferme.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto" }}>
              {activeLinks.map((l) => {
                const on = checked.has(l.employee.id);
                return (
                  <label
                    key={l.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                      background: "#fff", border: `1px solid ${on ? PEOPLE.accent : "#d1d5db"}`, fontSize: 12.5, color: "#111827",
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(l.employee.id)} disabled={saving} style={{ accentColor: PEOPLE.accent }} />
                    {l.employee.full_name}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Tâches attachées : à la création seulement */}
        {!isEdit && (
          <div style={dialogCard("#f6f7f6")}>
            <div style={dialogSection("#374151")}><span aria-hidden>🔗</span> Tâches attachées</div>
            {attached.map((a) => (
              <div key={a.key} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#9ca3af" }}>↳</span>
                <select
                  value={a.type}
                  onChange={(e) => updateAttached(a.key, { type: e.target.value })}
                  disabled={saving}
                  style={{ ...dialogInput, marginTop: 0 }}
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
                  style={{ ...dialogInput, marginTop: 0, maxWidth: 150 }}
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
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6b7280" }}>
                Elles reprennent la culture, l'équipe et les employés de la tâche principale.
              </p>
            )}
          </div>
        )}

        {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
      </div>
    </Dialog>
  );
}