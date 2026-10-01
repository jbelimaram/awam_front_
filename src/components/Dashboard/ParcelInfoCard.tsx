import { useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { parcelService } from "../../Services/parcelService";
import { formatAreaHa } from "../../utils/geo";

const RASTER_STATUS_LABELS: Record<string, string> = {
  pending: "Génération en cours…",
  ready: "Rasters prêts",
  failed: "Échec de génération",
};

export default function ParcelInfoCard() {
  const { selectedParcel, refreshParcels } = useSelection();
  const [saving, setSaving] = useState(false);

  if (!selectedParcel) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#666" }}>
        Sélectionne une parcelle pour voir ses informations.
      </div>
    );
  }

  const toggleStatus = async () => {
    const nextStatus = selectedParcel.geometry ? undefined : undefined; // placeholder, see note below
    void nextStatus;
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <strong style={{ display: "block", fontSize: 15, marginBottom: 8 }}>
        {selectedParcel.nom}
      </strong>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, color: "#444" }}>
        <div>📐 Surface : <strong>{formatAreaHa(selectedParcel.surface_ha)}</strong></div>
        {selectedParcel.culture_type && <div>🌱 Culture : {selectedParcel.culture_type}</div>}
        {selectedParcel.soil_type && <div>🪨 Sol : {selectedParcel.soil_type}</div>}
        {selectedParcel.irrigation_type && <div>💧 Irrigation : {selectedParcel.irrigation_type}</div>}
        <div>🏡 Ferme : {selectedParcel.farm_name}</div>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await parcelService.refresh(selectedParcel.id, true);
            await refreshParcels(selectedParcel.id);
          } catch (e) {
            console.error(e);
          } finally {
            setSaving(false);
          }
        }}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "6px 0",
          borderRadius: 6,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          color: "#2563eb",
          fontSize: 12,
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? "Lancement…" : "🔄 Rafraîchir les indices"}
      </button>
    </div>
  );
}