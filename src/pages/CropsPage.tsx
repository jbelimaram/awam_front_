import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ParcelSelectors from "../components/Dashboard/ParcelSelectors";
import CropFormModal from "../components/Crops/CropFormModal";
import CropInfoTab from "../components/Crops/CropInfoTab";
import NeedsTab from "../components/Crops/NeedsTab";
import RiskBanner from "../components/Crops/RiskBanner";
import StagesTab from "../components/Crops/stagesTab";
import { SelectionProvider } from "../context/SelectionContext";
import { cropService } from "../Services/cropService";
import { diagnosisService } from "../Services/diagnosisService";
import { useSelection } from "../hooks/useSelection";
import { useToast } from "../hooks/useToast";
import type { Crop, CropObservation } from "../types/crop";
import type { CropNeeds, Diagnosis, StageTimelineItem } from "../types/diagnosis";

type TabKey = "info" | "stages" | "needs";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Fiche" },
  { key: "stages", label: "Stades" },
  { key: "needs", label: "Besoins" },
];

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

function CropsContent({
  showFarmForm,
  onCloseFarmForm,
}: {
  showFarmForm: boolean;
  onCloseFarmForm: () => void;
}) {
  const { selectedParcelId, refreshFarms } = useSelection();
  const { showToast } = useToast();

  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [stages, setStages] = useState<StageTimelineItem[]>([]);
  const [needs, setNeeds] = useState<CropNeeds | null>(null);
  const [observations, setObservations] = useState<CropObservation[]>([]);
  const [tab, setTab] = useState<TabKey>("info");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Crop | null>(null);

  const selectedCrop = crops.find((c) => c.id === selectedCropId) ?? null;

  // --- Cultures de la parcelle ---------------------------------------
  const loadCrops = useCallback(
    async (preferredId?: number) => {
      if (!selectedParcelId) {
        setCrops([]);
        setSelectedCropId(null);
        return;
      }
      setLoading(true);
      try {
        const list = await cropService.listByParcel(selectedParcelId);
        setCrops(list);
        setSelectedCropId(preferredId ?? list[0]?.id ?? null);
      } catch (e) {
        showToast("error", e instanceof Error ? e.message : "Cultures indisponibles.");
        setCrops([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedParcelId, showToast]
  );

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  // --- Diagnostic, frise et besoins de la culture choisie -------------
  useEffect(() => {
    if (!selectedCropId) {
      setDiagnosis(null);
      setStages([]);
      setNeeds(null);
      setObservations([]);
      return;
    }
    let cancelled = false;

    diagnosisService.get(selectedCropId).then((d) => !cancelled && setDiagnosis(d)).catch(() => {});
    diagnosisService.stages(selectedCropId).then((s) => !cancelled && setStages(s)).catch(() => {});
    diagnosisService.needs(selectedCropId).then((n) => !cancelled && setNeeds(n)).catch(() => {});
    cropService.listObservations(selectedCropId).then((o) => !cancelled && setObservations(o)).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedCropId]);

  const handleAddObservation = async (content: string) => {
    if (!selectedCropId) return;
    try {
      await cropService.addObservation(selectedCropId, content);
      setObservations(await cropService.listObservations(selectedCropId));
      showToast("success", "Observation enregistrée.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };

  const handleDeleteObservation = async (id: number) => {
    try {
      await cropService.removeObservation(id);
      setObservations((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const handleDeleteCrop = async () => {
    if (!selectedCrop) return;
    const name = selectedCrop.species_label ?? selectedCrop.species;
    if (!window.confirm(`Supprimer la culture « ${name} » et son historique ?`)) return;
    try {
      await cropService.remove(selectedCrop.id);
      showToast("success", "Culture supprimée.");
      await loadCrops();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
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
      {/* ---- Colonne gauche : parcelles puis cultures ---- */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={cardStyle}>
          <ParcelSelectors onAddParcel={() => {}} canAddParcel={false} />
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 14, color: "#111827" }}>Cultures</strong>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowForm(true); }}
              disabled={!selectedParcelId}
              title={selectedParcelId ? "Ajouter une culture" : "Sélectionnez une parcelle"}
              style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid #cbd5e1",
                background: "#ffffff", color: "#1b4332", fontSize: 16, lineHeight: 1,
                cursor: selectedParcelId ? "pointer" : "not-allowed",
                opacity: selectedParcelId ? 1 : 0.45,
              }}
            >
              ＋
            </button>
          </div>

          {!selectedParcelId && (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Sélectionnez une parcelle.</p>
          )}
          {loading && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>}
          {selectedParcelId && !loading && crops.length === 0 && (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Aucune culture. Utilisez « ＋ » pour en déclarer une.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {crops.map((crop) => {
              const isActive = crop.id === selectedCropId;
              const year = crop.planting_date ? new Date(crop.planting_date).getFullYear() : null;
              return (
                <button
                  key={crop.id}
                  type="button"
                  onClick={() => setSelectedCropId(crop.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                    borderRadius: 6, border: "none",
                    background: isActive ? "#1b4332" : "transparent",
                    color: isActive ? "#ffffff" : "#111827",
                    cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: crop.status === "active" ? "#16a34a" : "#9ca3af",
                    }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {crop.species_label ?? crop.species}
                  </span>
                  {year && (
                    <span style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.55 }}>{year}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Zone principale ---- */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {!selectedCrop ? (
          <div style={{ ...cardStyle, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
            Sélectionnez une culture, ou déclarez-en une pour suivre son cycle,
            ses besoins et les risques détectés.
          </div>
        ) : (
          <>
            {diagnosis && <RiskBanner diagnosis={diagnosis} />}

            <div style={cardStyle}>
              {/* Onglets */}
              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: "7px 14px", border: "none", background: "transparent",
                      borderBottom: `2px solid ${tab === t.key ? "#1b4332" : "transparent"}`,
                      color: tab === t.key ? "#1b4332" : "#6b7280",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "info" && (
                <CropInfoTab
                  crop={selectedCrop}
                  history={crops}
                  onEdit={() => { setEditing(selectedCrop); setShowForm(true); }}
                  onDelete={handleDeleteCrop}
                />
              )}
              {tab === "stages" && (
                <StagesTab
                  diagnosis={diagnosis}
                  stages={stages}
                  observations={observations}
                  onAddObservation={handleAddObservation}
                  onDeleteObservation={handleDeleteObservation}
                />
              )}
              {tab === "needs" && <NeedsTab needs={needs} />}
            </div>
          </>
        )}
      </div>

      <FarmFormModal
        isOpen={showFarmForm}
        onClose={onCloseFarmForm}
        onSaved={(farmId) => refreshFarms(farmId)}
      />

      {selectedParcelId && (
        <CropFormModal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          parcelId={selectedParcelId}
          crop={editing}
          onSaved={(cropId) => loadCrops(cropId)}
        />
      )}
    </div>
  );
}

export default function CropsPage() {
  const [showFarmForm, setShowFarmForm] = useState(false);

  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <CropsContent
          showFarmForm={showFarmForm}
          onCloseFarmForm={() => setShowFarmForm(false)}
        />
      </DashboardLayout>
    </SelectionProvider>
  );
}