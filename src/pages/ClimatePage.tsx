import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/Dashboard/DashboardLayout";
import FarmFormModal from "../components/Dashboard/FarmFormModal";
import ClimateComparison from "../components/Climate/climateComparaison";
import ClimatePeriods from "../components/Climate/ClimatePeriods";
import ClimateSiteFormModal from "../components/Climate/ClimateSiteFormModal";
import { SelectionProvider } from "../context/SelectionContext";
import { useSelection } from "../hooks/useSelection";
import { useToast } from "../hooks/useToast";
import { climateService } from "../Services/climateService";
import type { ClimateSite, ClimateSummary } from "../types/climate";
import { useConfirm } from "../hooks/useConfirm";
import ActionButton from "../components/Common/ActionButton";

/** Nom des scénarios d'émissions, pour l'utilisateur */
const SCENARIO_LABELS: Record<string, string> = {
  ssp1_2_6: "Optimiste",
  ssp2_4_5: "Intermédiaire",
  ssp3_7_0: "Élevé",
  ssp5_8_5: "Pessimiste",
};

/** Tant qu'un lieu est en préparation, la liste est relue à cet intervalle */
const REFRESH_MS = 60_000;

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  fontFamily: "system-ui, sans-serif",
};
const muted: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: 0 };

const isPreparing = (s: ClimateSite) => s.status === "en_attente" || s.status === "en_cours";

function statusLine(s: ClimateSite): { text: string; color: string } | null {
  if (isPreparing(s)) return { text: "en préparation…", color: "#854F0B" };
  if (s.status === "echec") return { text: "échec, à relancer", color: "#A32D2D" };
  return null;
}

function ClimateContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [sites, setSites] = useState<ClimateSite[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [summary, setSummary] = useState<ClimateSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const selected = useMemo(() => sites?.find((s) => s.id === selectedId) ?? null, [sites, selectedId]);

  // ---- Lieux étudiés ----------------------------------------------------
  const loadSites = useCallback(async () => {
    try {
      const data = await climateService.listSites();
      setSites(data);
      setSelectedId((current) => (data.some((s) => s.id === current) ? current : data[0]?.id ?? null));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Lieux indisponibles.");
      setSites([]);
    }
  }, [showToast]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Relire la liste tant qu'un lieu est en préparation
  useEffect(() => {
    if (!sites?.some(isPreparing)) return;
    const timer = window.setInterval(loadSites, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [sites, loadSites]);

  // ---- Résumé du lieu choisi ---------------------------------------------
  const ready = selected?.status === "pret";
  useEffect(() => {
    if (!selectedId || !ready) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setLoadingSummary(true);
    climateService
      .summary(selectedId, scenario ?? "")
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setScenario((s) => s ?? data.scenario);
      })
      .catch((e) => !cancelled && showToast("error", e instanceof Error ? e.message : "Climat indisponible."))
      .finally(() => !cancelled && setLoadingSummary(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, ready, scenario, showToast]);

  const removeSite = async (site: ClimateSite) => {
    if (!(await confirm({ title: `Supprimer « ${site.name} » ?`, message: "Son climat 2020-2040 sera aussi supprimé." }))) return;
    try {
      await climateService.removeSite(site.id);
showToast("success", `${site.name} supprimé.`);
      loadSites();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const retrySite = async (site: ClimateSite) => {
    try {
      await climateService.retrySite(site.id);
      showToast("success", "Préparation relancée.");
      loadSites();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Relance impossible.");
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 12, padding: 12, boxSizing: "border-box", overflow: "hidden" }}>
      {/* ---- Lieux étudiés ---- */}
      <div style={{ width: 250, flexShrink: 0, overflowY: "auto" }}>
        <div style={card}>
          <strong style={{ fontSize: 14, color: "#111827" }}>Lieux étudiés</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
            {sites === null && <p style={muted}>Chargement…</p>}
            {sites?.length === 0 && <p style={muted}>Ajoutez une ferme, ou étudiez un lieu.</p>}
            {sites?.map((s) => {
              const active = s.id === selectedId;
              const line = statusLine(s);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6,
                    background: active ? "#1b4332" : "transparent", color: active ? "#ffffff" : "#111827",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, border: "none",
                      background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left",
                      fontSize: 13, padding: 0, fontFamily: "inherit",
                    }}
                  >
                    <span aria-hidden>{s.farm_id ? "🚜" : "📍"}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                      {line && (
                        <span style={{ display: "block", fontSize: 11, color: active ? "#d1fae5" : line.color }}>{line.text}</span>
                      )}
                    </span>
                  </button>
                  {!s.farm_id && (
                    <ActionButton
                      type="button"
                      onClick={() => removeSite(s)}
                      title="Supprimer ce lieu"
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: active ? "#fecaca" : "#b42318" }}
                    >
                      🗑
                    </ActionButton>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              width: "100%", marginTop: 10, padding: "8px 10px", borderRadius: 8, border: "1px dashed #9ca3af",
              background: "#ffffff", color: "#1b4332", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            ＋ Étudier un lieu
          </button>
        </div>
      </div>

      {/* ---- Climat du lieu choisi ---- */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {!selected ? (
          <div style={card}>
            <p style={muted}>Choisissez un lieu, ou étudiez-en un nouveau pour voir son climat de 2020 à 2040.</p>
          </div>
        ) : !ready ? (
          <div style={card}>
            <strong style={{ fontSize: 15, color: "#111827" }}>{selected.name}</strong>
            {selected.status === "echec" ? (
              <>
                <p style={{ ...muted, marginTop: 8 }}>La préparation de son climat a échoué :</p>
                <p style={{ fontSize: 12.5, color: "#A32D2D", margin: "6px 0 10px", wordBreak: "break-word" }}>
                  {selected.last_error ?? "erreur inconnue"}
                </p>
                <ActionButton
                  type="button"
                  onClick={() => retrySite(selected)}
                  busyText="Relance en cours…"
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#1b4332", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                >
                  Relancer
                </ActionButton>
              </>
            ) : (
              <p style={{ ...muted, marginTop: 8, lineHeight: 1.6 }}>
                🌱 Son climat est en préparation : les données réelles et les projections sont téléchargées en
                arrière-plan, puis corrigées. Selon l'affluence chez Copernicus, cela peut prendre de quelques
                minutes à plusieurs heures. Cette page se met à jour toute seule.
              </p>
            )}
          </div>
        ) : (
          <>
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>
                Climat de {selected.name} · 2020-2040
              </strong>
              <span style={{ fontSize: 12.5, color: "#6b7280" }}>Scénario</span>
              <div role="tablist" aria-label="Scénario" style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 3 }}>
                {(summary?.scenarios ?? []).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    role="tab"
                    aria-selected={scenario === sc}
                    onClick={() => setScenario(sc)}
                    style={{
                      border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                      background: scenario === sc ? "#ffffff" : "transparent", color: scenario === sc ? "#1b4332" : "#6b7280",
                      boxShadow: scenario === sc ? "0 1px 2px rgba(0,0,0,0.1)" : "none", fontFamily: "inherit",
                    }}
                  >
                    {SCENARIO_LABELS[sc] ?? sc}
                  </button>
                ))}
              </div>
            </div>

            {loadingSummary && !summary ? (
              <div style={card}><p style={muted}>Chargement du climat…</p></div>
            ) : summary ? (
              <>
                {summary.divergence.map((message) => (
                  <div
                    key={message}
                    style={{ display: "flex", gap: 8, background: "#FAEEDA", color: "#633806", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}
                  >
                    <span aria-hidden>⚠️</span>
                    <span>{message}</span>
                  </div>
                ))}
                <div style={card}>
                  <ClimateComparison summary={summary} />
                </div>
                <div style={card}>
                  <ClimatePeriods periods={summary.periods} />
                </div>
                <p style={{ ...muted, fontSize: 11.5, lineHeight: 1.6, padding: "0 4px" }}>
                  Sources : climat réel Open-Meteo et Copernicus ERA5 ; projections Copernicus CMIP6
                  ({summary.models.join(", ")}), corrigées de leurs biais sur la période 1995-2014. ET₀ calculée par
                  la méthode de Hargreaves (FAO-56) ; aridité selon la classification du PNUE.
                </p>
              </>
            ) : null}
          </>
        )}
      </div>

      <ClimateSiteFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreated={(site) => {
          showToast("success", `${site.name} ajouté : son climat est en préparation.`);
          setSelectedId(site.id);
          loadSites();
        }}
      />
    </div>
  );
}

/**
 * Page « Projection climatique » : le climat de 2020 à 2040 des fermes et
 * des lieux étudiés, pour évaluer l'exploitation d'un lieu.
 */
export default function ClimatePage() {
  const [showFarmForm, setShowFarmForm] = useState(false);
  return (
    <SelectionProvider>
      <DashboardLayout onAddFarm={() => setShowFarmForm(true)}>
        <ClimateContent />
        <ClimateFarmForm isOpen={showFarmForm} onClose={() => setShowFarmForm(false)} />
      </DashboardLayout>
    </SelectionProvider>
  );
}

/** « Ajouter une ferme » de la barre latérale, depuis cette page */
function ClimateFarmForm({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { refreshFarms } = useSelection();
  return <FarmFormModal isOpen={isOpen} onClose={onClose} onSaved={(farmId) => refreshFarms(farmId)} />;
}