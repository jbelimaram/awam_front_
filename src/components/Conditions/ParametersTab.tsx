import { useEffect, useMemo, useRef, useState } from "react";
import { conditionsService } from "../../Services/conditionsService";
import { useToast } from "../../hooks/useToast";
import type { MonthConditions, ParameterKey, YearComparison } from "../../types/conditions";
import YearComparisonTable from "./YearComparaisonTable";
import { MONTH_NAMES, PARAMETER_INFO, PARAMETER_ORDER, fmt } from "./parameterInfo";

const select: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12.5,
  background: "#fff", color: "#111827", fontFamily: "inherit",
};
const arrow: React.CSSProperties = {
  ...select, padding: "5px 11px", fontSize: 15, lineHeight: 1, cursor: "pointer",
};

/** « +2,1 °C vs normale », « −62 % vs normale », « +1,6 point vs normale » */
function anomalyText(key: ParameterKey, data: MonthConditions): string | null {
  const p = data.parameters[key];
  if (p.anomaly === null) return null;
  const info = PARAMETER_INFO[key];
  const sign = p.anomaly > 0 ? "+" : p.anomaly < 0 ? "−" : "";
  const value = fmt(Math.abs(p.anomaly), p.anomaly_unit === "%" ? 0 : 1);
  const unit = p.anomaly_unit === "%" ? " %" : info.unit === "%" ? (Math.abs(p.anomaly) >= 2 ? " points" : " point") : ` ${info.unit}`;
  return `${sign}${value}${unit} vs normale`;
}

/**
 * Une carte de paramètre. Au survol, sa définition s'ouvre depuis le milieu
 * de la carte et déborde en bas à droite (en bas à gauche pour la dernière
 * colonne, pour ne pas sortir de l'écran), sur fond vert pastel.
 */
