import { useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import EquipmentTab from "../components/Irrigation/EquipmentTab";
import IrrigationHistory from "../components/Irrigation/IrrigationHistory";
import WaterBalanceTab from "../components/Irrigation/WaterBalanceTab";
import WateringsTab from "../components/Irrigation/WateringsTab";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";

type Tab = "equipment" | "waterings" | "history" | "follow";

/** Les quatre onglets de l'irrigation */
const TABS: { key: Tab; label: string; icon: string; next?: string }[] = [
  { key: "equipment", label: "Équipements", icon: "🔧" },
  { key: "waterings", label: "Arrosages", icon: "🚿" },
  { key: "history", label: "Historique", icon: "🕘" },
  { key: "follow", label: "Suivi", icon: "📊" },
];

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  fontFamily: "system-ui, sans-serif",
};
const muted: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: 0 };

function IrrigationContent({ showFarmForm, onCloseFarmForm }: { showFarmForm: boolean; onCloseFarmForm: () => void }) {
  const { selectedFarmId, selectedParcel, parcelsForSelectedFarm, refreshFarms } = useSelection();
  const [tab, setTab] = useState<Tab>("equipment");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div style={{ display: "flex", height: "100%", gap: 12, padding: 12, boxSizing: "border-box", overflow: "hidden" }}>
      {/* ---- Colonne gauche : parcelles, puis onglets ---- */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={card}>
          <ParcelSelectors />
        </div>
        {selectedFarmId && (
          <div style={card}>
            <strong style={{ fontSize: 14, color: "#111827" }}>Irrigation</strong>
            <div
              role="tablist"
              aria-label="Irrigation"
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 4, marginTop: 8 }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0,
                    border: "none", borderRadius: 7, padding: "7px 8px", cursor: "pointer", fontFamily: "inherit",
                    background: tab === t.key ? "#ffffff" : "transparent",
                    color: tab === t.key ? "#1b4332" : "#6b7280",
                    boxShadow: tab === t.key ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                    fontSize: 12.5, fontWeight: 600,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- Zone principale ---- */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={card}>
          {!selectedFarmId ? (
            <p style={muted}>Sélectionnez une ferme dans la barre latérale.</p>
          ) : tab === "history" ? (
            // L'historique couvre toute la ferme : il a son propre filtre « Parcelle »
            <IrrigationHistory
              farmId={selectedFarmId}
              parcels={parcelsForSelectedFarm}
              defaultParcelId={selectedParcel?.id ?? null}
            />
          ) : !selectedParcel ? (
            <p style={muted}>Sélectionnez une parcelle, dans la carte Parcelles à gauche, pour gérer son irrigation.</p>
          ) : current.next ? (
            <p style={muted}>
              <strong style={{ color: "#374151" }}>Prochaine étape.</strong> {current.next}
            </p>
          ) : tab === "follow" ? (
            <WaterBalanceTab parcelId={selectedParcel.id} parcelName={selectedParcel.nom} />
          ) : tab === "waterings" ? (
            <WateringsTab parcelId={selectedParcel.id} parcelName={selectedParcel.nom} parcelAreaM2={selectedParcel.surface_m2 || null} />
          ) : (
            <EquipmentTab parcelId={selectedParcel.id} parcelName={selectedParcel.nom} />
          )}
        </div>
      </div>

      <FarmFormModal isOpen={showFarmForm} onClose={onCloseFarmForm} onSaved={(farmId) => refreshFarms(farmId)} />
    </div>
  );
}

/**
 * Page « Irrigation » : même organisation que Cultures et Employés. La
 * ferme se choisit dans la barre latérale, la parcelle dans la colonne de
 * gauche, puis l'irrigation de la parcelle se gère dans la zone principale.
 */
export default function IrrigationPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <IrrigationContent showFarmForm={showFarmForm} onCloseFarmForm={() => setShowFarmForm(false)} />
      </DashboardLayout>
    </SelectionProvider>
  );
}