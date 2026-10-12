import type { Indicator } from "../../types/diagnosis";
import { LEVEL_STYLE } from "../../utils/indices";

/** Définition courte de chaque indice, affichée au survol du nom. */
const INDICE_HINT: Record<string, string> = {
  NDVI: "Vigueur générale de la végétation",
  NDRE: "Teneur en chlorophylle, état nutritionnel",
  NDMI: "Teneur en eau des feuilles",
  MSI: "Stress hydrique : plus il est élevé, plus la plante manque d'eau",
  SAVI: "Vigueur corrigée de l'effet du sol nu",
  FCOVER: "Part du sol couverte par la végétation",
};

/**
 * Une ligne d'indice : valeur, variation depuis la mesure précédente,
 * verdict coloré et rappel du seuil. Tout vient du back.
 */
export default function IndicatorRow({ indicator }: { indicator: Indicator }) {
  // Couleurs partagées avec le reste de l'application (utils/indices.ts)
  const style = LEVEL_STYLE[indicator.level];
  // Indice non évalué : sa variation est affichée, mais pas jugée
  const isInfo = indicator.level === "info";
  const delta = indicator.delta;
  const isPercent = indicator.unit === "%";
  const decimals = isPercent ? 0 : 3;

  // MSI : une HAUSSE est mauvaise, l'inverse des autres indices
  const deltaIsBad =
    delta != null && (indicator.name === "MSI" ? delta > 0 : delta < 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 76px 80px 1fr",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderBottom: "1px solid #f1f3f5",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <span
        title={INDICE_HINT[indicator.name] ?? ""}
        style={{ fontWeight: 600, color: "#111827", cursor: "help" }}
      >
        {indicator.name === "FCOVER" ? "FCover" : indicator.name}
      </span>

      <span style={{ fontWeight: 600, color: "#111827" }}>
        {indicator.value.toFixed(decimals)}
        {indicator.unit}
      </span>

      <span
        style={{
          fontSize: 11,
          color: delta == null || isInfo ? "#9ca3af" : deltaIsBad ? "#b42318" : "#15803d",
        }}
      >
        {delta == null
          ? "—"
          : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(decimals)}${indicator.unit}`}
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}`,
            borderRadius: 999,
            padding: "1px 9px",
            whiteSpace: "nowrap",
          }}
        >
          ● {style.label}
        </span>
        {indicator.threshold_label && (
          <span
            style={{
              fontSize: 11,
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {indicator.threshold_label}
          </span>
        )}
      </span>
    </div>
  );
}