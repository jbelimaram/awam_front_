import type { Crop, CropStatus } from "../types/crop";

/** Aujourd'hui au format des dates du back (AAAA-MM-JJ), heure locale. */
export const todayLocalIso = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Statut AFFICHÉ d'une culture.
 *
 * Une PÉRENNE n'est jamais clôturée par une récolte : le back la garde
 * « active », pour qu'elle reste diagnostiquée et que son cycle suivant
 * commence. Elle s'affiche « Récoltée » le JOUR de sa récolte seulement,
 * puis de nouveau « En cours » dès le lendemain.
 *
 * Une ANNUELLE récoltée (basilic) a réellement terminé son cycle : son
 * statut est affiché tel quel.
 */
export function shownStatus(crop: Pick<Crop, "status" | "is_annual" | "actual_harvest_date">): CropStatus {
  if (
    !crop.is_annual &&
    crop.status === "active" &&
    crop.actual_harvest_date === todayLocalIso()
  ) {
    return "harvested";
  }
  return crop.status;
}