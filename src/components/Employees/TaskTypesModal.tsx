import { useState } from "react";
import Modal from "../Common/Modal";
import { taskTypeService } from "../../Services/taskTypeService";
import { useToast } from "../../hooks/useToast";
import type { TaskType } from "../../types/taskType";

interface TaskTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTypes: TaskType[];
  /** Appelé après chaque création, renommage ou suppression */
  onChanged: () => void;
}

const fieldStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: "6px 9px", borderRadius: 6, border: "1px solid #4b5563",
  background: "#111827", color: "#ffffff", fontSize: 13, fontFamily: "inherit",
};
const smallButton: React.CSSProperties = {
  background: "transparent", border: "1px solid #4b5563", color: "#d1d5db",
  borderRadius: 6, padding: "4px 9px", fontSize: 12, cursor: "pointer",
};

/**
 * Gestion des types de tâche : les prédéfinis en lecture seule, et les
 * types libres du compte, valables pour toutes ses fermes : ajouter,
 * renommer, supprimer.
 */
export default function TaskTypesModal({ isOpen, onClose, taskTypes, onChanged }: TaskTypesModalProps) {
  const { showToast } = useToast();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      showToast("success", success);
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opération impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Indiquez le nom du type de tâche.");
      return;
    }
    if (await run(() => taskTypeService.create(name), `Type « ${name} » ajouté.`)) setNewName("");
  };

  const rename = async (t: TaskType) => {
    const name = editName.trim();
    if (!name || t.id == null) return;
    if (await run(() => taskTypeService.rename(t.id!, name), `Type renommé en « ${name} ».`)) setEditingId(null);
  };

  const remove = async (t: TaskType) => {
    if (t.id == null || !window.confirm(`Supprimer le type « ${t.label} » ?`)) return;
    await run(() => taskTypeService.remove(t.id!), `Type « ${t.label} » supprimé.`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Types de tâche">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#e5e7eb" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
          Ils nomment les équipes, et sont proposés dans toutes vos fermes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
          {taskTypes.map((t) => (
            <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #374151" }}>
              {editingId === t.id && t.id != null ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={busy}
                    style={fieldStyle}
                    aria-label="Nouveau nom"
                  />
                  <button type="button" onClick={() => rename(t)} disabled={busy} style={{ ...smallButton, borderColor: "#16a34a", color: "#86efac" }}>
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} disabled={busy} style={smallButton}>
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {t.predefined ? (
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>prédéfini</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(t.id);
                          setEditName(t.label);
                          setError(null);
                        }}
                        disabled={busy}
                        style={smallButton}
                      >
                        ✎ Renommer
                      </button>
                      <button type="button" onClick={() => remove(t)} disabled={busy} style={{ ...smallButton, color: "#fca5a5", borderColor: "#7f1d1d" }} title={`Supprimer ${t.label}`}>
                        🗑
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
            }}
            placeholder="Nouveau type, ex. Paillage"
            disabled={busy}
            style={fieldStyle}
            aria-label="Nouveau type de tâche"
          />
          <button
            type="button"
            onClick={add}
            disabled={busy}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            ＋ Ajouter
          </button>
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}
      </div>
    </Modal>
  );
}