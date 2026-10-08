import type { Diagnosis } from "../../types/diagnosis";

const SEVERITY_STYLE: Record<string, { bg: string; border: string; color: string; icon: string; label: string }> = {
  watch: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e", icon: "⚠️", label: "Surveillance" },
  alert: { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b", icon: "⚠️", label: "Alerte" },
  strong_alert: { bg: "#fef2f2", border: "#ef4444", color: "#7f1d1d", icon: "🚨", label: "Alerte confirmée" },
};

/**
 * Bandeau affiché en haut de la page quand le diagnostic signale un
 * risque. Reprend tel quel ce que le back a décidé : diagnostic, mesure
 * à prendre, action à mener.
 */
export default function RiskBanner({ diagnosis }: { diagnosis: Diagnosis }) {
  // Période de coupe ou récolte : les baisses sont normales, on rassure
  if (diagnosis.cultural_drop) {
    return (
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          color: "#075985",
        }}
      >
        ℹ️ {diagnosis.reading}
      </div>
    );
  }

  if (diagnosis.severity === "normal" || diagnosis.risks.length === 0) return null;

  const style = SEVERITY_STYLE[diagnosis.severity] ?? SEVERITY_STYLE.watch;

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        padding: "11px 14px",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{style.icon}</span>
        <strong style={{ fontSize: 13, color: style.color }}>{style.label}</strong>
        {diagnosis.scene_date && (
          <span style={{ fontSize: 11, color: style.color, opacity: 0.7, marginLeft: "auto" }}>
            Image du {new Date(diagnosis.scene_date).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>

      {diagnosis.risks.map((risk, i) => (
        <div key={i} style={{ fontSize: 13, color: style.color, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{risk.diagnosis}</div>
          <div style={{ opacity: 0.85 }}>
            <strong>Mesurer :</strong> {risk.measure}
          </div>
          <div style={{ opacity: 0.85 }}>
            <strong>Agir :</strong> {risk.action}
          </div>
        </div>
      ))}
    </div>
  );
}