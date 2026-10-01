import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useSelection } from "../../hooks/useSelection";
import { useIndiceSeries } from "../../hooks/useIndiceSeries";
import { interpretIndiceValue } from "../../utils/indices";

export default function IndicesChartCard() {
  const { selectedParcelId } = useSelection();
  const [selectedIndice, setSelectedIndice] = useState<string | null>(null);
  const { readings, availableIndices, loading } = useIndiceSeries(selectedParcelId, selectedIndice);

  useEffect(() => {
    if (availableIndices.length > 0 && !availableIndices.includes(selectedIndice ?? "")) {
      setSelectedIndice(availableIndices[0]);
    }
    if (availableIndices.length === 0) {
      setSelectedIndice(null);
    }
  }, [availableIndices, selectedIndice]);

  const chartData = readings
    .filter((r) => r.scene_date !== null && r.value !== null)
    .map((r) => ({ date: r.scene_date as string, value: r.value as number }));

  const latest = readings[readings.length - 1] ?? null;
  const interpretation = latest ? interpretIndiceValue(selectedIndice ?? "", latest.value) : null;

  if (!selectedParcelId) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#666" }}>
        Sélectionne une parcelle pour voir ses indices.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Indices de végétation</strong>
        <select
          value={selectedIndice ?? ""}
          onChange={(e) => setSelectedIndice(e.target.value || null)}
          style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
        >
          {availableIndices.length === 0 && <option value="">Aucun indice</option>}
          {availableIndices.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: "#666" }}>Chargement…</p>}

      {!loading && chartData.length === 0 && (
        <p style={{ color: "#666" }}>Aucune donnée disponible pour cet indice.</p>
      )}

      {!loading && chartData.length > 0 && (
        <>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[-1, 1]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {latest && interpretation && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>{latest.value?.toFixed(3)}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: interpretation.color,
                  border: `1px solid ${interpretation.color}`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {interpretation.label}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}