import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClimatePeriod } from "../../types/climate";

const RAIN = "#2a78d6";
const DEMAND = "#eb6834";

const label = (p: ClimatePeriod) => `${p.start}-${p.end}`;

/**
 * « Pluie et besoin en eau, par période » : deux barres par période de 5
 * ans ; l'écart entre la barre bleue et la barre orange, c'est l'eau qui
 * manque. Sous chaque période, son interprétation en mots simples,
 * calculée par le back à partir des chiffres.
 */
export default function ClimatePeriods({ periods }: { periods: ClimatePeriod[] }) {
  const data = periods.map((p) => ({ name: label(p), rain: p.rain, demand: p.demand }));

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Pluie et besoin en eau, par période</div>
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#4b5563", marginBottom: 6 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: RAIN, marginRight: 5 }} />Pluie</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: DEMAND, marginRight: 5 }} />Besoin en eau du climat</span>
        <span style={{ marginLeft: "auto", color: "#9ca3af" }}>en mm par an</span>
      </div>
      <div style={{ width: "100%", height: 230 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barGap={4}>
            <CartesianGrid stroke="#eef0ee" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4b5563" }} tickLine={false} axisLine={{ stroke: "#d1d5db" }} />
            <YAxis tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              formatter={(value: number, name: string) => [`${Math.round(value).toLocaleString("fr-FR")} mm`, name === "rain" ? "Pluie" : "Besoin en eau"]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="rain" fill={RAIN} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
            <Bar dataKey="demand" fill={DEMAND} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Une interprétation sous chaque période, alignée sur ses barres */}
      <div style={{ display: "grid", gridTemplateColumns: `44px repeat(${periods.length}, minmax(0, 1fr))`, gap: 8, marginTop: 10 }}>
        <span />
        {periods.map((p) => (
          <div
            key={label(p)}
            style={{
              background: p.real ? "#eef5fc" : "#f6f7f6", borderRadius: 8, padding: "9px 10px", minWidth: 0,
              borderTop: `3px solid ${p.real ? RAIN : "#c3c2b7"}`,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
              {label(p)} <span style={{ fontWeight: 400, color: "#6b7280" }}>· {p.real ? "réel" : "projeté"}</span>
            </div>
            {p.interpretation.map((line) => (
              <p
                key={line}
                style={{
                  fontSize: 12.5, lineHeight: 1.5, margin: "0 0 4px",
                  color: line.startsWith("Attention") ? "#854F0B" : "#374151",
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}