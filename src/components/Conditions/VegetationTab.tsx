import { useEffect, useState } from "react";
import { conditionsService } from "../../Services/conditionsService";
import { useToast } from "../../hooks/useToast";
import type { IndexBaseline, IndexChange, IndexReading, ParcelVegetation, VegetationIndex, VegetationScene } from "../../types/conditions";
import MonthNav from "./MonthNav";
import { fmt } from "./parameterInfo";

const ORDER: VegetationIndex[] = ["NDVI", "NDMI", "NDRE"];

const INDEX: Record<VegetationIndex, { label: string; icon: string }> = {
  NDVI: { label: "Vigueur végétative", icon: "🌿" },
  NDMI: { label: "Teneur en eau foliaire", icon: "💧" },
  NDRE: { label: "Activité chlorophyllienne", icon: "🍃" },
};

/**
 * Interprétation d'un indicateur, avec les seules données d'AWAM :
 *   - « Hors intervalle attendu » : sous l'intervalle du référentiel AWAM pour la culture, son stade et son âge ;
 *   - « Inférieur / Supérieur à la référence parcelle » : hors de la plage habituelle de la parcelle à cette époque ;
 *   - « Conforme » : dans la plage habituelle ;
 *   - « Référence insuffisante » : ni seuil du référentiel, ni historique suffisant.
 */
type Reading = "out" | "below" | "above" | "conform" | "none";

/** Mêmes couleurs que les niveaux de l'onglet Impacts */
const READING: Record<Reading, { label: string; bg: string; text: string; rank: number }> = {
  out: { label: "Hors intervalle attendu", bg: "#FCEBEB", text: "#791F1F", rank: 4 },
  below: { label: "Inférieur à la référence parcelle", bg: "#E6F1FB", text: "#0C447C", rank: 3 },
  conform: { label: "Conforme", bg: "#EAF3DE", text: "#27500A", rank: 2 },
  above: { label: "Supérieur à la référence parcelle", bg: "#E6F1FB", text: "#0C447C", rank: 1 },
  none: { label: "Référence insuffisante", bg: "#f3f4f6", text: "#6b7280", rank: 0 },
};

/** Couverture du besoin : mêmes couleurs que l'onglet Impacts (la seule limite : 100 %) */
const COVERED = { bg: "#EAF3DE", text: "#27500A" };
const NOT_COVERED = { bg: "#FAEEDA", text: "#633806" };
const UP = "#27500A";
const DOWN = "#A32D2D";

function readingOf(k: VegetationIndex, s: VegetationScene): { reading: Reading; recommendation: string | null } {
  const low = s.interpretation.flatMap((it) => it.readings).find((r: IndexReading) => r.indice === k && r.level === "low");
  if (low) return { reading: "out", recommendation: low.recommendation };
  const b: IndexBaseline | undefined = s.baselines?.[k];
  if (b && b.status === "ok" && b.verdict) return { reading: b.verdict === "within" ? "conform" : b.verdict, recommendation: null };
  return { reading: "none", recommendation: null };
}

/** L'interprétation la plus sérieuse d'une acquisition */
function sceneReading(s: VegetationScene): Reading {
  return ORDER.filter((k) => s.values[k] !== undefined)
    .map((k) => readingOf(k, s).reading)
    .reduce<Reading>((worst, r) => (READING[r].rank > READING[worst].rank ? r : worst), "none");
}

const v2 = (v: number) => fmt(v, 2);
const range = (low: number | null | undefined, high: number | null | undefined) =>
  low === null || low === undefined || high === null || high === undefined ? "—" : `${v2(low)} – ${v2(high)}`;
