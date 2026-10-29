/** Styles communs des fenêtres claires (Dialog) : boutons, libellés, champs, sections */

export const dialogButton = {
  secondary: {
    padding: "6px 14px", fontSize: 12.5, borderRadius: 8, border: "1px solid #d1d5db",
    background: "#fff", color: "#374151", cursor: "pointer", whiteSpace: "nowrap",
  } as React.CSSProperties,
  primary: {
    padding: "6px 16px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: "none",
    background: "#1b4332", color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
  } as React.CSSProperties,
};

/** Libellé au-dessus d'un champ */
export const dialogLabel: React.CSSProperties = { fontSize: 11.5, color: "#4b5563", minWidth: 0, display: "block" };

/** Champ simple : texte, liste */
export const dialogInput: React.CSSProperties = {
  width: "100%", marginTop: 3, padding: "6px 9px", border: "1px solid #d1d5db", borderRadius: 7,
  background: "#fff", color: "#111827", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box",
};

/** Titre de section, avec son icône : vert pour le sol, bleu pour l'eau… */
export const dialogSection = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color, margin: "0 0 8px",
});

/**
 * Encadré teinté d'une section : les champs blancs y ressortent, et la
 * couleur rappelle le sujet (vert : sol et parcelle ; bleu : eau).
 */
export const SECTION_TINT = { green: "#f3f8ec", blue: "#eef5fc" };

/**
 * Violet doux des PERSONNES : employés, équipes, membres. Un sujet, une
 * couleur : vert pour le sol et les cultures, bleu pour l'eau, violet pour
 * les personnes.
 */
export const PEOPLE = {
  /** Fond de l'encadré */
  tint: "#f2f0fc",
  /** Titre de la section */
  text: "#3C3489",
  /** Bordure d'une personne cochée */
  border: "#c9c4f1",
  /** Cases à cocher */
  accent: "#534AB7",
};
export const dialogCard = (background: string): React.CSSProperties => ({
  background, borderRadius: 10, padding: "10px 12px",
});