/**
 * Codes météo WMO renvoyés par le backend (champ `weather_code`).
 * Référence : https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
const WMO_LABELS: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Plutôt dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine modérée",
  55: "Bruine dense",
  56: "Bruine verglaçante légère",
  57: "Bruine verglaçante dense",
  61: "Pluie faible",
  63: "Pluie modérée",
  65: "Pluie forte",
  66: "Pluie verglaçante légère",
  67: "Pluie verglaçante forte",
  71: "Neige faible",
  73: "Neige modérée",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses faibles",
  81: "Averses modérées",
  82: "Averses violentes",
  85: "Averses de neige faibles",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage avec grêle légère",
  99: "Orage avec grêle forte",
};

/** Libellé lisible d'un code météo WMO. */
export function weatherCodeToLabel(code: number | null | undefined): string {
  if (code == null) return "Météo indisponible";
  return WMO_LABELS[code] ?? "Conditions inconnues";
}

/** Icône correspondant à un code météo WMO. */
export function weatherCodeToIcon(code: number | null | undefined): string {
  if (code == null) return "🌡️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}