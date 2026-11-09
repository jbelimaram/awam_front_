import { useMemo } from "react";
import { MONTH_NAMES } from "./parameterInfo";

const select: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12.5,
  background: "#fff", color: "#111827", fontFamily: "inherit",
};
const arrow: React.CSSProperties = { ...select, padding: "5px 11px", fontSize: 15, lineHeight: 1, cursor: "pointer" };

/**
 * Choix du mois : flèches précédent / suivant, liste des mois et liste des
 * années. `months` : les mois disponibles (« AAAA-MM »), du plus récent au
 * plus ancien ; un mois sans données est grisé.
 */
export default function MonthNav({ months, month, onChange }: { months: string[]; month: string; onChange: (m: string) => void }) {
  const years = useMemo(() => Array.from(new Set(months.map((m) => Number(m.slice(0, 4))))), [months]);
  const year = month ? Number(month.slice(0, 4)) : 0;
  const number = month ? Number(month.slice(5, 7)) : 0;
  const index = months.indexOf(month);
  const go = (y: number, m: number) => {
    const wanted = `${y}-${String(m).padStart(2, "0")}`;
    if (months.includes(wanted)) return onChange(wanted);
    const sameYear = months.filter((x) => x.startsWith(`${y}-`));
    if (sameYear.length) onChange(sameYear[0]);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" aria-label="Mois précédent" style={arrow} disabled={index < 0 || index >= months.length - 1} onClick={() => onChange(months[index + 1])}>‹</button>
      <select value={number || ""} onChange={(e) => go(year, Number(e.target.value))} style={select} aria-label="Mois" disabled={!months.length}>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1} disabled={!months.includes(`${year}-${String(i + 1).padStart(2, "0")}`)}>{name}</option>
        ))}
      </select>
      <select value={year || ""} onChange={(e) => go(Number(e.target.value), number)} style={select} aria-label="Année" disabled={!months.length}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" aria-label="Mois suivant" style={arrow} disabled={index <= 0} onClick={() => onChange(months[index - 1])}>›</button>
    </div>
  );
}