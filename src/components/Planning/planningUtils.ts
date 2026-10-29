import type { Activity } from "../../types/activity";

/**
 * Date du jour d'une tâche : prévue, sinon réelle (AAAA-MM-JJ). La date
 * réelle est lue en heure LOCALE : une tâche faite à 00:30 en Tunisie
 * reste à sa date, et ne passe pas à la veille (heure universelle).
 */
export const taskDay = (a: Activity): string =>
  a.planned_for ?? (a.performed_at ? isoDay(new Date(a.performed_at)) : "");

/** Heure prévue d'une tâche (HH:MM), sinon vide */
export const plannedTime = (a: Activity): string => (a.planned_time ? a.planned_time.slice(0, 5) : "");

/** Heure de réalisation d'une tâche faite (HH:MM, heure locale), sinon vide */
export const doneTime = (a: Activity): string =>
  a.performed_at
    ? new Date(a.performed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

/** Heure actuelle (HH:MM), proposée par défaut comme heure de réalisation */
export const nowTime = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

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

/** Jour et heure choisis (midi par défaut), en heure locale, au format ISO avec fuseau */
export const dayToDateTime = (iso: string, time = "12:00"): string => new Date(`${iso}T${time}:00`).toISOString();
// ----------------------------------------------------------------------
// Calendrier
// ----------------------------------------------------------------------

/** Premier jour du mois */
export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** « Octobre 2026 » */
export const monthLabel = (d: Date): string => {
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Jours affichés pour un mois : du lundi de la semaine du 1er au dimanche
 * de la semaine du dernier jour, soit des semaines complètes.
 */
export const monthGrid = (month: Date): Date[] => {
  const first = mondayOf(startOfMonth(month));
  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const last = addDays(mondayOf(lastOfMonth), 6);
  const days: Date[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
};

/** En retard : encore à réaliser alors que sa date prévue est passée */
export const isOverdue = (a: Activity, today: string): boolean =>
  a.status === "a_realiser" && Boolean(a.planned_for) && (a.planned_for as string) < today;