import { useRef, useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import ParcelMapCard, {
  type ParcelMapCardHandle,
  type BaseMapKey,
  RASTER_TYPES,
} from "../components/Dashboard/ParcelMapCard";
import MapToolbar from "../components/Dashboard/MapToolbar";
import ParcelFormModal from "../components/Dashboard/ParcelFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import ParcelInfoCard from "../components/Dashboard/ParcelInfoCard";
import IndicesChartCard from "../components/Dashboard/IndicesChartCard";
import EmployeeAssignmentCard from "../components/Dashboard/EmployeeAssignmentCard";
import OperationHistoryCard from "../components/Dashboard/OperationHistoryCard";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";
import type { RasterType } from "../types/raster";
import type { GeoJsonGeometry } from "../types/parcel";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

function DashboardContent() {
  const {
    selectedFarmId,
    selectedParcel,
    parcelsForSelectedFarm,
    selectParcel,
    refreshParcels,
  } = useSelection();

  const mapRef = useRef<ParcelMapCardHandle>(null);

  const [baseMapKey, setBaseMapKey] = useState<BaseMapKey>("satellite");
  const [visibleRasterLayers, setVisibleRasterLayers] = useState<Set<RasterType>>(
    () => new Set(RASTER_TYPES.map((r) => r.id))
  );
  const [loadingRasterLayers, setLoadingRasterLayers] = useState<Set<RasterType>>(new Set());
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showParcelForm, setShowParcelForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJsonGeometry | null>(null);

  const toggleRasterLayer = (type: RasterType) => {
    setVisibleRasterLayers((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleRequestSave = () => {
    const geometry = mapRef.current?.getDrawnGeometry() ?? null;
    if (!geometry) {
      alert("Dessine d'abord une parcelle.");
      return;
    }
    if (!selectedFarmId) {
      alert("Sélectionne d'abord une ferme.");
      return;
    }
    setPendingGeometry(geometry);
    setShowParcelForm(true);
  };

  const handleParcelCreated = async (parcelId: number) => {
    setShowParcelForm(false);
    mapRef.current?.clearDrawing();
    setHasDrawn(false);
    setPendingGeometry(null);
    await refreshParcels(parcelId);
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 12, padding: 12, boxSizing: "border-box" }}>
      {/* Colonne gauche */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={cardStyle}>
          <ParcelSelectors />
        </div>
        <div style={cardStyle}>
          <ParcelInfoCard />
        </div>
        <div style={cardStyle}>
          <OperationHistoryCard />
        </div>
      </div>

      {/* Carte centrale */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", borderRadius: 8, overflow: "hidden" }}>
        <ParcelMapCard
          ref={mapRef}
          parcelsForSelectedFarm={parcelsForSelectedFarm}
          selectedParcel={selectedParcel}
          onSelectParcel={selectParcel}
          baseMapKey={baseMapKey}
          visibleRasterLayers={visibleRasterLayers}
          onDrawChange={setHasDrawn}
          onRasterLoadingChange={setLoadingRasterLayers}
        />
        <MapToolbar
          mapRef={mapRef}
          baseMapKey={baseMapKey}
          onBaseMapChange={setBaseMapKey}
          visibleRasterLayers={visibleRasterLayers}
          onToggleRasterLayer={toggleRasterLayer}
          loadingRasterLayers={loadingRasterLayers}
          hasDrawn={hasDrawn}
          onRequestSave={handleRequestSave}
          canDraw={selectedFarmId !== null}
        />
      </div>

      {/* Colonne droite */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={cardStyle}>
          <IndicesChartCard />
        </div>
        <div style={cardStyle}>
          <EmployeeAssignmentCard />
        </div>
      </div>

      <ParcelFormModal
        isOpen={showParcelForm}
        farmId={selectedFarmId}
        geometry={pendingGeometry}
        onClose={() => setShowParcelForm(false)}
        onCreated={handleParcelCreated}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <SelectionProvider>
        <DashboardContent />
      </SelectionProvider>
    </DashboardLayout>
  );
}