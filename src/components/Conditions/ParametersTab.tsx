import { useEffect, useState } from "react";
import InfoTip from "../Common/InfoTip";
import { conditionsService } from "../../Services/conditionsService";
import { useToast } from "../../hooks/useToast";
import type { MonthConditions, ParameterKey } from "../../types/conditions";
import { PARAMETER_INFO, PARAMETER_ORDER, fmt, monthLabel } from "./parameterInfo";

const select: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12.5,
  background: "#fff", color: "#111827", fontFamily: "inherit",
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
 * Onglet « Paramètres » : les 9 paramètres du climat d'un mois, chacun avec
 * sa normale (même mois, 2020-2025) et l'écart entre les deux.
 */
export default function ParametersTab({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { showToast } = useToast();
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>("");
  const [data, setData] = useState<MonthConditions | null>(null);

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

  const normalLabel = month ? monthLabel(month).split(" ")[0] : "";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Paramètres climatiques · {farmName}</strong>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={select} aria-label="Mois" disabled={!months.length}>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {!month && months.length === 0 && data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <>
          {data.partial && (
            <p style={{ fontSize: 12.5, color: "#854F0B", background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
              Mois en cours : {data.days} jours sur {data.days_in_month}. Les écarts de la pluie, de l'ET₀ et des jours sans pluie seront donnés en fin de mois.
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
            {PARAMETER_ORDER.map((key) => {
              const info = PARAMETER_INFO[key];
              const p = data.parameters[key];
              const gap = anomalyText(key, data);
              return (
                <div key={key} style={{ background: "#f6f7f6", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                    <span aria-hidden>{info.icon}</span>
                    <span>{info.label}</span>
                    <InfoTip text={info.help} />
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 600, color: "#111827", marginTop: 3 }}>
                    {p.value === null ? "—" : `${fmt(p.value, info.decimals)} ${info.unit}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#4b5563", marginTop: 1 }}>
                    {gap ?? (p.normal !== null ? `normale : ${fmt(p.normal, info.decimals)} ${info.unit}` : "normale inconnue")}
                  </div>
                  {key === "dry_days" && data.longest_dry_spell !== null && (
                    <div style={{ fontSize: 12, color: "#4b5563" }}>dont {data.longest_dry_spell} de suite au plus</div>
                  )}
                  {key === "wind_speed_mean_kmh" && data.wind_speed_max_kmh !== null && data.windiest_day && (
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      rafale {fmt(data.wind_speed_max_kmh, 0)} km/h le {new Date(`${data.windiest_day}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
            Normale : moyenne de {normalLabel} de {data.normals_period[0]} à {data.normals_period[1]}
            {data.normals_years < data.normals_period[1] - data.normals_period[0] + 1 ? `, sur ${data.normals_years} années complètes` : ""}.
            Source : Open-Meteo, météo réelle de la ferme mise à jour chaque matin.
          </p>
        </>
      )}
    </div>
  );
}