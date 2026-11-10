import { useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import ImpactsTab from "../components/Conditions/ImpactsTab";
import ParametersTab from "../components/Conditions/ParametersTab";
import VegetationTab from "../components/Conditions/VegetationTab";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";

type Tab = "parameters" | "impacts" | "vegetation" | "alerts" | "reports";

/** Les cinq onglets ; « next » = pas encore réalisé */
const TABS: { key: Tab; label: string; icon: string; next?: string }[] = [
  { key: "parameters", label: "Paramètres", icon: "🌡️" },
  { key: "impacts", label: "Impacts", icon: "🌱" },{ key: "vegetation", label: "Végétation", icon: "🛰️" },
  { key: "alerts", label: "Alertes", icon: "🔔", next: "Les alertes climatiques, prévues et observées, avec le bouton Planifier." },
  { key: "reports", label: "Rapports", icon: "📄", next: "Les rapports PDF du mois ou de la saison, pour l'aide à la décision." },
];

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  fontFamily: "system-ui, sans-serif",
};
const muted: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: 0 };

function ConditionsContent({ showFarmForm, onCloseFarmForm }: { showFarmForm: boolean; onCloseFarmForm: () => void }) {
  const { farms, selectedFarmId, selectedParcel, refreshFarms } = useSelection();
  const [tab, setTab] = useState<Tab>("parameters");
  const current = TABS.find((t) => t.key === tab)!;
  const farmName = farms.find((f) => f.id === selectedFarmId)?.name ?? "";

  return (
    <div style={{ display: "flex", height: "100%", gap: 12, padding: 12, boxSizing: "border-box", overflow: "hidden" }}>
      {/* ---- Colonne gauche : parcelles, puis onglets ---- */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={card}>
          <ParcelSelectors />
        </div>
        {selectedFarmId && (
          <div style={card}>
            <strong style={{ fontSize: 14, color: "#111827" }}>Climat et cultures</strong>
            <div
              role="tablist"
              aria-label="Climat et cultures"
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
          ) : current.next ? (
            <p style={muted}>
              <strong style={{ color: "#374151" }}>Prochaine étape.</strong> {current.next}
            </p>
          ) : tab === "vegetation" ? (
            selectedParcel ? (
              <VegetationTab farmId={selectedFarmId} parcelId={selectedParcel.id} parcelName={selectedParcel.nom} />
            ) : (
              <p style={muted}>Sélectionnez une parcelle, dans la carte Parcelles à gauche, pour suivre sa végétation.</p>
            )
          ) : tab === "impacts" ? (
            selectedParcel ? (
              <ImpactsTab farmId={selectedFarmId} parcelId={selectedParcel.id} parcelName={selectedParcel.nom} />
            ) : (
              <p style={muted}>Sélectionnez une parcelle, dans la carte Parcelles à gauche, pour voir l'impact du climat sur ses cultures.</p>
            )
          ) : (
            <ParametersTab farmId={selectedFarmId} farmName={farmName} />
          )}
        </div>
      </div>

      <FarmFormModal isOpen={showFarmForm} onClose={onCloseFarmForm} onSaved={(farmId) => refreshFarms(farmId)} />
    </div>
  );
}

/**
 * Page « Climat et cultures » : le suivi des conditions climatiques de la
 * ferme et leur impact sur les cultures. Même organisation que Cultures,
 * Irrigation et Employés.
 */
export default function ConditionsPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <ConditionsContent showFarmForm={showFarmForm} onCloseFarmForm={() => setShowFarmForm(false)} />
      </DashboardLayout>
    </SelectionProvider>
  );
}