function Arrow({ c }: { c: IndexChange | null | undefined }) {
  if (!c || c.direction === "same") return null;
  return <span style={{ color: c.direction === "up" ? UP : DOWN, fontWeight: 600 }}> {c.direction === "up" ? "↗" : "↘"}</span>;
}
/** « −0,02 (−4 %) », ou l'écart seul si le pourcentage serait trompeur */
function variation(c: IndexChange | null | undefined) {
  if (!c) return "—";
  const sign = c.diff > 0 ? "+" : c.diff < 0 ? "−" : "";
  const pct = c.pct === null ? "" : ` (${c.pct > 0 ? "+" : c.pct < 0 ? "−" : ""}${fmt(Math.abs(c.pct), 0)} %)`;
  return `${sign}${fmt(Math.abs(c.diff), 2)}${pct}`;
}
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const longDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const box: React.CSSProperties = { border: "1px solid #C0DD97", borderRadius: 12, overflow: "hidden", background: "#fff" };
const head: React.CSSProperties = { padding: "10px 14px", background: "#f6f7f6", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" };
const th: React.CSSProperties = {
  textAlign: "left", fontWeight: 600, color: "#27500A", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em",
  padding: "8px 12px", borderBottom: "1px solid #C0DD97", background: "#EAF3DE", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "9px 12px", borderBottom: "1px solid #eef0ee", color: "#111827", fontSize: 12.5, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const right: React.CSSProperties = { textAlign: "right" };

function Tag({ reading, title }: { reading: Reading; title?: string }) {
  const r = READING[reading];
  return (
    <span
      title={title}
      style={{
        display: "inline-block", fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "3px 10px",
        background: r.bg, color: r.text, whiteSpace: "nowrap", cursor: title ? "help" : undefined,
      }}
    >
      {r.label}
    </span>
  );
}

/** Une case des métadonnées */
function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "#3B6D11" }}>{icon} {label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#173404", marginTop: 2 }}>{value}</div>
    </div>
  );
}

/**
 * Onglet « Végétation » : rapport d'analyse des acquisitions Sentinel-2 du
 * mois. Uniquement des données d'AWAM : images valides de la parcelle,
 * plage habituelle de la parcelle (page Fermes), référentiel AWAM, météo et
 * arrosages enregistrés.
 */
