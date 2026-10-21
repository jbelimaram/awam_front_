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

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  padding: "4px 0",
};

/**
 * Onglet Besoins : irrigation calculée (ET0 × Kc − pluie) et lecture de
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
        {water && (
          <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>
            {water.days} derniers jours
          </span>
        )}
      </div>

      {!water ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>
          Besoin en eau indisponible : la ferme doit avoir une position pour
          que la météo soit consultée.
        </p>
      ) : (
        <>
          <div style={row}>
            <span style={{ color: "#6b7280" }}>
              Évapotranspiration
              {water.kc != null && (
                <span style={{ fontSize: 11 }}> · ET0 {water.et0_mm} mm × Kc {water.kc}</span>
              )}
            </span>
            <span style={{ fontWeight: 500 }}>{water.etc_mm} mm</span>
          </div>
          <div style={row}>
            <span style={{ color: "#6b7280" }}>
              Pluie
              <span style={{ fontSize: 11 }}> · {water.rain_mm} mm tombés, 80 % utilisables</span>
            </span>
            <span style={{ fontWeight: 500 }}>− {water.effective_rain_mm} mm</span>
          </div>

          <div
            style={{
              ...row,
              borderTop: "1px solid #e5e7eb",
              marginTop: 4,
              paddingTop: 8,
              alignItems: "baseline",
            }}
          >
            <span style={{ color: "#111827", fontWeight: 600 }}>Besoin net</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                {water.net_need_mm} mm
              </span>
              {water.net_need_m3 != null && (
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  ≈ {water.net_need_m3.toLocaleString("fr-FR")} m³
                </span>
              )}
            </span>
          </div>

          <p style={{ fontSize: 12, color: "#374151", margin: "6px 0 16px", lineHeight: 1.45 }}>
            → {water.message}
          </p>
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