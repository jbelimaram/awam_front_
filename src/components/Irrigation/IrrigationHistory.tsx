import { useCallback, useEffect, useMemo, useState } from "react";
import { irrigationService } from "../../Services/irrigationService";
import { useToast } from "../../hooks/useToast";
import type { DashboardParcel } from "../../types/dashboard";
import type { WateringHistoryItem } from "../../types/irrigation";
import { addDays, isoDay, mondayOf, shortDay } from "../Planning/planningUtils";
import { KIND_META, fmt } from "./equipmentDisplay";

const PERIODS = [
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "3 derniers mois" },
  { days: 365, label: "12 derniers mois" },
];

const select: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12.5, background: "#fff", color: "#111827", fontFamily: "inherit",
};

/** « 2,4 m³ » au-delà de 1 000 L, sinon « 810 L » */
const water = (liters: number) => (liters >= 1000 ? `${fmt(liters / 1000, 1)} m³` : `${fmt(liters, 0)} L`);

/** « 2 h 15 », « 45 min » */
function hours(minutes: number): string {
  if (minutes < 60) return `${fmt(minutes, 0)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

const localDay = (iso: string) => isoDay(new Date(iso));
const localTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/**
 * Historique de l'irrigation : filtres, quatre chiffres clés, l'eau
 * apportée par mois, les arrosages par semaine (une ligne par semaine, qui
 * s'ouvre au clic), et la répartition par équipement.
 */
export default function IrrigationHistory({
  farmId, parcels, defaultParcelId,
}: { farmId: number; parcels: DashboardParcel[]; defaultParcelId: number | null }) {
  const { showToast } = useToast();
  const [days, setDays] = useState(90);
  const [parcelId, setParcelId] = useState<string>(defaultParcelId ? String(defaultParcelId) : "");
  const [equipment, setEquipment] = useState("");
  const [crop, setCrop] = useState("");
  const [items, setItems] = useState<WateringHistoryItem[] | null>(null);

  useEffect(() => setParcelId(defaultParcelId ? String(defaultParcelId) : ""), [defaultParcelId]);

  const load = useCallback(async () => {
    try {
      setItems(await irrigationService.farmHistory(farmId, days));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Historique indisponible.");
      setItems([]);
    }
  }, [farmId, days, showToast]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  // ---- Filtres ------------------------------------------------------------
  const inParcel = useMemo(
    () => (items ?? []).filter((w) => !parcelId || String(w.parcel_id) === parcelId),
    [items, parcelId],
  );
  const equipmentNames = useMemo(
    () => Array.from(new Set(inParcel.map((w) => w.equipment_name ?? "Sans équipement"))).sort(),
    [inParcel],
  );
  const cropNames = useMemo(
    () => Array.from(new Set(inParcel.map((w) => w.crop_label ?? "Toute la parcelle"))).sort(),
    [inParcel],
  );
  const shown = useMemo(
    () =>
      inParcel.filter(
        (w) =>
          (!equipment || (w.equipment_name ?? "Sans équipement") === equipment) &&
          (!crop || (w.crop_label ?? "Toute la parcelle") === crop),
      ),
    [inParcel, equipment, crop],
  );

  // ---- Chiffres clés ------------------------------------------------------
  const totalL = shown.reduce((s, w) => s + (w.volume_l ?? 0), 0);
  const totalMin = shown.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  /** Lame d'eau : sur la parcelle choisie, ou sur toutes les parcelles de la ferme */
  const areaM2 = parcelId
    ? parcels.find((p) => String(p.id) === parcelId)?.surface_m2 ?? null
    : parcels.reduce((s, p) => s + (p.surface_m2 || 0), 0) || null;
  const depthMm = areaM2 ? totalL / areaM2 : null;

  // ---- Eau apportée par mois ---------------------------------------------
  const monthly = useMemo(() => {
    const first = addDays(new Date(), -days + 1);
    const months: { key: string; label: string; liters: number; count: number }[] = [];
    for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= new Date(); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const name = d.toLocaleDateString("fr-FR", { month: "long" });
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${name.charAt(0).toUpperCase()}${name.slice(1)}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`,
        liters: 0,
        count: 0,
      });
    }
    for (const w of shown) {
      if (!w.performed_at) continue;
      const d = new Date(w.performed_at);
      const month = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (month) {
        month.liters += w.volume_l ?? 0;
        month.count += 1;
      }
    }
    // Du plus récent au plus ancien, comme les semaines
    return months.reverse();
  }, [shown, days]);

  // ---- Arrosages groupés par semaine (du lundi au dimanche) ----------------
  const byWeek = useMemo(() => {
    const groups = new Map<string, WateringHistoryItem[]>();
    for (const w of shown) {
      if (!w.performed_at) continue;
      const key = isoDay(mondayOf(new Date(w.performed_at)));
      groups.set(key, [...(groups.get(key) ?? []), w]);
    }
    return Array.from(groups.entries());
  }, [shown]);
  /** Semaines ouvertes : seule la plus récente au départ */
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());
  useEffect(() => setOpenWeeks(new Set(byWeek.length ? [byWeek[0][0]] : [])), [byWeek]);
  const toggleWeek = (key: string) =>
    setOpenWeeks((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ---- Répartition par équipement ----------------------------------------
  const byEquipment = useMemo(() => {
    const totals = new Map<string, { liters: number; count: number; kind: WateringHistoryItem["equipment_kind"] }>();
    for (const w of shown) {
      const name = w.equipment_name ?? "Sans équipement";
      const t = totals.get(name) ?? { liters: 0, count: 0, kind: w.equipment_kind };
      t.liters += w.volume_l ?? 0;
      t.count += 1;
      totals.set(name, t);
    }
    return Array.from(totals.entries()).sort((a, b) => b[1].liters - a[1].liters);
  }, [shown]);

  const parcelLabel = parcelId ? parcels.find((p) => String(p.id) === parcelId)?.nom ?? "" : "la ferme";
  const kpis = [
    { icon: "🚿", label: "Arrosages", value: String(shown.length), note: PERIODS.find((p) => p.days === days)?.label.toLowerCase() ?? "" },
    { icon: "💧", label: "Eau apportée", value: water(totalL), note: `${fmt(totalL, 0)} litres` },
    { icon: "📏", label: "Lame d'eau", value: depthMm === null ? "—" : `${fmt(depthMm, 1)} mm`, note: `sur ${parcelLabel}` },
    { icon: "⏱", label: "Temps d'arrosage", value: totalMin ? hours(totalMin) : "—", note: "tuyau et goutte-à-goutte" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filtres */}
      <strong style={{ fontSize: 15, color: "#111827" }}>Historique de l'irrigation</strong>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: -6 }}>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={select} aria-label="Période">
          {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
        <select value={parcelId} onChange={(e) => { setParcelId(e.target.value); setEquipment(""); setCrop(""); }} style={select} aria-label="Parcelle">
          <option value="">Toutes les parcelles</option>
          {parcels.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} style={select} aria-label="Équipement">
          <option value="">Tous les équipements</option>
          {equipmentNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} style={select} aria-label="Culture">
          <option value="">Toutes les cultures</option>
          {cropNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {items === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <>
          {/* Chiffres clés */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ background: "#f6f7f6", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "#6b7280" }}><span aria-hidden>{k.icon}</span> {k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginTop: 2 }}>{k.value}</div>
                <div style={{ fontSize: 11.5, color: "#6b7280" }}>{k.note}</div>
              </div>
            ))}
          </div>

          {/* Eau apportée par mois : une carte par mois */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Eau apportée par mois</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {monthly.map((m, i) => {
                const previous = monthly[i + 1];
                const change = previous && previous.liters > 0 ? ((m.liters - previous.liters) / previous.liters) * 100 : null;
                const isCurrent = i === 0;
                return (
                  <div
                    key={m.key}
                    style={{
                      border: `1px solid ${isCurrent ? "#B5D4F4" : "#eef0ee"}`, background: isCurrent ? "#f4f9fe" : "#fff",
                      borderRadius: 10, padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {m.label}
                      {isCurrent && <span style={{ color: "#185FA5" }}> · en cours</span>}
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 600, color: "#0C447C", marginTop: 2 }}>{m.liters ? water(m.liters) : "—"}</div>
                    <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 1 }}>
                      {m.count} arrosage{m.count > 1 ? "s" : ""}
                      {change !== null && !isCurrent && (
                        <span style={{ color: "#374151" }}>
                          {" · "}{change >= 0 ? "+" : "−"}{fmt(Math.abs(change), 0)} % vs {monthly[i + 1].label.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {shown.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aucun arrosage fait sur cette période, avec ces filtres.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
              {/* Une seule carte : une ligne par semaine, qui s'ouvre au clic */}
              <div style={{ border: "1px solid #eef0ee", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", padding: "10px 12px", borderBottom: "1px solid #eef0ee" }}>
                  Arrosages par semaine
                </div>
                {byWeek.map(([monday, list], index) => {
                  const sunday = addDays(new Date(`${monday}T00:00:00`), 6);
                  const liters = list.reduce((sum, w) => sum + (w.volume_l ?? 0), 0);
                  const minutes = list.reduce((sum, w) => sum + (w.duration_min ?? 0), 0);
                  const open = openWeeks.has(monday);
                  return (
                    <div key={monday} style={{ borderTop: index === 0 ? "none" : "1px solid #f3f4f6" }}>
                      <button
                        type="button"
                        onClick={() => toggleWeek(monday)}
                        aria-expanded={open}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                          border: "none", background: open ? "#f6f7f6" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                        }}
                      >
                        <span aria-hidden style={{ fontSize: 10, color: "#6b7280", width: 10 }}>{open ? "▼" : "▶"}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", flex: 1 }}>
                          {shortDay(monday).split(" ")[1]} – {shortDay(isoDay(sunday)).split(" ")[1]}
                          {monday === isoDay(mondayOf(new Date())) && (
                            <span style={{ fontWeight: 400, color: "#185FA5" }}> · cette semaine</span>
                          )}
                        </span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {list.length} arrosage{list.length > 1 ? "s" : ""}
                          {minutes ? ` · ${hours(minutes)}` : ""}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0C447C", minWidth: 62, textAlign: "right" }}>{water(liters)}</span>
                      </button>
                      {open && list.map((w) => {
                        const meta = w.equipment_kind ? KIND_META[w.equipment_kind] : null;
                        return (
                          <div
                            key={w.id}
                            style={{
                              display: "grid", gridTemplateColumns: "88px 22px minmax(0, 1fr) auto", alignItems: "center", gap: 8,
                              padding: "6px 12px 6px 32px", fontSize: 12.5, background: "#fbfbfa",
                            }}
                          >
                            <span style={{ color: "#6b7280" }}>
                              {w.performed_at ? `${shortDay(localDay(w.performed_at)).split(" ")[0]} ${localTime(w.performed_at)}` : ""}
                            </span>
                            <span aria-hidden>{meta ? meta.icon : "💧"}</span>
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>
                              {!parcelId && <strong style={{ fontWeight: 600 }}>{w.parcel_name} · </strong>}
                              {w.equipment_name ?? "Sans équipement"}
                              <span style={{ color: "#6b7280" }}>
                                {" · "}{w.crop_label ?? "toute la parcelle"}
                                {w.employees.length ? ` · ${w.employees.map((e) => e.full_name).join(", ")}` : ""}
                              </span>
                            </span>
                            <span style={{ fontWeight: 600, color: "#0C447C" }}>{w.volume_l !== null ? `${fmt(w.volume_l, 0)} L` : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Répartition par équipement : des chiffres, sans barres */}
              <div style={{ border: "1px solid #eef0ee", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Par équipement</div>
                {byEquipment.map(([name, t], i) => {
                  const meta = t.kind ? KIND_META[t.kind] : null;
                  return (
                    <div
                      key={name}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 30, height: 30, borderRadius: "50%", background: meta ? meta.tint : "#f3f4f6", flexShrink: 0,
                          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        }}
                      >
                        {meta ? meta.icon : "💧"}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#111827" }}>{name}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "#6b7280" }}>
                          {t.count} arrosage{t.count > 1 ? "s" : ""}
                        </span>
                      </span>
                      <span style={{ textAlign: "right" }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0C447C" }}>{water(t.liters)}</span>
                        {totalL > 0 && (
                          <span style={{ display: "block", fontSize: 11.5, color: "#6b7280" }}>{fmt((t.liters / totalL) * 100, 0)} % de l'eau</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}