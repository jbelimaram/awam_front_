import { useEffect, useMemo, useState } from "react";
import Dialog from "../Common/Dialog";
import { PEOPLE, dialogButton, dialogCard, dialogInput, dialogLabel, dialogSection } from "../Common/dialogStyles";
import { farmEmployeeService } from "../../Services/farmEmployeeService";
import { useToast } from "../../hooks/useToast";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: number;
  farmName: string;
  links: FarmEmployee[];
  taskTypes: TaskType[];
  /** Équipe à MODIFIER ; absente pour créer une NOUVELLE équipe */
  team?: string | null;
  /** Appelé après l'enregistrement : employés et types à recharger */
  onSaved: () => void;
}

/** Valeur de la liste pour un nom tapé librement */
const OTHER = "__autre__";

const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6b7280", display: "block", marginTop: 4 };

/**
 * Création ou modification d'une équipe, en une seule fenêtre.
 *
 * NOM : choisi dans la liste (types prédéfinis et libres pas encore formés
 * dans cette ferme), ou tapé librement avec « Autre : nouveau nom… ».
 * Changer le nom d'une équipe existante la fait passer, avec ses membres,
 * sous ce nouveau nom, DANS CETTE FERME seulement : le type prédéfini,
 * commun à toutes les fermes, n'est jamais modifié. Un nom personnalisé que
 * plus aucune équipe ni tâche ne porte disparaît seul de la liste.
 *
 * MEMBRES : tous les employés de la ferme se COCHENT ; en modification, les
 * membres actuels sont déjà cochés :
 *   - cocher un employé l'ajoute (il quitte son ancienne équipe) ;
 *   - décocher un membre le retire (il passe sans équipe).
 */
export default function TeamMembersModal({
  isOpen, onClose, farmId, farmName, links, taskTypes, team, onSaved,
}: TeamMembersModalProps) {
  const { showToast } = useToast();
  const isNew = !team;

  const currentMembers = useMemo(
    () => new Set(team ? links.filter((l) => l.team === team).map((l) => l.id) : []),
    [links, team],
  );

  /** Nom choisi : code d'un type, ou OTHER pour un nom tapé librement */
  const [choice, setChoice] = useState("");
  const [customName, setCustomName] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setChoice(team ?? "");
    setCustomName("");
    setChecked(new Set(currentMembers));
    setError(null);
    // Réinitialisation à chaque ouverture seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, team]);

  /**
   * Noms proposés : l'équipe elle-même, et les types pas encore formés dans
   * cette ferme (deux équipes de la ferme ne portent pas le même nom).
   */
  const usedTeams = useMemo(() => new Set(links.map((l) => l.team).filter(Boolean)), [links]);
  const nameOptions = taskTypes.filter((t) => t.code === team || !usedTeams.has(t.code));

  /** Employés actifs de la ferme : membres actuels en tête */
  const candidates = links.filter((l) => l.employee.is_active !== false).sort(
    (a, b) =>
      Number(currentMembers.has(b.id)) - Number(currentMembers.has(a.id)) ||
      a.employee.full_name.localeCompare(b.employee.full_name, "fr"),
  );

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!choice) return setError("Choisissez le nom de l'équipe.");
    const typed = customName.trim();
    if (choice === OTHER && !typed) return setError("Indiquez le nouveau nom de l'équipe.");
    if (isNew && checked.size === 0) return setError("Cochez au moins un employé.");

    // Nom tapé qui existe déjà : on reprend ce type au lieu d'en créer un
    const existing =
      choice === OTHER
        ? taskTypes.find(
            (t) => t.label.toLowerCase() === typed.toLowerCase() || t.code.toLowerCase() === typed.toLowerCase(),
          )
        : undefined;
    if (existing && existing.code !== team && usedTeams.has(existing.code)) {
      return setError(`L'équipe ${existing.label.toLowerCase()} existe déjà dans cette ferme.`);
    }

    const targetCode = choice === OTHER ? existing?.code ?? null : choice;
    const renamed = !isNew && targetCode !== team;
    const toRemove = [...currentMembers].filter((id) => !checked.has(id));
    // Nom changé : tous les membres cochés passent sous le nouveau nom ;
    // sinon, seuls les nouveaux cochés sont ajoutés
    const toAssign = renamed ? [...checked] : [...checked].filter((id) => !currentMembers.has(id));

    setSaving(true);
    setError(null);
    try {
      // Nouveau nom : le back le ramène à une écriture existante s'il y en a une
      const code = targetCode ?? typed;

      if (toRemove.length) await farmEmployeeService.assignTeam(farmId, null, toRemove);
      if (toAssign.length) await farmEmployeeService.assignTeam(farmId, code, toAssign);

      const label = `Équipe ${teamLabel(code, [...taskTypes, { id: null, code, label: code, predefined: false }]).toLowerCase()}`;
      showToast("success", isNew ? `${label} créée.` : `${label} enregistrée.`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? "Nouvelle équipe" : "Modifier l'équipe"}
      subtitle={isNew ? farmName : `Équipe ${teamLabel(team, taskTypes).toLowerCase()} · ${farmName}`}
      width={420}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={dialogButton.primary}>
            {saving ? "Enregistrement…" : isNew ? "Créer l'équipe" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={dialogLabel}>
          Nom de l'équipe *
          <select
            value={choice}
            onChange={(e) => { setChoice(e.target.value); setError(null); }}
            disabled={saving}
            style={dialogInput}
            aria-label="Nom de l'équipe"
          >
            {isNew && <option value="">Choisir…</option>}
            {nameOptions.map((t) => (
              <option key={t.code} value={t.code}>
                Équipe {t.label.toLowerCase()}
                {t.code === team ? " (actuel)" : ""}
              </option>
            ))}
            <option value={OTHER}>Autre : nouveau nom…</option>
          </select>
          {choice === OTHER && (
            <input
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setError(null); }}
              placeholder="Ex. Paillage"
              disabled={saving}
              style={dialogInput}
              aria-label="Nouveau nom de l'équipe"
            />
          )}
          {!isNew && choice !== "" && choice !== team && (
            <span style={hintStyle}>Les membres cochés passeront sous ce nom, dans {farmName} seulement.</span>
          )}
        </label>

        {/* Membres : à cocher, dans un encadré teinté */}
        <div style={dialogCard(PEOPLE.tint)}>
          <div style={dialogSection(PEOPLE.text)}>
            <span aria-hidden>👥</span> Membres
            <span style={{ fontWeight: 400, color: "#6b7280" }}>· {checked.size} coché{checked.size > 1 ? "s" : ""}</span>
          </div>
          {candidates.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>Aucun employé dans cette ferme.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {candidates.map((l) => {
                const on = checked.has(l.id);
                return (
                  <label
                    key={l.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                      background: "#fff", border: `1px solid ${on ? PEOPLE.border : "#e5e7eb"}`, fontSize: 12.5, color: "#111827",
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(l.id)} disabled={saving} style={{ accentColor: PEOPLE.accent }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {l.employee.full_name}
                      {l.role === "coordinateur" && <span style={{ color: "#6b7280" }}> · coordinateur</span>}
                    </span>
                    {l.team && l.team !== team && (
                      <span style={{ fontSize: 11, color: "#b45309", background: "#FAEEDA", borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>
                        dans Équipe {teamLabel(l.team, taskTypes).toLowerCase()}
                      </span>
                    )}
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