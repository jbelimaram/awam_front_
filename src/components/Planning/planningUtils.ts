import type { Activity } from "../../types/activity";

/** Date du jour d'une tâche : prévue, sinon réelle (AAAA-MM-JJ) */
export const taskDay = (a: Activity): string =>
  a.planned_for ?? (a.performed_at ? a.performed_at.slice(0, 10) : "");

/** AAAA-MM-JJ en date locale, sans décalage de fuseau */
export const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lundi de la semaine d'une date */
export const mondayOf = (d: Date): Date => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** « lun. 26/10 » */
export const shortDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });

/** Midi du jour choisi, en heure locale, au format ISO avec fuseau */
export const dayToDateTime = (iso: string): string => new Date(`${iso}T12:00:00`).toISOString();