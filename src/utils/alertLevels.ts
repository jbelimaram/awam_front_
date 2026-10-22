/**
 * Présentation des niveaux d'alerte, partagée par la cloche (AlertsBell)
 * et la carte Historique (OperationHistoryCard).
 *
 * Chaque niveau a sa couleur, son symbole ET son mot : la couleur seule ne
 * suffit pas (daltonisme, écran au soleil sur le terrain). Les mots
 * « forte » ou « critique » ne sont jamais employés : le niveau décrit ce
 * que le satellite confirme, pas une gravité constatée sur la plante.
 */

export interface AlertLevelStyle {
  color: string;
  bg: string;
  symbol: string;
}

export const ALERT_LEVEL_STYLE: Record<string, AlertLevelStyle> = {
  strong_alert: { color: "#b91c1c", bg: "#fef2f2", symbol: "⚠" },
  alert: { color: "#c2410c", bg: "#fff7ed", symbol: "!" },
  watch: { color: "#a16207", bg: "#fefce8", symbol: "•" },
  normal: { color: "#15803d", bg: "#f0fdf4", symbol: "✓" },
};

/** Ce que le satellite a réellement confirmé, pour chaque niveau d'alerte */
export const ALERT_LEVEL_HELP: Record<string, string> = {
  alert: "Un signal anormal s'est confirmé sur deux images successives.",
  strong_alert:
    "Une perte de vigueur (feuillage et chlorophylle en baisse ensemble) s'est confirmée sur deux images successives.",
};

export const alertLevelStyle = (severity: string): AlertLevelStyle =>
  ALERT_LEVEL_STYLE[severity] ?? ALERT_LEVEL_STYLE.alert;

/** « 2026-10-21 » → « 21/10/2026 » ; accepte aussi une date-heure */
export const formatAlertDate = (iso?: string | null): string =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("fr-FR") : "—";