function ParameterCard({ k, data }: { k: ParameterKey; data: MonthConditions }) {
  const [hover, setHover] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const box = useRef<HTMLDivElement>(null);
  const info = PARAMETER_INFO[k];
  const p = data.parameters[k];
  const gap = anomalyText(k, data);
  const show = () => {
    const rect = box.current?.getBoundingClientRect();
    // La définition va jusqu'à 1,48 fois la largeur de la carte
    setSide(rect && rect.left + rect.width * 1.48 + 16 > window.innerWidth ? "left" : "right");
    setHover(true);
  };
  return (
    <div
      ref={box}
      onMouseEnter={show}
      onMouseLeave={() => setHover(false)}
      onFocus={show}
      onBlur={() => setHover(false)}
      tabIndex={0}
      aria-label={`${info.label} : ${info.help}`}
      style={{
        position: "relative", zIndex: hover ? 10 : undefined,
        background: "#f6f7f6", borderRadius: 10, padding: "10px 12px", minWidth: 0,
        minHeight: 96, border: `1px solid ${hover ? "#97C459" : "transparent"}`, outline: "none",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
        <span aria-hidden>{info.icon}</span>
        <span>{info.label}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 600, color: "#111827", marginTop: 3 }}>
        {p.value === null ? "—" : `${fmt(p.value, info.decimals)} ${info.unit}`}
      </div>
      <div style={{ fontSize: 12, color: "#4b5563", marginTop: 1 }}>
        {gap ?? (p.normal !== null ? `normale : ${fmt(p.normal, info.decimals)} ${info.unit}` : "normale inconnue")}
      </div>
      {k === "dry_days" && data.longest_dry_spell !== null && (
        <div style={{ fontSize: 12, color: "#4b5563" }}>dont {data.longest_dry_spell} de suite au plus</div>
      )}
      {k === "wind_speed_mean_kmh" && data.wind_speed_max_kmh !== null && data.windiest_day && (
        <div style={{ fontSize: 12, color: "#4b5563" }}>
          rafale {fmt(data.wind_speed_max_kmh, 0)} km/h le {new Date(`${data.windiest_day}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
        </div>
      )}
      {/* Définition : depuis le milieu de la carte, en débordant en bas */}
      {hover && (
        <div
          role="tooltip"
          style={{
            position: "absolute", top: "46%", width: "100%", minHeight: 78, boxSizing: "border-box", zIndex: 20,
            ...(side === "right" ? { left: "48%" } : { right: "48%" }),
            display: "flex", alignItems: "center",
            background: "#EAF3DE", color: "#173404", border: "1px solid #97C459", borderRadius: 10,
            padding: "9px 11px", fontSize: 12, lineHeight: 1.45, boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
          }}
        >
          {info.help}
        </div>
      )}
    </div>
  );
}

/**
 * Onglet « Paramètres » : les 9 paramètres du climat d'un mois, chacun avec
 * sa normale (même mois, 2020-2025) et l'écart entre les deux ; puis le même
 * mois comparé d'une année à l'autre.
 */
export default function ParametersTab({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { showToast } = useToast();
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>("");
  const [data, setData] = useState<MonthConditions | null>(null);
  const [years, setYears] = useState<YearComparison | null>(null);

  // Les mois disponibles, puis le plus récent
  useEffect(() => {
    let alive = true;
    setMonths([]);
    setMonth("");
    setData(null);
    conditionsService
      .months(farmId)
      .then((list) => {
        if (!alive) return;
        setMonths(list);
        setMonth(list[0] ?? "");
      })
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Climat indisponible."));
    return () => {
      alive = false;
    };
  }, [farmId, showToast]);

  // Les chiffres du mois choisi
  useEffect(() => {
    if (!month) return;
    let alive = true;
    setData(null);
    conditionsService
      .month(farmId, month)
      .then((d) => alive && setData(d))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Climat indisponible."));
    return () => {
      alive = false;
    };
  }, [farmId, month, showToast]);

  // Le même mois, année par année (ne change que si le mois de l'année change)
  const monthNumber = month ? Number(month.split("-")[1]) : 0;
  useEffect(() => {
    if (!monthNumber) return;
    let alive = true;
    setYears(null);
    conditionsService
      .years(farmId, monthNumber)
      .then((d) => alive && setYears(d))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Comparaison indisponible."));
    return () => {
      alive = false;
    };
  }, [farmId, monthNumber, showToast]);

  // Navigation : années et mois disponibles, flèches précédent / suivant
  const availableYears = useMemo(() => Array.from(new Set(months.map((m) => Number(m.slice(0, 4))))), [months]);
  const year = month ? Number(month.slice(0, 4)) : 0;
  const index = months.indexOf(month);
  const go = (y: number, m: number) => {
    const wanted = `${y}-${String(m).padStart(2, "0")}`;
    if (months.includes(wanted)) {
      setMonth(wanted);
      return;
    }
    // Mois absent pour cette année : le plus proche disponible dans l'année
    const sameYear = months.filter((x) => x.startsWith(`${y}-`));
    if (sameYear.length) setMonth(sameYear[0]);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Paramètres climatiques · {farmName}</strong>
        <button
          type="button" aria-label="Mois précédent" style={arrow}
          disabled={index < 0 || index >= months.length - 1}
          onClick={() => setMonth(months[index + 1])}
        >
          ‹
        </button>
        <select value={monthNumber || ""} onChange={(e) => go(year, Number(e.target.value))} style={select} aria-label="Mois" disabled={!months.length}>
          {MONTH_NAMES.map((name, i) => {
            const value = `${year}-${String(i + 1).padStart(2, "0")}`;
            return (
              <option key={name} value={i + 1} disabled={!months.includes(value)}>{name}</option>
            );
          })}
        </select>
        <select value={year || ""} onChange={(e) => go(Number(e.target.value), monthNumber)} style={select} aria-label="Année" disabled={!months.length}>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          type="button" aria-label="Mois suivant" style={arrow}
          disabled={index <= 0}
          onClick={() => setMonth(months[index - 1])}
        >
          ›
        </button>
      </div>

      {data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <>
          {data.partial && (
            <p style={{ fontSize: 12.5, color: "#854F0B", background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
              Mois en cours : {data.days} jours sur {data.days_in_month}. Les écarts de la pluie, de l'ET₀ et des jours sans pluie seront donnés en fin de mois.
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
            {PARAMETER_ORDER.map((k) => <ParameterCard key={k} k={k} data={data} />)}
          </div>

          <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
            Passez la souris sur une carte pour sa définition. Normale : moyenne de {MONTH_NAMES[monthNumber - 1]} de {data.normals_period[0]} à {data.normals_period[1]}
            {data.normals_years < data.normals_period[1] - data.normals_period[0] + 1 ? `, sur ${data.normals_years} années complètes` : ""}.
            Source : Open-Meteo, météo réelle de la ferme mise à jour chaque matin.
          </p>
        </>
      )}

      {years && years.years.length > 0 && <YearComparisonTable data={years} selectedYear={year} />}
    </div>
  );
}