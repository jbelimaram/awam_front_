import { useMemo, useRef, useState } from "react";
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
import FarmFormModal from "../components/Dashboard/FarmFormModal";
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

interface DashboardContentProps {
  showFarmForm: boolean;
  onCloseFarmForm: () => void;
}

function DashboardContent({ showFarmForm, onCloseFarmForm }: DashboardContentProps) {
  const {
    selectedFarmId,
    selectedParcel,
    parcelsForSelectedFarm,
    selectParcel,
    refreshParcels,
    refreshFarms,
  } = useSelection();

  const mapRef = useRef<ParcelMapCardHandle>(null);

  const [baseMapKey, setBaseMapKey] = useState<BaseMapKey>("satellite");
  // Tous les rasters disponibles sont affichés ; le choix se fait au niveau
  // du fond de carte et de l'indice suivi, pas d'une liste de calques.
  const visibleRasterLayers = useMemo<Set<RasterType>>(
    () => new Set(RASTER_TYPES.map((r) => r.id)),
    []
  );
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showParcelForm, setShowParcelForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJsonGeometry | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  // Indice suivi au survol des parcelles ; null = aucun survol
  const [hoverIndice, setHoverIndice] = useState<string | null>(null);

  // « ＋ » de la liste des parcelles : passe la carte en mode dessin
  const handleStartDrawing = () => {
    mapRef.current?.startDrawing();
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
    <div
      style={{
        display: "flex",
        height: "100%",
        gap: 12,
        padding: 12,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Colonne gauche : parcelles, fiche, historique */}
      {!mapFullscreen && (
        <div
          style={{
            width: 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
          }}
        >
          <div style={cardStyle}>
            <ParcelSelectors
              onAddParcel={handleStartDrawing}
              canAddParcel={selectedFarmId !== null}
            />
          </div>
          <div style={cardStyle}>
            <ParcelInfoCard />
          </div>
          <div style={cardStyle}>
            <OperationHistoryCard />
          </div>
        </div>
      )}

      {/* Zone droite : carte en haut, indices + employés en dessous */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            // En plein écran, la carte occupe toute la zone
            flex: mapFullscreen ? 1 : "0 0 58%",
            minHeight: 0,
            position: "relative",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <ParcelMapCard
            ref={mapRef}
            parcelsForSelectedFarm={parcelsForSelectedFarm}
            selectedParcel={selectedParcel}
            onSelectParcel={selectParcel}
            baseMapKey={baseMapKey}
            visibleRasterLayers={visibleRasterLayers}
            hoverIndice={hoverIndice}
            onDrawChange={setHasDrawn}
          />
          <MapToolbar
            mapRef={mapRef}
            baseMapKey={baseMapKey}
            onBaseMapChange={setBaseMapKey}
            hasDrawn={hasDrawn}
            onRequestSave={handleRequestSave}
            canDraw={selectedFarmId !== null}
            isFullscreen={mapFullscreen}
            onToggleFullscreen={() => setMapFullscreen((v) => !v)}
            hoverIndice={hoverIndice}
            onHoverIndiceChange={setHoverIndice}
          />
        </div>

        {!mapFullscreen && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
            <div style={{ ...cardStyle, flex: 1, minWidth: 0, overflowY: "auto" }}>
              <IndicesChartCard />
            </div>
            <div style={{ ...cardStyle, flex: 1, minWidth: 0, overflowY: "auto" }}>
              <EmployeeAssignmentCard />
            </div>
          </div>
        )}
      </div>

      <FarmFormModal
        isOpen={showFarmForm}
        onClose={onCloseFarmForm}
        onSaved={(farmId) => refreshFarms(farmId)}
      />

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
  const [showFarmForm, setShowFarmForm] = useState(false);

  // SelectionProvider englobe le layout : la sidebar (liste des fermes) et
  // la barre supérieure (fil d'Ariane, météo) en dépendent.
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <DashboardContent
          showFarmForm={showFarmForm}
          onCloseFarmForm={() => setShowFarmForm(false)}
        />
      </DashboardLayout>
    </SelectionProvider>
  );
}