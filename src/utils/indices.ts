import type { KnownIndiceName } from "../types/indice";

export interface IndiceInterpretation {
  label: string;
  color: string;
}

/**
 * ⚠️ Seuils PROVISOIRES, non validés par un géomaticien. À remplacer dès
 * que des seuils réels par indice (et idéalement par culture_type) sont
 * disponibles. Pour l'instant : règle générique -1..1, 3 tranches égales.
 */
function genericInterpretation(value: number): IndiceInterpretation {
  if (value >= 0.33) return { label: "Sain", color: "#16a34a" };
  if (value >= -0.33) return { label: "Modéré", color: "#ca8a04" };
  return { label: "Faible / stress", color: "#dc2626" };
}

export function interpretIndiceValue(
  _indiceName: KnownIndiceName | string,
  value: number | null
): IndiceInterpretation | null {
  if (value === null || Number.isNaN(value)) return null;
  return genericInterpretation(value);
}