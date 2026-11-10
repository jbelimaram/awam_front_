import { useEffect, useState } from "react";
import { conditionsService } from "../../Services/conditionsService";
import { useToast } from "../../hooks/useToast";
import type { CropImpacts, ParcelImpacts, StageClimate, StageParameterKey } from "../../types/conditions";
import MonthNav from "./MonthNav";
import { MONTH_NAMES, PARAMETER_INFO, fmt } from "./parameterInfo";

const STAGE_ORDER: StageParameterKey[] = ["temperature_max_c", "temperature_min_c", "precipitation_mm", "et0_mm", "humidity_mean_pct"];

/** Besoin couvert ou non : la seule limite est le besoin lui-même (100 %) */
const COVERED = { bg: "#EAF3DE", text: "#27500A" };
const NOT_COVERED = { bg: "#FAEEDA", text: "#633806" };

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const fullDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const mm = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${fmt(v, 0)} mm`);

const section: React.CSSProperties = { padding: "12px 14px", borderTop: "1px solid #eef0ee" };
const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 };
const cell: React.CSSProperties = { textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #eef0ee", whiteSpace: "nowrap" };
const kpi: React.CSSProperties = { background: "#f6f7f6", borderRadius: 10, padding: "8px 10px", minWidth: 0 };

/** « +5 °C », « −62 % », « +2 points » */
function gap(key: StageParameterKey, anomaly: number | null, unit: "%" | null) {
  if (anomaly === null) return "—";
  const sign = anomaly > 0 ? "+" : anomaly < 0 ? "−" : "";
  const info = PARAMETER_INFO[key];
  const value = fmt(Math.abs(anomaly), unit === "%" ? 0 : 1);
  if (unit === "%") return `${sign}${value} %`;
  if (info.unit === "%") return `${sign}${value} ${Math.abs(anomaly) >= 2 ? "points" : "point"}`;
  return `${sign}${value} ${info.unit}`;
}

/** Partie 1 : un stade et son climat, comparé à la normale des mêmes dates */
function StageBlock({ s, normals }: { s: StageClimate; normals: [number, number] }) {
  const position = { above: { text: "au-dessus de toutes", color: "#A32D2D" }, below: { text: "en dessous de toutes", color: "#185FA5" }, within: { text: "dans la fourchette", color: "#4b5563" } };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, borderRadius: 999, padding: "2px 10px", background: "#EAF3DE", color: "#27500A", fontWeight: 600 }}>{s.label}</span>
        <span style={{ fontSize: 12.5, color: "#4b5563" }}>
          période habituelle : du {fullDay(s.start)} au {fullDay(s.end)}, d'après le calendrier AWAM
        </span>
      </div>
      {s.not_started ? (
        <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>{s.summary}</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "#111827" }}>
              <thead>
                <tr>
                  <th style={{ ...cell, textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Paramètre</th>
                  <th style={{ ...cell, color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Cette période</th>
                  <th style={{ ...cell, color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Normale {normals[0]}-{normals[1]}</th>
                  <th style={{ ...cell, color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Écart</th>
                  <th style={{ ...cell, color: "#6b7280", fontWeight: 600, fontSize: 11.5 }}>Par rapport aux années {normals[0]}-{normals[1]}</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_ORDER.map((k) => {
                  const p = s.parameters[k];
                  const info = PARAMETER_INFO[k];
                  const pos = p.position ? position[p.position] : null;
                  return (
                    <tr key={k}>
                      <td style={{ ...cell, textAlign: "left" }}>{info.icon} {info.label}</td>
                      <td style={cell}>{p.value === null ? "—" : `${fmt(p.value, info.decimals)} ${info.unit}`}</td>
                      <td style={{ ...cell, color: "#6b7280" }}>{p.normal === null ? "—" : `${fmt(p.normal, info.decimals)} ${info.unit}`}</td>
                      <td style={{ ...cell, fontWeight: 600 }}>{gap(k, p.anomaly, p.anomaly_unit)}</td>
                      <td style={{ ...cell, color: pos?.color, fontWeight: pos && p.position !== "within" ? 600 : 400 }}>{pos ? pos.text : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12.5, color: "#111827", margin: "8px 0 0" }}>{s.summary}</p>
          {s.in_progress && s.counted_until && (
            <p style={{ fontSize: 11.5, color: "#6b7280", margin: "3px 0 0" }}>
              Stade en cours : la période est comptée jusqu'au {fullDay(s.counted_until)}, et comparée aux mêmes dates des années {normals[0]} à {normals[1]}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Partie 2 : l'eau du mois, ses semaines non couvertes, et la saison */
function WaterBlock({ c, monthLabel, seasonStart }: { c: CropImpacts; monthLabel: string; seasonStart: number }) {
  const w = c.water.month;
  if (!w) return <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>Ce mois n'a pas encore commencé.</p>;
  if (w.problems.length) {
    return (
      <p style={{ fontSize: 12.5, color: "#633806", background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
        Non calculable pour le moment, car {w.problems.join(" et ")}.
      </p>
    );
  }
  const s = c.water.season;
  const tone = w.covered ? COVERED : NOT_COVERED;
  // Le mois est-il calculé en entier ? Sinon, jusqu'au dernier jour de météo enregistré
  const [y, m] = w.start.split("-").map(Number);
  const monthEnd = new Date(y, m, 0).getDate();
  const partial = Number(w.end.slice(8, 10)) < monthEnd;
  return (
    <>
      {partial && (
        <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 8px" }}>
          Calculé du {day(w.start)} au {fullDay(w.end)}, dernier jour de météo enregistré.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <div style={kpi}>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>Besoin de la culture</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{mm(w.need_mm)}</div>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>ET₀ {fmt(w.et0_mm, 0)} mm × Kc {w.kc === null ? "—" : fmt(w.kc, 2)}</div>
        </div>
        <div style={kpi}>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>Pluie mesurée</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{mm(w.rain_mm)}</div>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>Open-Meteo, comptée en entier</div>
        </div>
        <div style={kpi}>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>Arrosages</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{mm(w.irrigation_mm)}</div>
          <div style={{ fontSize: 11.5, color: "#6b7280" }}>{w.irrigation_l > 0 ? `${fmt(w.irrigation_l, 0)} litres enregistrés` : "aucun enregistré"}</div>
        </div>
        <div style={{ ...kpi, background: tone.bg }}>
          <div style={{ fontSize: 11.5, color: tone.text }}>Besoin couvert</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: tone.text }}>{w.coverage_pct === null ? "—" : `${fmt(w.coverage_pct, 0)} %`}</div>
          <div style={{ fontSize: 11.5, color: tone.text }}>
            {w.covered ? "eau reçue ≥ besoin" : `il manque ${mm(w.missing_mm)}`}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", margin: "10px 0 2px" }}>Semaines où l'eau reçue est inférieure au besoin · {monthLabel}</div>
      {c.water.weeks.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "#27500A", margin: 0 }}>Aucune : chaque semaine, l'eau reçue a couvert le besoin.</p>
      ) : (
        c.water.weeks.map((wk) => (
          <div key={wk.start} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f3f4f6", fontSize: 12.5, color: "#111827", flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}>du {day(wk.start)} au {day(wk.end)} · {wk.days} jour{wk.days > 1 ? "s" : ""}</span>
            <span style={{ color: "#6b7280" }}>reçu {mm(wk.received_mm)} pour un besoin de {mm(wk.need_mm)}</span>
            <span style={{ fontWeight: 600, color: NOT_COVERED.text }}>{wk.coverage_pct === null ? "—" : `${fmt(wk.coverage_pct, 0)} %`}</span>
          </div>
        ))
      )}

      {s && (
        <>
          <div style={{ fontSize: 12, color: "#6b7280", margin: "10px 0 2px" }}>
            Depuis le début de la saison, le 1er {MONTH_NAMES[seasonStart - 1]} {s.start.slice(0, 4)}
          </div>
          {s.problems.length ? (
            <p style={{ fontSize: 12.5, color: "#633806", margin: 0 }}>Non calculable, car {s.problems.join(" et ")}.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12.5, color: "#111827", flexWrap: "wrap" }}>
              <span style={{ flex: 1 }}>
                Besoin <strong>{mm(s.need_mm)}</strong> · pluie <strong>{mm(s.rain_mm)}</strong> · arrosages <strong>{mm(s.irrigation_mm)}</strong>
                {s.missing_mm ? <> · il manque <strong>{mm(s.missing_mm)}</strong></> : null}
              </span>
              {s.coverage_pct !== null && s.coverage_pct !== undefined && (
                <span style={{ fontSize: 11.5, borderRadius: 999, padding: "2px 9px", background: s.covered ? COVERED.bg : NOT_COVERED.bg, color: s.covered ? COVERED.text : NOT_COVERED.text }}>
                  couvert {fmt(s.coverage_pct, 0)} %
                </span>
              )}
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 12, color: "#6b7280", background: "#f6f7f6", borderRadius: 8, padding: "7px 10px", margin: "8px 0 0" }}>
        Besoin = ET₀ réelle (Open-Meteo) × Kc du stade (référentiel AWAM), calculé mois par mois. Eau reçue = pluie mesurée, comptée en entier, et arrosages enregistrés.
        {w.irrigation_l > 0 ? "" : " Aucun arrosage n'est enregistré sur le mois."}
      </p>
    </>
  );
}

/**
 * Onglet « Impacts » : pour chaque culture en cours de la parcelle, ses
 * stades du mois et leur climat comparé à la normale, puis son eau.
 */
export default function ImpactsTab({ farmId, parcelId, parcelName }: { farmId: number; parcelId: number; parcelName: string }) {
  const { showToast } = useToast();
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [data, setData] = useState<ParcelImpacts | null>(null);

  useEffect(() => {
    let alive = true;
    conditionsService
      .months(farmId)
      .then((list) => {
        if (!alive) return;
        setMonths(list);
        setMonth((m) => (m && list.includes(m) ? m : list[0] ?? ""));
      })
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Climat indisponible."));
    return () => {
      alive = false;
    };
  }, [farmId, showToast]);

  useEffect(() => {
    if (!month) return;
    let alive = true;
    setData(null);
    conditionsService
      .impacts(parcelId, month)
      .then((d) => alive && setData(d))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Impacts indisponibles."));
    return () => {
      alive = false;
    };
  }, [parcelId, month, showToast]);

  const monthLabel = month ? `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : "";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Impacts sur les cultures · {parcelName}</strong>
        <MonthNav months={months} month={month} onChange={setMonth} />
      </div>

      {data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : data.crops.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aucune culture en cours sur cette parcelle.</p>
      ) : (
        data.crops.map((c) => (
          <div key={c.crop_id} style={{ border: "1px solid #eef0ee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f6f7f6", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14, color: "#111827" }}>{c.label}</strong>
              {c.planting_date && <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>planté le {fullDay(c.planting_date)}</span>}
            </div>

            <div style={section}>
              <div style={title}>1 · Le stade et son climat</div>
              {c.stages.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>Aucun stade du calendrier AWAM ce mois-ci.</p>
              ) : (
                c.stages.map((s) => <StageBlock key={s.stage} s={s} normals={data.normals_period} />)
              )}
            </div>

            <div style={section}>
              <div style={title}>2 · L'eau · {monthLabel}</div>
              <WaterBlock c={c} monthLabel={monthLabel} seasonStart={data.season_start_month} />
            </div>

            <div style={section}>
              <div style={title}>3 · Autres stress</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["🌡️ Chaleur", "❄️ Gel", "🌫️ Excès d'humidité"].map((x) => (
                  <span key={x} style={{ fontSize: 12, border: "1px dashed #c4c4c4", borderRadius: 8, padding: "6px 10px", color: "#6b7280" }}>{x}</span>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: "#6b7280", margin: "6px 0 0" }}>Ils seront activés quand leurs seuils, par culture et par stade, seront validés.</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}