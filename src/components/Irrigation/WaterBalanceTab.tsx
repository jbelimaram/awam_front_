import { useCallback, useEffect, useState } from "react";
import { irrigationService } from "../../Services/irrigationService";
import { useToast } from "../../hooks/useToast";
import type { CoverageStatus, CropWaterBalance, ParcelWaterBalance, WaterBalance } from "../../types/irrigation";
import { shortDay } from "../Planning/planningUtils";
import { fmt } from "./equipmentDisplay";

/** Couleurs et libellés des états du besoin couvert */
const STATUS: Record<CoverageStatus, { label: string; icon: string; bg: string; text: string; help: string }> = {
  couvert: {
    label: "besoin couvert", icon: "🟢", bg: "#EAF3DE", text: "#27500A",
    help: "La pluie et les arrosages ont apporté au moins l'eau dont la culture avait besoin.",
  },
  non_couvert: {
    label: "besoin non couvert", icon: "🟠", bg: "#FAEEDA", text: "#633806",
    help: "La culture a reçu moins d'eau que son besoin.",
  },
};

const pill = (s: CoverageStatus | null) =>
  s ? (
    <span title={STATUS[s].help} style={{ fontSize: 11.5, borderRadius: 999, padding: "2px 10px", background: STATUS[s].bg, color: STATUS[s].text, whiteSpace: "nowrap", cursor: "help" }}>
      {STATUS[s].icon} {STATUS[s].label}
    </span>
  ) : (
    <span style={{ fontSize: 11.5, borderRadius: 999, padding: "2px 10px", background: "#f3f4f6", color: "#6b7280", whiteSpace: "nowrap" }}>
      non calculable
    </span>
  );

/** « 1 080 L », ou « 2,4 m³ » au-delà de 1 000 L */
const water = (liters: number) => (liters >= 1000 ? `${fmt(liters / 1000, 1)} m³` : `${fmt(liters, 0)} L`);
const mm = (v: number | null) => (v === null ? "—" : `${fmt(v, 1)} mm`);
const day = (iso: string) => shortDay(iso).split(" ")[1];

function Kpi({ icon, label, value, note, tone }: { icon: string; label: string; value: string; note: string; tone?: CoverageStatus | null }) {
  const t = tone ? STATUS[tone] : null;
  return (
    <div style={{ background: t ? t.bg : "#f6f7f6", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: t ? t.text : "#6b7280" }}><span aria-hidden>{icon}</span> {label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: t ? t.text : "#111827", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: t ? t.text : "#6b7280" }}>{note}</div>
    </div>
  );
}

function CropCard({ c }: { c: CropWaterBalance }) {
  const b: WaterBalance = c.last7;
  const blocked = b.problems.length > 0;
  return (
    <div style={{ border: "1px solid #eef0ee", borderRadius: 12, overflow: "hidden" }}>
      {/* ---- Les 7 derniers jours ---- */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 14, color: "#111827" }}>{c.label}</strong>
          <span style={{ fontSize: 12, color: "#6b7280" }}>· les 7 derniers jours, du {day(b.start)} au {day(b.end)}</span>
          <span style={{ marginLeft: "auto" }}>{pill(b.status)}</span>
        </div>
        {blocked ? (
          <p style={{ fontSize: 13, color: "#633806", background: "#FAEEDA", borderRadius: 8, padding: "10px 12px", margin: 0 }}>
            {c.interpretation.join(" ")}
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              <Kpi
                icon="☀️"
                label="Besoin de la culture"
                value={mm(b.need_mm)}
                note={`ET₀ ${fmt(b.et0_mm, 1)} mm × Kc ${b.kc_varies ? "moyen " : ""}${fmt(b.kc ?? 0, 2)}`}
              />
              <Kpi icon="🌧" label="Pluie mesurée" value={mm(b.rain_mm)} note="Open-Meteo, comptée en entier" />
              <Kpi icon="🚿" label="Irrigation" value={mm(b.irrigation_mm)} note={water(b.irrigation_l)} />
              <Kpi
                icon="💧"
                label="Besoin couvert"
                value={b.coverage_pct === null ? "—" : `${fmt(b.coverage_pct, 0)} %`}
                note={b.status === "non_couvert" ? `il manque ${water(b.missing_l ?? 0)}` : "eau reçue ≥ besoin"}
                tone={b.status}
              />
            </div>
            <p style={{ fontSize: 13, color: "#111827", lineHeight: 1.6, margin: "10px 0 0" }}>{c.interpretation.join(" ")}</p>
          </>
        )}
      </div>

      {/* ---- Les semaines ---- */}
      {!blocked && (
        <div style={{ borderTop: "1px solid #eef0ee" }}>
          <div
            style={{
              display: "grid", gridTemplateColumns: "150px repeat(3, minmax(0, 1fr)) 132px", gap: 8,
              padding: "7px 14px", fontSize: 11.5, color: "#6b7280", background: "#f6f7f6",
            }}
          >
            <span>Semaine</span>
            <span style={{ textAlign: "right" }}>Besoin</span>
            <span style={{ textAlign: "right" }}>Pluie + arrosages</span>
            <span style={{ textAlign: "right" }}>Couvert</span>
            <span style={{ textAlign: "center" }}>État</span>
          </div>
          {c.weeks.map((w) => (
            <div
              key={w.start}
              style={{
                display: "grid", gridTemplateColumns: "150px repeat(3, minmax(0, 1fr)) 132px", gap: 8, alignItems: "center",
                padding: "7px 14px", fontSize: 12.5, color: "#111827", borderTop: "1px solid #f3f4f6",
              }}
            >
              <span>
                {day(w.start)} – {day(w.end)}
                {w.current && <span style={{ color: "#185FA5" }}> · en cours</span>}
              </span>
              <span style={{ textAlign: "right" }}>{mm(w.need_mm)}</span>
              <span style={{ textAlign: "right" }}>{mm(w.received_mm)}</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{w.coverage_pct === null ? "—" : `${fmt(w.coverage_pct, 0)} %`}</span>
              <span style={{ textAlign: "center" }}>{pill(w.status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Onglet « Suivi » : pour chaque culture en cours de la parcelle, a-t-elle
 * reçu assez d'eau ? Besoin (ET₀ × Kc jour par jour, FAO-56), pluie mesurée,
 * arrosages et besoin couvert, sur les 7 derniers jours et semaine par
 * semaine, jusqu'au dernier jour de météo enregistré. Quand une donnée
 * manque, aucun pourcentage n'est affiché.
 */
export default function WaterBalanceTab({ parcelId, parcelName }: { parcelId: number; parcelName: string }) {
  const { showToast } = useToast();
  const [data, setData] = useState<ParcelWaterBalance | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await irrigationService.waterBalance(parcelId, 8));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suivi indisponible.");
    }
  }, [parcelId, showToast]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <strong style={{ fontSize: 15, color: "#111827" }}>Suivi de l'eau · {parcelName}</strong>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          Les cultures ont-elles reçu assez d'eau ? Besoin estimé selon la méthode FAO-56 : ET₀ × Kc.
        </div>
      </div>

      {data === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : data.crops.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aucune culture en cours sur cette parcelle.</p>
      ) : (
        <>
          {data.crops.map((c) => <CropCard key={c.crop_id} c={c} />)}
        </>
      )}
    </div>
  );
}