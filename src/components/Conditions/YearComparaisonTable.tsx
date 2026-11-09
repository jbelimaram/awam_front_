import type { ParameterKey, YearComparison } from "../../types/conditions";
import { MONTH_NAMES, PARAMETER_INFO, PARAMETER_ORDER } from "./parameterInfo";

const RED = "#A32D2D";
const BLUE = "#185FA5";

const cell: React.CSSProperties = {
  textAlign: "right", padding: "7px 7px", borderBottom: "1px solid #eef0ee", whiteSpace: "nowrap",
};

/** Décimales dans le tableau : assez pour que rouge et bleu se lisent dans les chiffres */
const TABLE_DECIMALS: Record<ParameterKey, number> = {
  temperature_max_c: 1, temperature_min_c: 1, temperature_mean_c: 1,
  precipitation_mm: 0, humidity_mean_pct: 0, wind_speed_mean_kmh: 1,
  radiation_mj_m2: 1, et0_mm: 0, dry_days: 0,
};

/**
 * Le même mois pour chaque année, et sa normale. Dans chaque colonne, la
 * valeur la plus forte est en rouge, la plus faible en bleu (années
 * complètes seulement) ; l'année affichée en haut de l'onglet est en vert.
 */
export default function YearComparisonTable({ data, selectedYear }: { data: YearComparison; selectedYear: number }) {
  const complete = data.years.filter((y) => !y.partial);

  const extremes = (key: ParameterKey) => {
    const values = complete.map((y) => y.values[key]).filter((v): v is number => v !== null);
    if (values.length < 2) return { max: null, min: null };
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max === min ? { max: null, min: null } : { max, min };
  };
  const limits = Object.fromEntries(PARAMETER_ORDER.map((k) => [k, extremes(k)])) as Record<ParameterKey, { max: number | null; min: number | null }>;

  // Chiffres seuls dans les cases ; l'unité est dans le titre de la colonne
  const show = (key: ParameterKey, v: number | null) =>
    v === null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: TABLE_DECIMALS[key], maximumFractionDigits: TABLE_DECIMALS[key] });

  return (
    <div style={{ border: "1px solid #eef0ee", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", background: "#f6f7f6", fontSize: 14, fontWeight: 600, color: "#111827" }}>
        Comparaison des années · {MONTH_NAMES[data.month - 1]}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "#111827" }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Année</th>
              {PARAMETER_ORDER.map((k) => (
                <th key={k} style={{ ...cell, color: "#6b7280", fontWeight: 600, fontSize: 11.5, lineHeight: 1.3 }}>
                  {PARAMETER_INFO[k].short}
                  <br />
                  <span style={{ fontWeight: 400 }}>{PARAMETER_INFO[k].unit}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.years.map((row) => {
              const current = row.year === selectedYear;
              return (
                <tr key={row.year} style={{ background: current ? "#EAF3DE" : undefined }}>
                  <td style={{ ...cell, textAlign: "left", fontWeight: current ? 600 : 400, color: current ? "#27500A" : undefined }}>
                    {row.year}
                    {row.partial && <span style={{ color: "#854F0B", fontWeight: 400 }}> · en cours</span>}
                  </td>
                  {PARAMETER_ORDER.map((k) => {
                    const v = row.values[k];
                    const isMax = !row.partial && v !== null && v === limits[k].max;
                    const isMin = !row.partial && v !== null && v === limits[k].min;
                    return (
                      <td
                        key={k}
                        style={{
                          ...cell,
                          color: isMax ? RED : isMin ? BLUE : current ? "#27500A" : undefined,
                          fontWeight: isMax || isMin || current ? 600 : 400,
                        }}
                      >
                        {show(k, v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <td style={{ ...cell, textAlign: "left", color: "#6b7280", fontStyle: "italic" }}>Normale</td>
              {PARAMETER_ORDER.map((k) => (
                <td key={k} style={{ ...cell, color: "#6b7280", fontStyle: "italic" }}>{show(k, data.normal[k])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", margin: 0, padding: "8px 12px" }}>
        En <strong style={{ color: RED }}>rouge</strong> : l'année la plus forte de chaque colonne ; en <strong style={{ color: BLUE }}>bleu</strong> : la plus faible.{" "}
        <strong style={{ color: "#27500A", background: "#EAF3DE", borderRadius: 4, padding: "0 4px" }}>Ligne verte</strong> : l'année affichée en haut.{" "}
        <strong style={{ color: "#6b7280" }}> Normale </strong> : moyenne de {data.normals_period[0]} à {data.normals_period[1]}.
        Un mois en cours n'entre pas dans la comparaison.
      </p>
    </div>
  );
}