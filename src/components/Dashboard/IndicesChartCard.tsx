import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSelection } from "../../hooks/useSelection";
import { useIndiceSeries } from "../../hooks/useIndiceSeries";
import { useCropDiagnosis } from "../../hooks/useCropDiagnosis";
import { INDICE_CATALOG, LEVEL_STYLE, getIndiceInfo, referenceLabel } from "../../utils/indices";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export default function IndicesChartCard() {
  const { selectedParcelId, selectedParcel } = useSelection();
  const [selectedIndice, setSelectedIndice] = useState<string | null>(null);
  const { readings, availableIndices, loading } = useIndiceSeries(selectedParcelId, selectedIndice);
  const { items: diagnoses, activeCrops, loading: diagnosisLoading } = useCropDiagnosis(selectedParcelId);

  // Sélection par défaut : NDVI s'il est disponible, sinon le premier indice
  useEffect(() => {
    if (availableIndices.length === 0) {
      setSelectedIndice(null);
      return;
    }
    if (!selectedIndice || !availableIndices.includes(selectedIndice)) {
      setSelectedIndice(availableIndices.includes("NDVI") ? "NDVI" : availableIndices[0]);
    }
  }, [availableIndices, selectedIndice]);

  const info = selectedIndice ? getIndiceInfo(selectedIndice) : null;

  const chartData = useMemo(
    () =>
      readings
        .filter((r) => r.scene_date && r.value != null)
        .map((r) => ({
          date: r.scene_date as string,
          label: shortDate(r.scene_date as string),
          value: r.value as number,
        })),
    [readings]
  );

  const last = chartData[chartData.length - 1] ?? null;
  const previous = chartData[chartData.length - 2] ?? null;
  const delta = last && previous ? last.value - previous.value : null;

  // Verdicts du diagnostic par culture pour l'indice affiché : seuils de
  // l'agronome, par culture, stade et âge. Le dashboard n'en calcule aucun.
  const cropVerdicts = useMemo(
    () =>
      selectedIndice
        ? diagnoses.flatMap(({ crop, diagnosis }) =>
            diagnosis.indicators
              .filter((i) => i.name.toUpperCase() === selectedIndice.toUpperCase())
              .map((indicator) => ({ crop, diagnosis, indicator }))
          )
        : [],
    [diagnoses, selectedIndice]
  );

  // Échelle resserrée sur les données, pour une courbe lisible
  const domain = useMemo<[number, number]>(() => {
    const values = chartData.map((d) => d.value);
    if (values.length === 0) return info?.range ?? [-1, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.25, 0.05);
    const [rMin, rMax] = info?.range ?? [-1, 1];
    return [Math.max(rMin, min - pad), Math.min(rMax, max + pad)];
  }, [chartData, info]);

  if (!selectedParcelId) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
        Sélectionnez une parcelle pour voir ses indices.
      </div>
    );
  }

  if (selectedParcel?.status !== "active") {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
        Parcelle inactive : aucune analyse satellite n'est effectuée.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", gap: 12, height: "100%", minHeight: 0 }}>
      {/* ---- Graphique ---- */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
          <strong style={{ fontSize: 14, color: "#111827" }}>
            {selectedIndice ?? "Indices"}
          </strong>
          {last && (
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              {new Date(last.date).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        {info && (
          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px", lineHeight: 1.35 }}>
            {info.description}
          </p>
        )}

        {loading && <p style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</p>}

        {!loading && chartData.length === 0 && (
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Aucune mesure disponible pour cet indice.
          </p>
        )}

        {!loading && chartData.length > 0 && (
          <>
            <div style={{ flex: 1, minHeight: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 10, bottom: 2, left: -18 }}>
                  <CartesianGrid stroke="#eef0f2" vertical={false} />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    minTickGap={18}
                  />
                  <YAxis
                    domain={domain}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? new Date(payload[0].payload.date).toLocaleDateString("fr-FR")
                        : ""
                    }
                    formatter={(v: number) => [v.toFixed(3), selectedIndice ?? ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1b4332"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#1b4332" }}
                    activeDot={{ r: 4.5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ---- Dernière valeur ---- */}
            {last && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  {last.value.toFixed(3)}
                </span>

                {delta !== null && (
                  <span style={{ fontSize: 11, color: delta >= 0 ? "#15803d" : "#b42318" }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(3)}
                  </span>
                )}
              </div>
            )}

            {/* ---- Verdict du diagnostic par culture ---- */}
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 3 }}>
              {diagnosisLoading ? (
                <span style={{ fontSize: 10, color: "#6b7280" }}>Diagnostic en cours…</span>
              ) : activeCrops === 0 ? (
                <span style={{ fontSize: 10, color: "#6b7280" }}>
                  Aucune culture déclarée : pas de verdict, seulement un repère général.
                </span>
              ) : cropVerdicts.length === 0 ? (
                <span style={{ fontSize: 10, color: "#6b7280" }}>
                  Indice non suivi par le diagnostic au stade actuel des cultures.
                </span>
              ) : (
                cropVerdicts.map(({ crop, diagnosis, indicator }) => {
                  const style = LEVEL_STYLE[indicator.level];
                  return (
                    <div
                      key={crop.id}
                      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 10 }}
                    >
                      <span style={{ color: "#374151", fontWeight: 600 }}>
                        {crop.species_label ?? crop.species} · {diagnosis.stage.label}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: style.color,
                          background: style.bg,
                          border: `1px solid ${style.color}`,
                          borderRadius: 999,
                          padding: "1px 8px",
                        }}
                      >
                        {style.label}
                      </span>
                      {indicator.threshold_label && (
                        <span style={{ color: "#6b7280" }}>{indicator.threshold_label}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>
              {referenceLabel(info) ?? info?.notes?.[0] ?? "Pas de repère général pour cet indice."}
            </p>
          </>
        )}
      </div>

      {/* ---- Liste des indices, à droite ---- */}
      <div
        style={{
          width: 86,
          flexShrink: 0,
          borderLeft: "1px solid #e5e7eb",
          paddingLeft: 8,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {availableIndices.length === 0 && (
          <span style={{ fontSize: 10, color: "#6b7280" }}>Aucun indice</span>
        )}

        {availableIndices.map((name) => {
          const isActive = name === selectedIndice;
          const hasReference = Boolean(INDICE_CATALOG[name.toUpperCase()]?.reference);
          return (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedIndice(name)}
              title={getIndiceInfo(name)?.fullName ?? name}
              style={{
                padding: "5px 7px",
                borderRadius: 6,
                border: `1px solid ${isActive ? "#1b4332" : "#e5e7eb"}`,
                background: isActive ? "#1b4332" : "#ffffff",
                color: isActive ? "#ffffff" : "#374151",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 4,
              }}
            >
              <span>{name}</span>
              {!hasReference && <span style={{ opacity: 0.5, fontSize: 9 }}>—</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}