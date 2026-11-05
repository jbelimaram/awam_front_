import type { Equipment, EquipmentKind, WaterSource } from "../../types/irrigation";

/** Apparence de chaque type d'équipement : icône, nom, couleurs douces */
export const KIND_META: Record<EquipmentKind, { icon: string; label: string; tint: string; text: string; section: string }> = {
  arrosoir: { icon: "🪣", label: "Arrosoir", tint: "#FAEEDA", text: "#633806", section: "#fdf6ea" },
  tuyau: { icon: "💧", label: "Tuyau", tint: "#E6F1FB", text: "#0C447C", section: "#eef5fc" },
  goutte_a_goutte: { icon: "💦", label: "Goutte-à-goutte", tint: "#EAF3DE", text: "#27500A", section: "#f3f8ec" },
};

export const SOURCE_LABELS: Record<WaterSource, string> = {
  puits: "Puits",
  reseau: "Réseau",
  bassin: "Bassin",
  autre: "Autre source",
};

/** Nombre à la française : « 1 080 », « 16 », « 0,75 » */
export const fmt = (v: number, digits = 1) =>
  v.toLocaleString("fr-FR", { maximumFractionDigits: digits });

/** Débit lisible : « 1 080 L/h », ou « 4,4 m³/h » au-delà de 1 000 L/h */
export function formatFlow(lPerHour: number): string {
  return lPerHour >= 10000 ? `${fmt(lPerHour / 1000)} m³/h` : `${fmt(lPerHour, 0)} L/h`;
}

/** Les valeurs clés d'un équipement, en étiquettes courtes */
export function keyFacts(e: Equipment): string[] {
  if (e.kind === "arrosoir") return e.can_capacity_l ? [`${fmt(e.can_capacity_l)} L par arrosoir`] : [];
  if (e.kind === "tuyau") {
    const facts: string[] = [];
    if (e.hose_flow_l_min) facts.push(`${fmt(e.hose_flow_l_min)} L/min · ${formatFlow(e.hose_flow_l_min * 60)}`);
    const size = [e.hose_diameter_in ? `${fmt(e.hose_diameter_in, 2)}″` : null, e.hose_length_m ? `${fmt(e.hose_length_m, 0)} m` : null]
      .filter(Boolean)
      .join(", ");
    if (size) facts.push(size);
    return facts;
  }
  const facts: string[] = [];
  if (e.emitter_flow_l_h && e.emitters_per_plant) {
    facts.push(`${e.emitters_per_plant} × ${fmt(e.emitter_flow_l_h)} L/h · ${fmt(e.flow_per_plant_l_h ?? 0)} L/h par plant`);
  }
  if (e.plants_per_ha) facts.push(`${fmt(e.plants_per_ha, 0)} plants/ha`);
  if (e.total_flow_l_h) facts.push(`${formatFlow(e.total_flow_l_h)} au total`);
  return facts;
}