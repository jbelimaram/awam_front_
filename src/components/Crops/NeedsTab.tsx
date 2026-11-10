import type { CropNeeds } from "../../types/diagnosis";

const LEVEL_COLOR: Record<string, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 8,
};

/** Les deux états du besoin couvert : mêmes libellés et explications que le Suivi de l'irrigation */
const STATUS = {
  couvert: {
    label: "Besoin couvert", icon: "🟢", bg: "#EAF3DE", text: "#27500A",
    help: "La pluie et les arrosages ont apporté au moins l'eau dont la culture avait besoin.",
  },
  non_couvert: {
    label: "Besoin non couvert", icon: "🟠", bg: "#FAEEDA", text: "#633806",
    help: "La culture a reçu moins d'eau que son besoin.",
  },
} as const;

const mm = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mm`);
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  padding: "4px 0",
};

/**
 * Onglet Besoins : besoin en eau des 7 derniers jours (même calcul que le
 * Suivi de l'irrigation : ET₀ × Kc, pluie mesurée, arrosages) et lecture de
 * la dernière analyse de sol comparée aux références de l'espèce.
 * Tous les calculs viennent du back.
 */
export default function NeedsTab({ needs }: { needs: CropNeeds | null }) {
  if (!needs) {
    return (
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#6b7280" }}>
        Chargement des besoins…
      </p>
    );
  }

  // Culture clôturée : aucun besoin à afficher, seulement la raison
  if (needs.closed_reason) {
    return (
      <p style={{ fontSize: 13, color: "#6b7280", margin: 0, padding: "8px 0" }}>
        {needs.closed_reason}
      </p>
    );
  }

  const water = needs.water;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* ---------- Irrigation ---------- */}
      <div style={sectionTitle}>
        Irrigation
        {water && water.days > 0 && (
          <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>
            7 derniers jours, du {day(water.start)} au {day(water.end)}
          </span>
        )}
      </div>

      {!water ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>Besoin en eau indisponible.</p>
      ) : water.problems.length ? (
        <p style={{ fontSize: 13, color: "#633806", background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", margin: "0 0 14px" }}>
          Calcul impossible pour le moment, car {water.problems.join(" et ")}.
        </p>
      ) : (
        <>
          <div style={row}>
            <span style={{ color: "#6b7280" }}>
              Besoin de la culture
              {water.kc != null && (
                <span style={{ fontSize: 11 }}> · ET₀ {mm(water.et0_mm)} × Kc {water.kc_varies ? "moyen " : ""}{water.kc.toLocaleString("fr-FR")}</span>
              )}
            </span>
            <span style={{ fontWeight: 500 }}>{mm(water.need_mm)}</span>
          </div>
          <div style={row}>
            <span style={{ color: "#6b7280" }}>
              Pluie mesurée
              <span style={{ fontSize: 11 }}> · Open-Meteo</span>
            </span>
            <span style={{ fontWeight: 500 }}>{mm(water.rain_mm)}</span>
          </div>
          <div style={row}>
            <span style={{ color: "#6b7280" }}>
              Arrosages
              <span style={{ fontSize: 11 }}>
                {" · "}{water.irrigation_l > 0 ? `${water.irrigation_l.toLocaleString("fr-FR")} L sur la parcelle` : "aucun enregistré"}
              </span>
            </span>
            <span style={{ fontWeight: 500 }}>{mm(water.irrigation_mm)}</span>
          </div>

          <div
            style={{
              ...row,
              borderTop: "1px solid #e5e7eb",
              marginTop: 4,
              paddingTop: 8,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#111827", fontWeight: 600 }}>
              Besoin couvert {water.coverage_pct != null && <span style={{ fontWeight: 700 }}>{water.coverage_pct.toLocaleString("fr-FR")} %</span>}
            </span>
            {water.status && (
              <span
                title={STATUS[water.status].help}
                style={{
                  fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "3px 10px", cursor: "help",
                  background: STATUS[water.status].bg, color: STATUS[water.status].text,
                }}
              >
                {STATUS[water.status].icon} {STATUS[water.status].label}
                {water.status === "non_couvert" && water.missing_mm != null ? ` : il manque ${mm(water.missing_mm)}` : ""}
              </span>
            )}
          </div>
          <div style={{ marginBottom: 16 }} />
        </>
      )}

      {/* ---------- Fertilisation ---------- */}
      <div style={{ ...sectionTitle, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
        Sol et fertilisation
        {needs.soil_analysis_date && (
          <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>
            analyse du {new Date(needs.soil_analysis_date).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>

      {needs.soil.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Aucune analyse de sol enregistrée pour cette parcelle. Ajoutez-en une
          depuis la fiche de la parcelle.
        </p>
      ) : (
        needs.soil.map((item) => {
          const color = LEVEL_COLOR[item.level] ?? "#6b7280";
          return (
            <div key={item.param} style={{ padding: "6px 0", borderBottom: "1px solid #f1f3f5" }}>
              <div style={row}>
                <span style={{ color: "#6b7280" }}>{item.param}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    {item.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                  </span>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, color,
                      border: `1px solid ${color}`, borderRadius: 999, padding: "1px 8px",
                    }}
                  >
                    {item.reference}
                  </span>
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{item.message}</div>
            </div>
          );
        })
      )}
    </div>
  );
}