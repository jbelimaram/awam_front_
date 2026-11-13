import { useEffect, useState } from "react";
import { conditionsService } from "../../Services/conditionsService";
import { useToast } from "../../hooks/useToast";
import type { ParcelReport, VegetationIndex } from "../../types/conditions";
import MonthNav from "./MonthNav";
import RiskFactorSheet from "../Risk/RiskFactorSheet";
import { MONTH_NAMES, PARAMETER_INFO, PARAMETER_ORDER, fmt } from "./parameterInfo";

const INDICES: { key: VegetationIndex; label: string }[] = [
  { key: "NDVI", label: "Vigueur végétative" },
  { key: "NDMI", label: "Teneur en eau foliaire" },
  { key: "NDRE", label: "Activité chlorophyllienne" },
];

const day = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR") : "—");
const signed = (v: number | null, decimals: number, unit: string) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v), decimals)} ${unit}`;

const sectionTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#27500A", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "1px solid #C0DD97", padding: "0 0 3px", margin: "16px 0 6px",
};
const th: React.CSSProperties = { textAlign: "left", fontWeight: 600, color: "#27500A", fontSize: 11, padding: "5px 6px", background: "#EAF3DE" };
const td: React.CSSProperties = { padding: "5px 6px", borderBottom: "1px solid #eef0ee", fontSize: 12, color: "#111827", verticalAlign: "top" };
const note: React.CSSProperties = { fontSize: 11, color: "#6b7280", margin: "4px 0 0" };

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{head.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/**
 * Onglet « Rapports » : le rapport mensuel d'une parcelle, affiché à l'écran
 * et téléchargeable en PDF (créé par le back). Il rassemble les résultats
 * des autres onglets, sans rien calculer de nouveau.
 */
export default function ReportsTab({ farmId, parcelId }: { farmId: number; parcelId: number }) {
  const { showToast } = useToast();
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [report, setReport] = useState<ParcelReport | null>(null);
  const [downloading, setDownloading] = useState(false);

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
    setReport(null);
    conditionsService
      .report(parcelId, month)
      .then((r) => alive && setReport(r))
      .catch((e) => showToast("error", e instanceof Error ? e.message : "Rapport indisponible."));
    return () => {
      alive = false;
    };
  }, [parcelId, month, showToast]);

  const download = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await conditionsService.reportPdf(parcelId, month);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `rapport-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Téléchargement impossible.");
    } finally {
      setDownloading(false);
    }
  };

  const [y, m] = month ? month.split("-").map(Number) : [0, 0];
  const monthLabel = month ? `${MONTH_NAMES[m - 1].toLowerCase()} ${y}` : "";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Rapport mensuel</strong>
        <MonthNav months={months} month={month} onChange={setMonth} />
        <button
          type="button"
          onClick={download}
          disabled={!report || downloading}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid #1b4332", background: "#1b4332", color: "#fff",
            fontSize: 12.5, fontWeight: 600, cursor: report && !downloading ? "pointer" : "not-allowed", opacity: report ? 1 : 0.6,
          }}
        >
          {downloading ? "Préparation…" : "⬇ Télécharger en PDF"}
        </button>
      </div>

      {report === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: "20px 24px", maxWidth: 860 }}>
          {/* ---- En-tête ---- */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "2px solid #1b4332", paddingBottom: 8 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#173404" }}>Rapport mensuel — {report.parcel_name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {report.farm_name} · {monthLabel} · {report.polyculture ? "Polyculture" : "Culture"} :{" "}
                {report.crops.map((c) => c.label).join(", ") || "aucune culture en cours"}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>AWAM<br />généré le {day(report.generated_on)}</div>
          </div>
          {report.climate.partial && report.weather_until && (
            <p style={note}>Mois en cours : les calculs s'arrêtent au {day(report.weather_until)}, dernier jour de météo enregistré.</p>
          )}

          {/* ---- 1. Climat ---- */}
          <div style={sectionTitle}>1 · Climat du mois</div>
          <Table
            head={["Paramètre", "Ce mois", `Normale ${report.climate.normals_period[0]}-${report.climate.normals_period[1]}`, "Écart"]}
            rows={PARAMETER_ORDER.map((k) => {
              const info = PARAMETER_INFO[k];
              const p = report.climate.parameters[k];
              return [
                info.label,
                p.value === null ? "—" : `${fmt(p.value, info.decimals)} ${info.unit}`,
                p.normal === null ? "—" : `${fmt(p.normal, info.decimals)} ${info.unit}`,
                signed(p.anomaly, info.decimals, p.anomaly_unit ?? info.unit),
              ];
            })}
          />
          <p style={note}>{report.climate.days} jour(s) de météo sur {report.climate.days_in_month}.</p>

          {/* ---- 2. Stades ---- */}
          <div style={sectionTitle}>2 · Stades des cultures</div>
          <Table
            head={["Culture", "Stade", "Période habituelle", "Climat du stade"]}
            rows={report.impacts.crops.flatMap((c) => c.stages.map((s) => [c.label, s.label, s.months, s.summary]))}
          />
          <p style={note}>Stades : périodes habituelles du calendrier AWAM.</p>

          {/* ---- 3. Eau ---- */}
          <div style={sectionTitle}>3 · Eau</div>
          <Table
            head={["Culture", "Besoin", "Pluie mesurée", "Arrosages", "Besoin couvert", "État"]}
            rows={report.impacts.crops.map((c) => {
              const w = c.water.month;
              if (!w) return [c.label, "—", "—", "—", "—", "Pas encore de météo ce mois-ci"];
              if (w.problems.length) return [c.label, "—", `${fmt(w.rain_mm, 1)} mm`, "—", "—", `Non calculable : ${w.problems.join(" et ")}`];
              return [
                c.label,
                `${fmt(w.need_mm ?? 0, 1)} mm`,
                `${fmt(w.rain_mm, 1)} mm`,
                `${fmt(w.irrigation_mm ?? 0, 1)} mm (${fmt(w.irrigation_l, 0)} L)`,
                `${fmt(w.coverage_pct ?? 0, 0)} %`,
                w.covered ? "Besoin couvert" : `Besoin non couvert : il manque ${fmt(w.missing_mm ?? 0, 1)} mm`,
              ];
            })}
          />

          {/* ---- 4. Végétation ---- */}
          <div style={sectionTitle}>4 · Végétation</div>
          {report.vegetation.scenes.length === 0 ? (
            <p style={note}>
              Aucune acquisition Sentinel-2 exploitable ce mois-ci
              {report.vegetation.excluded_scenes ? ` (${report.vegetation.excluded_scenes} écartée(s) pour couverture nuageuse)` : ""}.
            </p>
          ) : (
            (() => {
              const last = report.vegetation.scenes[report.vegetation.scenes.length - 1];
              const names = Object.fromEntries(report.vegetation.crops.map((c) => [c.crop_id, c.label]));
              const poly = report.vegetation.multi_crop ? " (polyculture : indices mélangés)" : "";
              return (
                <>
                  <Table
                    head={["Acquisition", "NDVI", "NDMI", "NDRE", "Nuages"]}
                    rows={report.vegetation.scenes.map((s) => [
                      day(s.date),
                      s.values.NDVI === undefined ? "—" : fmt(s.values.NDVI, 2),
                      s.values.NDMI === undefined ? "—" : fmt(s.values.NDMI, 2),
                      s.values.NDRE === undefined ? "—" : fmt(s.values.NDRE, 2),
                      s.cloud_cover === null ? "—" : `${fmt(s.cloud_cover, 0)} %`,
                    ])}
                  />
                  <p style={note}>Interprétation de l'acquisition du {day(last.date)} :</p>
                  <Table
                    head={["Indicateur", "Valeur", "Référence parcelle", "Référentiel AWAM"]}
                    rows={INDICES.filter((i) => last.values[i.key] !== undefined).map((i) => {
                      const b = last.baselines?.[i.key];
                      const refParcel =
                        b && b.status === "ok" && b.low !== null && b.high !== null
                          ? `${fmt(b.low, 2)} à ${fmt(b.high, 2)} : ${{ below: "en dessous", within: "dans la plage", above: "au-dessus" }[b.verdict ?? "within"]}`
                          : "historique insuffisant";
                      const refs = last.interpretation
                        .map((it) => ({ crop: names[it.crop_id], r: it.readings.find((x) => x.indice === i.key) }))
                        .filter((x) => x.r && x.r.level !== null)
                        .map((x) => `${x.crop} : ${fmt(x.r!.low ?? 0, 2)} à ${fmt(x.r!.high ?? 0, 2)}, ${{ low: "sous l'intervalle", normal: "dans l'intervalle", high: "au-dessus" }[x.r!.level as "low" | "normal" | "high"]}`);
                      return [`${i.key} · ${i.label}`, fmt(last.values[i.key]!, 2), refParcel, refs.length ? refs.join(" ; ") + poly : "—"];
                    })}
                  />
                </>
              );
            })()
          )}

                    {/* ---- 5. Alertes ---- */}
          <div style={sectionTitle}>5 · Alertes du mois</div>
          {report.alerts.length === 0 ? (
            <p style={note}>Aucune alerte pendant ce mois.</p>
          ) : (
            <>
            <Table
              head={["Alerte", "Culture", "Ouverte", "Clôturée", "Raison"]}
              rows={report.alerts.map((a) => [
                a.type === "Besoin en eau" ? "Besoin en eau non couvert" : `${a.type} · ${a.severity_label}`,
                a.crop_label ?? "—",
                day(a.opened),
                a.closed ? day(a.closed) : "En cours",
                a.resolution_label ?? "—",
              ])}
            />
            {report.alerts.filter((a) => a.factors?.decision).map((a, i) => (
              <div key={i} style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#173404", marginBottom: 6 }}>
                  Facteurs de risque — {a.type === "Besoin en eau" ? "Besoin en eau non couvert" : a.type}
                  {a.crop_label ? ` · ${a.crop_label}` : ""}
                </div>
                <RiskFactorSheet f={a.factors} />
              </div>
            ))}
            </>
          )}

          {/* ---- 6. Arrosages ---- */}
          <div style={sectionTitle}>6 · Arrosages réalisés</div>
          {report.waterings.length === 0 ? (
            <p style={note}>Aucun arrosage enregistré pendant ce mois.</p>
          ) : (
            <>
              <Table
                head={["Date", "Équipement", "Volume", "Culture", "Employés"]}
                rows={report.waterings.map((w) => [
                  day(w.date), w.equipment ?? "—", w.volume_l === null ? "—" : `${fmt(w.volume_l, 0)} L`,
                  w.crop_label, w.employees.join(", ") || "—",
                ])}
              />
              <p style={note}>
                Total : {report.waterings.length} arrosage(s), {fmt(report.waterings.reduce((t, w) => t + (w.volume_l ?? 0), 0), 0)} L.
              </p>
            </>
          )}

          <p style={{ ...note, borderTop: "1px solid #eef0ee", paddingTop: 8, marginTop: 14 }}>
            Sources : météo Open-Meteo · images Sentinel-2 · référentiel agronomique AWAM · arrosages et alertes enregistrés dans AWAM.
          </p>
        </div>
      )}
    </div>
  );
}