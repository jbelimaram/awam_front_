import { useSelection } from "../../hooks/useSelection";

export default function ParcelSelectors() {
  const {
    farms,
    selectedFarmId,
    selectedParcelId,
    parcelsForSelectedFarm,
    selectFarm,
    selectParcel,
    loadingFarms,
    loadingParcels,
  } = useSelection();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>
          Ferme {loadingFarms && "…"}
        </label>
        <select
          value={selectedFarmId ?? ""}
          onChange={(e) => selectFarm(Number(e.target.value) || null)}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
        >
          {farms.length === 0 && <option value="">Aucune ferme</option>}
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>
          Parcelle {loadingParcels && "…"}
        </label>
        <select
          value={selectedParcelId ?? ""}
          onChange={(e) => selectParcel(Number(e.target.value) || null)}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
        >
          <option value="">— Choisir une parcelle —</option>
          {parcelsForSelectedFarm.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}