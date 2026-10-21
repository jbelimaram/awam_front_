import type { Crop } from "../../types/crop";
import { shownStatus } from "../../utils/cropStatus";

const STATUS_LABEL: Record<string, string> = {
  active: "En cours",
  harvested: "Récoltée",
  abandoned: "Abandonnée",
  ended: "Terminée",
};

/** « 8 mois », « 1 an », « 4 ans » */
const formatAge = (years: number): string => {
  if (years < 1) {
    const months = Math.max(Math.round(years * 12), 0);
    return months <= 1 ? "moins d'un mois" : `${months} mois`;
  }
  const n = Math.floor(years);
  return n === 1 ? "1 an" : `${n} ans`;
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  padding: "5px 0",
};
const label: React.CSSProperties = { color: "#6b7280", flexShrink: 0 };
const value: React.CSSProperties = { color: "#111827", fontWeight: 500, textAlign: "right" };

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

/** Mois et année, pour une date de récolte prévue : « octobre 2026 ». */
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/**
 * Texte de la récolte prévue. Le back ne la calcule pas pour un verger
 * pas encore en production : on l'explique au lieu d'afficher un tiret.
 */
function expectedHarvestText(crop: Crop): { text: string; muted: boolean } {
  if (crop.status !== "active") {
    return {
      text: crop.expected_harvest_date ? fmtMonth(crop.expected_harvest_date) : "—",
      muted: true,
    };
  }
  if (crop.expected_harvest_date) {
    return { text: fmtMonth(crop.expected_harvest_date), muted: false };
  }
  if (crop.is_orchard && !crop.in_production) {
    return { text: "Verger pas encore en production", muted: true };
  }
  return { text: "Date de plantation à renseigner", muted: true };
}

interface CropInfoTabProps {
  crop: Crop;
  history: Crop[];
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Onglet Fiche : identité de la culture et historique des cultures
 * précédentes de la parcelle, qui donne la rotation sur plusieurs saisons.
 */
export default function CropInfoTab({ crop, history, onEdit, onDelete }: CropInfoTabProps) {
  const previous = history.filter((c) => c.id !== crop.id);
  const expected = expectedHarvestText(crop);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: "#111827" }}>
          {crop.species_label ?? crop.species}
          {crop.variety && <span style={{ fontWeight: 400, color: "#6b7280" }}> · {crop.variety}</span>}
        </strong>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1",
              background: "#ffffff", color: "#1b4332", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            ✎ Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Supprimer la culture"
            style={{
              padding: "4px 8px", borderRadius: 6, border: "1px solid #fecaca",
              background: "#ffffff", color: "#b42318", fontSize: 12, cursor: "pointer",
            }}
          >
            🗑
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div style={row}>
          <span style={label}>Plantation</span>
          <span style={value}>{fmtDate(crop.planting_date)}</span>
        </div>
        <div style={row}>
          <span style={label}>Statut</span>
          <span
            style={{
              ...value,
              // Une pérenne récoltée aujourd'hui reste dans son cycle : en vert
              color: crop.status === "active" ? "#15803d" : "#6b7280",
            }}
          >
            {STATUS_LABEL[shownStatus(crop)] ?? crop.status}
          </span>
        </div>
        <div style={row}>
          <span style={label}>Récolte prévue</span>
          <span
            style={{
              ...value,
              color: expected.muted ? "#9ca3af" : value.color,
              fontStyle: expected.muted ? "italic" : "normal",
            }}
          >
            {expected.text}
          </span>
        </div>
        <div style={row}>
          <span style={label}>Récolte réelle</span>
          <span style={value}>{fmtDate(crop.actual_harvest_date)}</span>
        </div>
        {crop.status === "ended" && (
          <div style={row}>
            <span style={label}>Fin de culture</span>
            <span style={value}>{fmtDate(crop.end_date)}</span>
          </div>
        )}
        {crop.actual_yield != null && (
          <div style={row}>
            <span style={label}>Quantité récoltée</span>
            <span style={value}>
              {crop.actual_yield.toLocaleString("fr-FR")} {crop.yield_unit ?? ""}
            </span>
          </div>
        )}
        {crop.is_orchard && (
          <div style={row}>
            <span style={label}>Verger en production</span>
            <span style={{ ...value, color: crop.in_production ? "#15803d" : "#92400e" }}>
              {crop.in_production ? "Oui" : "Non"}
            </span>
          </div>
        )}
        {crop.age_years != null && !crop.is_annual && (
          <div style={row}>
            <span style={label}>Âge de la plantation</span>
            <span style={value}>
              {formatAge(crop.age_years)}
              {crop.optimal_production && (
                <span style={{ color: "#6b7280", fontWeight: 400 }}>
                  {" "}· production optimale {crop.optimal_production}
                </span>
              )}
            </span>
          </div>
        )}
        {crop.density != null && (
          <div style={row}>
            <span style={label}>Densité</span>
            <span style={value}>
              {crop.density.toLocaleString("fr-FR")} plants/ha
            </span>
          </div>
        )}
      </div>

      {crop.lifespan_note && (
        <p
          style={{
            margin: "10px 0 0",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.4,
            background: crop.lifespan_level === "warning" ? "#fffbeb" : "#f3f4f6",
            border: `1px solid ${crop.lifespan_level === "warning" ? "#fcd34d" : "#e5e7eb"}`,
            color: crop.lifespan_level === "warning" ? "#92400e" : "#4b5563",
          }}
        >
          {crop.lifespan_level === "warning" ? "⚠ " : "ℹ "}
          {crop.lifespan_note}
        </p>
      )}

      {crop.notes && (
        <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0", lineHeight: 1.45 }}>
          {crop.notes}
        </p>
      )}

      {previous.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Historique de la parcelle
          </div>
          {previous.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", padding: "3px 0" }}
            >
              <span>
                {c.planting_date ? new Date(c.planting_date).getFullYear() : "—"}
                {/* Culture terminée : sa période de vie, ex. « 2017 – 2026 » */}
                {c.status === "ended" && c.end_date ? ` – ${new Date(c.end_date).getFullYear()}` : ""} ·{" "}
                {c.species_label ?? c.species}
              </span>
              <span style={{ color: "#6b7280" }}>
                {c.status === "ended"
                  ? `terminée le ${fmtDate(c.end_date)}`
                  : c.actual_harvest_date
                  ? `récoltée le ${fmtDate(c.actual_harvest_date)}`
                  : STATUS_LABEL[c.status] ?? c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}