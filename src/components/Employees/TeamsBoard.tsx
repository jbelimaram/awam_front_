import { useMemo, useState } from "react";
import { farmEmployeeService } from "../../Services/farmEmployeeService";
import { useToast } from "../../hooks/useToast";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { TaskType } from "../../types/taskType";
import { teamLabel } from "../../utils/teams";
import TeamMembersModal from "./TeamMembersModal";

interface TeamsBoardProps {
  farmId: number;
  farmName: string;
  links: FarmEmployee[];
  taskTypes: TaskType[];
  /** Appelé après chaque changement : employés et types à recharger */
  onChanged: () => void;
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", background: "#ffffff",
};
const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
  background: "#f3f4f6", color: "#111827", fontSize: 13,
};
const iconButton: React.CSSProperties = {
  border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer",
};

/**
 * Vue des équipes d'une ferme : une carte par équipe avec ses membres.
 * Chaque équipe, prédéfinie ou libre, a les mêmes actions :
 *   ✎ Modifier  : son nom (équipe libre) et ses membres, à cocher ;
 *   🗑 Dissoudre : tous ses membres passent sans équipe dans cette ferme ;
 *                 une équipe libre que plus aucune ferme n'utilise est
 *                 aussi retirée de la liste des types.
 * La ✕ d'un nom retire ce membre d'un seul clic.
 */
export default function TeamsBoard({ farmId, farmName, links, taskTypes, onChanged }: TeamsBoardProps) {
  const { showToast } = useToast();
  const [modalTeam, setModalTeam] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  /**
   * Équipes formées dans la ferme, dans l'ordre des types de tâche, plus
   * les types libres encore vides (pour pouvoir les remplir ou les supprimer).
   */
  const teams = useMemo(() => {
    const members = new Map<string, FarmEmployee[]>();
    for (const l of links) {
      if (!l.team) continue;
      const list = members.get(l.team);
      if (list) list.push(l);
      else members.set(l.team, [l]);
    }
    const ordered = taskTypes
      .filter((t) => members.has(t.code) || !t.predefined)
      .map((t) => ({ code: t.code, type: t as TaskType | undefined, members: members.get(t.code) ?? [] }));
    // Équipe dont le type n'est plus dans la liste : affichée quand même
    for (const [code, list] of members) {
      if (!taskTypes.some((t) => t.code === code)) ordered.push({ code, type: undefined, members: list });
    }
    return ordered;
  }, [links, taskTypes]);

  const withoutTeam = links.filter((l) => !l.team);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      showToast("success", success);
      onChanged();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = (l: FarmEmployee) =>
    run(() => farmEmployeeService.assignTeam(farmId, null, [l.id]), `${l.employee.full_name} est maintenant sans équipe.`);

    const dissolveTeam = (code: string, members: FarmEmployee[]) => {
    const label = `Équipe ${teamLabel(code, taskTypes).toLowerCase()}`;
    const detail = members.length
      ? `Ses ${members.length} membre${members.length > 1 ? "s passeront" : " passera"} sans équipe.`
      : "Elle n'a aucun membre.";
    if (!window.confirm(`Dissoudre ${label} à ${farmName} ?\n\n${detail}`)) return;

    run(async () => {
            // Un nom personnalisé que plus rien ne porte disparaît seul de la liste
    if (members.length) await farmEmployeeService.assignTeam(farmId, null, members.map((m) => m.id));
    }, `${label} dissoute.`);
  };

  const byName = (a: FarmEmployee, b: FarmEmployee) =>
    Number(b.role === "coordinateur") - Number(a.role === "coordinateur") ||
    a.employee.full_name.localeCompare(b.employee.full_name, "fr");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 15, color: "#111827" }}>Équipes de {farmName}</strong>
        <button
          type="button"
          onClick={() => setModalTeam(null)}
          disabled={busy || links.length === 0}
          style={{ border: "none", background: "#1b4332", color: "#fff", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          ＋ Nouvelle équipe
        </button>
      </div>

      {links.length === 0 && (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Ajoutez d'abord des employés à la ferme avec le bouton « ＋ » de la carte Employés.
        </p>
      )}

      {teams.map(({ code, members }) => (
        <div key={code} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: members.length ? 8 : 0 }}>
            <strong style={{ flex: 1, fontSize: 14, color: "#111827" }}>
              Équipe {teamLabel(code, taskTypes).toLowerCase()}
              <span style={{ fontWeight: 400, color: "#6b7280" }}>
                {" "}· {members.length} membre{members.length > 1 ? "s" : ""}
              </span>
            </strong>
            <button
              type="button"
              onClick={() => setModalTeam(code)}
              disabled={busy}
              style={{ ...iconButton, color: "#1b4332", borderColor: "#1b4332", fontWeight: 600 }}
            >
              ✎ Modifier l'équipe
            </button>
            <button
              type="button"
              onClick={() => dissolveTeam(code, members)}
              disabled={busy}
              style={{ ...iconButton, color: "#b91c1c", borderColor: "#fecaca" }}
              title="Dissoudre l'équipe"
            >
              🗑
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...members].sort(byName).map((l) => (
              <span key={l.id} style={chip}>
                {l.employee.full_name}
                {l.role === "coordinateur" && <span style={{ fontSize: 11, color: "#6b7280" }}>coordinateur</span>}
                <button
                  type="button"
                  onClick={() => removeMember(l)}
                  disabled={busy}
                  title={`Retirer ${l.employee.full_name} de l'équipe`}
                  style={{ border: "none", background: "none", color: "#6b7280", cursor: "pointer", padding: 0, fontSize: 13 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      {withoutTeam.length > 0 && (
        <div style={{ ...cardStyle, background: "#f9fafb" }}>
          <strong style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 8 }}>
            Sans équipe <span style={{ fontWeight: 400, color: "#6b7280" }}>· {withoutTeam.length}</span>
          </strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...withoutTeam].sort(byName).map((l) => (
              <span
                key={l.id}
                style={{ ...chip, background: "#fff", border: "1px solid #e5e7eb", color: l.employee.is_active === false ? "#9ca3af" : chip.color }}>
                {l.employee.full_name}
                {l.role === "coordinateur" && <span style={{ fontSize: 11, color: "#6b7280" }}>coordinateur</span>}
                {l.employee.is_active === false && <span style={{ fontSize: 11, color: "#b45309" }}>inactif</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <TeamMembersModal
        isOpen={modalTeam !== undefined}
        onClose={() => setModalTeam(undefined)}
        farmId={farmId}
        farmName={farmName}
        links={links}
        taskTypes={taskTypes}
        team={modalTeam ?? null}
        onSaved={onChanged}
      />
    </div>
  );
}