/**
 * Couleur et icône de chaque type de tâche dans le calendrier.
 *
 * Comme sur les plateformes de gestion agricole (Agrivi, Farmbrite), la
 * COULEUR dit la nature du travail ; l'ÉTAT se lit au style de la
 * tâche (barrée, étiquette rouge, pointillés), pas à sa couleur.
 *
 * Couleurs douces : un fond clair et un texte foncé de la même teinte,
 * lisibles en plein soleil sur le terrain.
 */

export interface TaskStyle {
  /** Fond clair (rond de l'icône) */
  bg: string;
  /** Texte foncé de la même teinte */
  fg: string;
  /** Couleur franche : trait à gauche des tâches, points sous les jours */
  accent: string;
  icon: string;
}

/** Types prédéfinis : une couleur et une icône chacun */
const PREDEFINED: Record<string, TaskStyle> = {
  irrigation: { bg: "#E6F1FB", fg: "#0C447C", accent: "#378ADD", icon: "💧" },
  plantation: { bg: "#EAF3DE", fg: "#27500A", accent: "#639922", icon: "🌱" },
  traitement: { bg: "#EEEDFE", fg: "#3C3489", accent: "#7F77DD", icon: "🧪" },
  fertilisation: { bg: "#FAEEDA", fg: "#633806", accent: "#EF9F27", icon: "🍃" },
  recolte: { bg: "#FAECE7", fg: "#712B13", accent: "#D85A30", icon: "🧺" },
  taille: { bg: "#E1F5EE", fg: "#085041", accent: "#1D9E75", icon: "✂️" },
  desherbage: { bg: "#F1EFE8", fg: "#444441", accent: "#888780", icon: "🌿" },
};

/**
 * Types personnalisés : une teinte de cette palette, toujours la même pour
 * un même nom (calculée à partir du nom), pour qu'un « Paillage » garde sa
 * couleur d'un mois à l'autre.
 */
const CUSTOM_PALETTE: Omit<TaskStyle, "icon">[] = [
  { bg: "#FBEAF0", fg: "#72243E", accent: "#D4537E" },
  { bg: "#FCEBEB", fg: "#791F1F", accent: "#E24B4A" },
  { bg: "#E1F5EE", fg: "#04342C", accent: "#0F6E56" },
  { bg: "#EEEDFE", fg: "#26215C", accent: "#534AB7" },
  { bg: "#FAEEDA", fg: "#412402", accent: "#BA7517" },
  { bg: "#E6F1FB", fg: "#042C53", accent: "#185FA5" },
];

const hash = (s: string) => [...s.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const taskStyle = (code: string): TaskStyle =>
  PREDEFINED[code] ?? { ...CUSTOM_PALETTE[hash(code) % CUSTOM_PALETTE.length], icon: "📌" };

/** Rouge « en retard », ambre des pointillés « à entretenir » */
export const OVERDUE_BORDER = "#E24B4A";
export const OVERDUE_TEXT = "#A32D2D";
export const FOLLOW_UP_BORDER = "#BA7517";
/** Vert d'AWAM pour aujourd'hui */
export const TODAY_BORDER = "#1D9E75";
export const TODAY_TEXT = "#0F6E56";