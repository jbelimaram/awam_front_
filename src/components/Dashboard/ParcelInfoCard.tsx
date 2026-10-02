import { useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { parcelService } from "../../Services/parcelService";
import { useToast } from "../../hooks/useToast";
import { formatAreaHa, getCentroid } from "../../utils/geo";
import ParcelFormModal from "./ParcelFormModal";
import type { ParcelUpdatePayload } from "../../types/parcel";
import ParcelAnalysisPanel from "./ParcelAnalysisPanel";

/** Libellé affiché pour l'état du traitement satellite. */
const RASTER_STATUS_LABELS: Record<string, string> = {
  pending: "Analyse en cours…",
  ready: "Analyse à jour",
  failed: "Échec de la dernière analyse",
  none: "Pas d'analyse satellite (parcelle inactive)",
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13,
};

const label: React.CSSProperties = { color: "#6b7280", flexShrink: 0 };
const value: React.CSSProperties = {
  color: "#111827",
  fontWeight: 500,
  textAlign: "right",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/**
 * Fiche de la parcelle sélectionnée : nom, culture, superficie, statut,
 * longitude / latitude, avec les actions Éditer et Supprimer.
 */
export default function ParcelInfoCard() {
  const { selectedParcel, refreshParcels, selectParcel } = useSelection();
  const { showToast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!selectedParcel) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
        Sélectionnez une parcelle pour voir ses informations.
      </div>
    );
  }

  const isActive = selectedParcel.status === "active";
  const centroid = getCentroid(selectedParcel.geometry);

  const handleUpdate = async (payload: ParcelUpdatePayload) => {
    await parcelService.update(selectedParcel.id, payload);
    showToast("success", "Parcelle modifiée avec succès.");
    await refreshParcels(selectedParcel.id);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement la parcelle « ${selectedParcel.nom} » ?`)) return;
    setBusy(true);
    try {
      await parcelService.remove(selectedParcel.id);
      showToast("success", "Parcelle supprimée.");
      selectParcel(null);
      await refreshParcels();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshIndices = async () => {
    setBusy(true);
    try {
      await parcelService.refresh(selectedParcel.id, true);
      showToast("success", "Analyse des indices lancée.");
      await refreshParcels(selectedParcel.id);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: "#111827" }}>Info parcelle</strong>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            disabled={busy}
            title="Modifier la parcelle"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#1b4332",
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            ✎ Éditer
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            title="Supprimer la parcelle"
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #fecaca",
              background: "#ffffff",
              color: "#b42318",
              fontSize: 12,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            🗑
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={row}>
          <span style={label}>Nom</span>
          <span style={value} title={selectedParcel.nom}>{selectedParcel.nom}</span>
        </div>
        <div style={row}>
          <span style={label}>Culture</span>
          <span style={value} title={selectedParcel.culture_type ?? ""}>
            {selectedParcel.culture_type || "—"}
          </span>
        </div>
        <div style={row}>
          <span style={label}>Superficie</span>
          <span style={value}>{formatAreaHa(selectedParcel.surface_ha)}</span>
        </div>
        <div style={row}>
          <span style={label}>Statut</span>
          <span
            style={{
              ...value,
              color: isActive ? "#15803d" : "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 5,
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isActive ? "#16a34a" : "#9ca3af",
              }}
            />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={row}>
          <span style={label}>Longitude</span>
          <span style={value}>{centroid ? centroid.lon.toFixed(5) : "—"}</span>
        </div>
        <div style={row}>
          <span style={label}>Latitude</span>
          <span style={value}>{centroid ? centroid.lat.toFixed(5) : "—"}</span>
        </div>
        {selectedParcel.irrigation_type && (
          <div style={row}>
            <span style={label}>Irrigation</span>
            <span style={value} title={selectedParcel.irrigation_type}>{selectedParcel.irrigation_type}</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#6b7280", margin: "10px 0 0" }}>
        {RASTER_STATUS_LABELS[selectedParcel.raster_status] ?? ""}
      </p>

      {/* L'analyse satellite n'a de sens que sur une parcelle active */}
      {isActive && (
        <button
          type="button"
          onClick={handleRefreshIndices}
          disabled={busy}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: 12,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "…" : "🔄 Rafraîchir les indices"}
        </button>
      )}
      <ParcelAnalysisPanel parcelId={selectedParcel.id} />
      <ParcelFormModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        parcel={selectedParcel}
        currentStatus={selectedParcel.status}
        onSubmit={handleUpdate}
      />
    </div>
  );
}