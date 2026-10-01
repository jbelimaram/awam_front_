import { useCallback, useEffect, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { farmEmployeeService } from "../../Services/farmEmployeeService";
import { employeeService } from "../../Services/employeeService";
import type { FarmEmployee } from "../../types/farmEmployee";
import type { Employee } from "../../types/employee";

export default function EmployeeAssignmentCard() {
  const { selectedFarmId } = useSelection();
  const [links, setLinks] = useState<FarmEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!selectedFarmId) {
      setLinks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await farmEmployeeService.listByFarm(selectedFarmId);
      setLinks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    employeeService.list().then(setAllEmployees).catch(console.error);
  }, []);

  const availableToAdd = allEmployees.filter(
    (e) => !links.some((link) => link.employee.id === e.id)
  );

  const handleAdd = async () => {
    if (!selectedFarmId || selectedEmployeeId === "") return;
    setAdding(true);
    setError(null);
    try {
      await farmEmployeeService.addToFarm(selectedFarmId, {
        employee_id: selectedEmployeeId,
        role: "membre",
      });
      setSelectedEmployeeId("");
      await loadLinks();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'affectation.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (linkId: number) => {
    if (!selectedFarmId) return;
    try {
      await farmEmployeeService.removeFromFarm(selectedFarmId, linkId);
      await loadLinks();
    } catch (e) {
      console.error(e);
    }
  };

  if (!selectedFarmId) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#666" }}>
        Sélectionne une ferme pour gérer ses employés.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <strong style={{ display: "block", marginBottom: 8 }}>Affectation des employés</strong>

      {loading && <p style={{ color: "#666" }}>Chargement…</p>}

      {!loading && links.length === 0 && (
        <p style={{ color: "#666", marginBottom: 8 }}>Aucun employé affecté à cette ferme.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {links.map((link) => (
          <div
            key={link.id}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f5f5", borderRadius: 6, padding: "4px 8px" }}
          >
            <span>
              {link.employee.full_name}
              {link.role && <span style={{ color: "#666", fontSize: 11 }}> · {link.role}</span>}
            </span>
            <button
              onClick={() => handleRemove(link.id)}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 12 }}
            >
              Retirer
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : "")}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
        >
          <option value="">— Choisir un employé —</option>
          {availableToAdd.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={adding || selectedEmployeeId === ""}
          style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: adding ? "wait" : "pointer" }}
        >
          {adding ? "…" : "+ Ajouter"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}