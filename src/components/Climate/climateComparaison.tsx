import type { ClimateSummary } from "../../types/climate";

const NOW = "#2a78d6";
const LATER = "#85B7EB";

interface Row {
  icon: string;
  label: string;
  now: number | null;
  later: number | null;
  unit: string;
  digits: number;
  /** Une évolution dans ce sens est défavorable : la valeur passe en rouge */
  badWhen: "up" | "down";
}

const fmt = (v: number, digits: number) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * « Aujourd'hui et vers 2040 » : pour chaque indicateur, deux barres côte à
 * côte ; la plus longue se voit d'un coup d'œil. La valeur future passe en
 * rouge quand l'évolution est défavorable.
 */
export default function ClimateComparison({ summary }: { summary: ClimateSummary }) {
  const k = summary.kpis;
  const rows: Row[] = [
    { icon: "🌧", label: "Pluie par an", now: k.rain.now, later: k.rain.future, unit: "mm", digits: 0, badWhen: "down" },
    { icon: "☀️", label: "Besoin en eau du climat par an", now: k.et0.now, later: k.et0.future, unit: "mm", digits: 0, badWhen: "up" },
    { icon: "🌡", label: "Sol en été", now: k.summer_soil.now, later: k.summer_soil.future, unit: "°C", digits: 1, badWhen: "up" },
  ];
  if (k.sea) rows.push({ icon: "🌊", label: "Mer", now: k.sea.now, later: k.sea.future, unit: "°C", digits: 1, badWhen: "up" });

  const nowLabel = summary.real_period ? `Aujourd'hui (${summary.real_period[0]}-${summary.real_period[1]})` : "Aujourd'hui";
  const laterLabel = `Vers ${summary.future_period[1]}`;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Aujourd'hui et vers {summary.future_period[1]}</div>
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#4b5563", marginBottom: 6 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: NOW, marginRight: 5 }} />{nowLabel}</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: LATER, marginRight: 5 }} />{laterLabel}</span>
      </div>
      {rows.map((r) => {
        const max = Math.max(r.now ?? 0, r.later ?? 0) || 1;
        const delta = r.now !== null && r.later !== null ? r.later - r.now : null;
        const bad = delta !== null && (r.badWhen === "up" ? delta > 0 : delta < 0);
        const bars: [string, number | null, string, boolean][] = [
          [nowLabel.split(" (")[0], r.now, NOW, false],
          [laterLabel, r.later, LATER, bad],
        ];
        return (
          <div key={r.label} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 3 }}>
              <span aria-hidden>{r.icon}</span> {r.label}
            </div>
            {bars.map(([label, value, color, red]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr) 76px", alignItems: "center", gap: 8, margin: "3px 0" }}>
                <span style={{ fontSize: 12.5, color: "#374151" }}>{label}</span>
                <span style={{ height: 14, borderRadius: "0 4px 4px 0", background: color, width: value === null ? 0 : `${(value / max) * 100}%` }} />
                <span style={{ fontSize: 12.5, textAlign: "right", fontWeight: 600, color: red ? "#A32D2D" : "#111827" }}>
                  {value === null ? "—" : `${fmt(value, r.digits)} ${r.unit}`}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}