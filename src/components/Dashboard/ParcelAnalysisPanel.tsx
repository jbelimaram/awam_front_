import { useCallback, useEffect, useState } from "react";
import { parcelAnalysisService } from "../../Services/parcelAnalalysisService";
import { useToast } from "../../hooks/useToast";
import AnalysisFields, {
  EMPTY_ANALYSIS_FORM,
  isAnalysisEmpty,
  toAnalysisPayload,
  type AnalysisFormState,
} from "./AnalysisFields";
import type { ParcelAnalysis } from "../../types/parcelAnalysis";

interface ParcelAnalysisPanelProps {
  parcelId: number;
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13,
};
const label: React.CSSProperties = { color: "#6b7280", flexShrink: 0 };
const value: React.CSSProperties = { color: "#111827", fontWeight: 500, textAlign: "right" };

const fmt = (v: number | null | undefined, unit = "") =>
  v == null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${unit}`;

/**
 * Analyses de laboratoire de la parcelle : la plus récente est affichée en
 * détail, les précédentes forment l'historique. Repliées par défaut pour ne
 * pas surcharger la fiche.
 */
export default function ParcelAnalysisPanel({ parcelId }: ParcelAnalysisPanelProps) {
  const { showToast } = useToast();
  const [analyses, setAnalyses] = useState<ParcelAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnalyses(await parcelAnalysisService.listByParcel(parcelId));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Analyses indisponibles.");
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, [parcelId, showToast]);

  // Chargées seulement à l'ouverture du panneau : la fiche reste légère
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSave = async () => {
    if (isAnalysisEmpty(form)) {
      showToast("error", "Renseignez au moins une valeur.");
      return;
    }
    setSaving(true);
    try {
      await parcelAnalysisService.create(parcelId, toAnalysisPayload(form));
      showToast("success", "Analyse enregistrée.");
      setForm(EMPTY_ANALYSIS_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette analyse ?")) return;
    try {
      await parcelAnalysisService.remove(id);
      showToast("success", "Analyse supprimée.");
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression impossible.");
    }
  };

  const latest = analyses[0];
  const older = analyses.slice(1);

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 10, paddingTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "#1b4332",
        }}
      >
        <span>Analyses de sol et d'eau</span>
        <span>{open ? "▲ Voir moins" : "▼ Voir plus"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {loading && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>}

          {!loading && !latest && (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Aucune analyse enregistrée pour cette parcelle.
            </p>
          )}

          {latest && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Analyse du {new Date(latest.analyzed_at).toLocaleDateString("fr-FR")}
              </div>

              {latest.soil_type && (
                <div style={row}>
                  <span style={label}>Type de sol</span>
                  <span style={value}>{latest.soil_type}</span>
                </div>
              )}
              <div style={row}>
                <span style={label}>pH du sol</span>
                <span style={value}>{fmt(latest.soil_ph)}</span>
              </div>
              <div style={row}>
                <span style={label}>Humidité</span>
                <span style={value}>{fmt(latest.soil_humidity_pct, " %")}</span>
              </div>
              <div style={row}>
                <span style={label}>Matière organique</span>
                <span style={value}>{fmt(latest.soil_organic_matter_pct, " %")}</span>
              </div>
              <div style={row}>
                <span style={label}>Salinité</span>
                <span style={value}>{fmt(latest.soil_salinity_g_l, " g/L")}</span>
              </div>
              <div style={row}>
                <span style={label}>pH de l'eau</span>
                <span style={value}>{fmt(latest.water_ph)}</span>
              </div>
              <div style={row}>
                <span style={label}>Nitrates</span>
                <span style={value}>{fmt(latest.water_nitrates_mg_l, " mg/L")}</span>
              </div>

              {latest.notes && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.4 }}>
                  {latest.notes}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleDelete(latest.id)}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "#b42318",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Supprimer cette analyse
              </button>
            </div>
          )}

          {older.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                Analyses précédentes
              </div>
              {older.map((a) => (
                <div
                  key={a.id}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", padding: "2px 0" }}
                >
                  <span>{new Date(a.analyzed_at).toLocaleDateString("fr-FR")}</span>
                  <span>pH {fmt(a.soil_ph)} · {fmt(a.soil_humidity_pct, " %")}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    title="Supprimer"
                    style={{ background: "transparent", border: "none", color: "#b42318", cursor: "pointer", padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "6px 0",
                borderRadius: 6,
                border: "1px dashed #cbd5e1",
                background: "#ffffff",
                color: "#1b4332",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ＋ Ajouter une analyse
            </button>
          ) : (
            <div
              style={{
                marginTop: 10,
                background: "#1f2937",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <AnalysisFields form={form} onChange={setForm} disabled={saving} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 6,
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                  }}
                >
                  {saving ? "…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "1px solid #4b5563",
                    background: "transparent",
                    color: "#d1d5db",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}