import { useSelection } from "../../hooks/useSelection";

/**
 * Liste des parcelles de la ferme sélectionnée.
 *
 * Pour créer une parcelle, on utilise le crayon ✏️ de la carte : il
 * ouvre directement le dessin du contour, ce qui rendait inutile un
 * second bouton ici.
 */
export default function ParcelSelectors() {
  const { selectedParcelId, parcelsForSelectedFarm, selectParcel, loadingParcels, selectedFarmId } =
    useSelection();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: 14, color: "#111827" }}>Parcelles</strong>
      </div>

      {loadingParcels && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>}

      {!loadingParcels && selectedFarmId === null && (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Sélectionnez une ferme.</p>
      )}

      {!loadingParcels && selectedFarmId !== null && parcelsForSelectedFarm.length === 0 && (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Aucune parcelle. Utilisez le crayon ✏️ de la carte pour en dessiner une.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
        {parcelsForSelectedFarm.map((p) => {
          const isActive = p.id === selectedParcelId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectParcel(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 6,
                border: "none",
                background: isActive ? "#1b4332" : "transparent",
                color: isActive ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
                width: "100%",
              }}
            >
              <span
                title={p.status === "active" ? "Parcelle active" : "Parcelle inactive"}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: p.status === "active" ? "#16a34a" : "#9ca3af",
                }}
              />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.nom}
              </span>
              <span style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.55 }}>
                {p.surface_ha.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}