export default function VegetationTab({ farmId, parcelId, parcelName }: { farmId: number; parcelId: number; parcelName: string }) {
  const { showToast } = useToast();
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [data, setData] = useState<ParcelVegetation | null>(null);

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
      .vegetation(parcelId, month)
      .then((d) => alive && setData(d))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Végétation indisponible."));
    return () => {
      alive = false;
    };
  }, [parcelId, month, showToast]);

  const labels: Record<number, string> = Object.fromEntries((data?.crops ?? []).map((c) => [c.crop_id, c.label]));
  const stages = Array.from(new Set((data?.crops ?? []).flatMap((c) => c.stages)));
  const last = data?.scenes[data.scenes.length - 1];
  const refYears = last ? Array.from(new Set(ORDER.flatMap((k) => last.baselines?.[k]?.years ?? []))).sort() : [];
  const total = data ? data.scenes.length + data.excluded_scenes : 0;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Suivi de la végétation — {parcelName}</strong>
        <MonthNav months={months} month={month} onChange={setMonth} />
      </div>

      {data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : !last ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Aucune acquisition Sentinel-2 exploitable ce mois-ci{data.excluded_scenes ? ` (${data.excluded_scenes} écartée(s) pour couverture nuageuse)` : ""}.
        </p>
      ) : (
        <>
          {/* ---- Métadonnées ---- */}
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap", padding: "12px 16px", borderRadius: 12, background: "#EAF3DE", border: "1px solid #C0DD97" }}>
            <Meta icon="🛰️" label="Dernière acquisition" value={longDay(last.date)} />
            <Meta icon="☁️" label="Couverture nuageuse" value={last.cloud_cover === null ? "—" : `${fmt(last.cloud_cover, 0)} %`} />
            <Meta icon="✅" label="Acquisitions exploitables" value={`${data.scenes.length} sur ${total}`} />
            <Meta icon="🌱" label="Stade phénologique" value={stages.length ? stages.join(", ") : "—"} />
            <Meta icon="📅" label="Référence parcelle" value={refYears.length ? refYears.join(", ") : "—"} />
            {data.multi_crop && <Meta icon="🌾" label="Cultures" value={data.crops.map((c) => c.label).join(", ")} />}
          </div>

          {/* ---- Indicateurs de végétation ---- */}
          <div style={box}>
            <div style={head}>
              <strong style={{ fontSize: 13.5, color: "#111827" }}>🛰️ Indicateurs de végétation</strong>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                acquisition du {shortDay(last.date)}{last.previous_date ? ` · variation depuis l'acquisition du ${shortDay(last.previous_date)}` : ""}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Indicateur</th>
                    <th style={{ ...th, ...right }}>Valeur</th>
                    <th style={{ ...th, ...right }}>Variation</th>
                    <th style={{ ...th, ...right }}>Référence parcelle</th>
                    <th style={{ ...th, ...right }}>Référentiel AWAM</th>
                    <th style={th}>Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDER.filter((k) => last.values[k] !== undefined).map((k) => {
                    const { reading, recommendation } = readingOf(k, last);
                    const b = last.baselines?.[k];
                    const refs = last.interpretation
                      .map((it) => ({ crop: labels[it.crop_id], r: it.readings.find((x) => x.indice === k) }))
                      .filter((x) => x.r && x.r.level !== null);
                    return (
                      <tr key={k}>
                        <td style={td}>
                          <strong style={{ fontWeight: 600 }}>{INDEX[k].icon} {k}</strong>
                          <span style={{ display: "block", fontSize: 11, color: "#6b7280" }}>{INDEX[k].label}</span>
                        </td>
                        <td style={{ ...td, ...right }}>{v2(last.values[k]!)}</td>
                        <td style={{ ...td, ...right, color: !last.changes[k] || last.changes[k]!.direction === "same" ? "#111827" : last.changes[k]!.direction === "up" ? UP : DOWN }}>
                          {last.previous_date ? <>{variation(last.changes[k])}<Arrow c={last.changes[k]} /></> : "—"}
                        </td>
                        <td style={{ ...td, ...right }}>{b && b.status === "ok" ? range(b.low, b.high) : "—"}</td>
                        <td style={{ ...td, ...right }}>
                          {refs.length === 0
                            ? "—"
                            : refs.map((x) => (
                                <span key={x.crop} style={{ display: "block" }}>
                                  {range(x.r!.low, x.r!.high)}
                                  {data.multi_crop ? <span style={{ color: "#6b7280", fontSize: 11 }}> · {x.crop}</span> : null}
                                </span>
                              ))}
                        </td>
                        <td style={td}><Tag reading={reading} title={recommendation ?? undefined} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Chronologie des acquisitions ---- */}
          <div style={box}>
            <div style={head}>
              <strong style={{ fontSize: 13.5, color: "#111827" }}>📅 Chronologie des acquisitions</strong>
              <span style={{ fontSize: 12, color: "#6b7280" }}>indicateurs et conditions climatiques depuis l'acquisition précédente</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Acquisition</th>
                    {ORDER.map((k) => <th key={k} style={{ ...th, ...right }}>{INDEX[k].icon} {k}</th>)}
                    <th style={{ ...th, ...right }}>Pluie</th>
                    <th style={{ ...th, ...right }}>ET₀</th>
                    <th style={{ ...th, ...right }}>Couverture du besoin</th>
                    <th style={th}>Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scenes.map((s) => {
                    const c = s.climate_before;
                    return (
                      <tr key={s.date}>
                        <td style={{ ...td, fontWeight: 600, color: "#173404" }}>{shortDay(s.date)}</td>
                        {ORDER.map((k) => (
                          <td key={k} style={{ ...td, ...right }}>
                            {s.values[k] === undefined ? "—" : <>{v2(s.values[k]!)}{s.previous_date ? <Arrow c={s.changes[k]} /> : null}</>}
                          </td>
                        ))}
                        <td style={{ ...td, ...right }}>{c ? `${fmt(c.rain_mm, 0)} mm` : "—"}</td>
                        <td style={{ ...td, ...right }}>{c ? `${fmt(c.et0_mm, 0)} mm` : "—"}</td>
                        <td style={{ ...td, ...right }}>
                          {!c
                            ? "—"
                            : c.crops.map((cr) => (
                                <span key={cr.crop_id} style={{ display: "block", margin: "1px 0" }}>
                                  {cr.coverage_pct === null ? (
                                    "—"
                                  ) : (
                                    <span style={{
                                      display: "inline-block", borderRadius: 999, padding: "2px 9px", fontWeight: 600, fontSize: 12,
                                      background: cr.covered ? COVERED.bg : NOT_COVERED.bg, color: cr.covered ? COVERED.text : NOT_COVERED.text,
                                    }}>
                                      {fmt(cr.coverage_pct, 0)} %
                                    </span>
                                  )}
                                  {data.multi_crop ? <span style={{ color: "#6b7280", fontSize: 11 }}> · {labels[cr.crop_id]}</span> : null}
                                </span>
                              ))}
                        </td>
                        <td style={td}><Tag reading={sceneReading(s)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}