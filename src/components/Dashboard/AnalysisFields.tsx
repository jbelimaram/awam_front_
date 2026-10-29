import type { ParcelAnalysisPayload } from "../../types/parcelAnalysis";
import { SECTION_TINT, dialogCard, dialogLabel, dialogSection } from "../Common/dialogStyles";

/** État du formulaire : des chaînes, car les champs numériques peuvent être vides. */
export interface AnalysisFormState {
  analyzed_at: string;
  soil_type: string;
  soil_ph: string;
  soil_humidity_pct: string;
  soil_organic_matter_pct: string;
  soil_salinity_g_l: string;
  water_ph: string;
  water_nitrates_mg_l: string;
  notes: string;
}

export const EMPTY_ANALYSIS_FORM: AnalysisFormState = {
  analyzed_at: "",
  soil_type: "",
  soil_ph: "",
  soil_humidity_pct: "",
  soil_organic_matter_pct: "",
  soil_salinity_g_l: "",
  water_ph: "",
  water_nitrates_mg_l: "",
  notes: "",
};

const toNumber = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

/** True si l'utilisateur n'a rempli aucun champ : inutile d'envoyer l'analyse. */
export function isAnalysisEmpty(form: AnalysisFormState): boolean {
  return Object.entries(form)
    .filter(([key]) => key !== "analyzed_at")
    .every(([, value]) => !String(value).trim());
}

/** Convertit l'état du formulaire en données prêtes pour le backend. */
export function toAnalysisPayload(form: AnalysisFormState): ParcelAnalysisPayload {
  return {
    analyzed_at: form.analyzed_at ? new Date(form.analyzed_at).toISOString() : null,
    soil_type: form.soil_type.trim() || null,
    soil_ph: toNumber(form.soil_ph),
    soil_humidity_pct: toNumber(form.soil_humidity_pct),
    soil_organic_matter_pct: toNumber(form.soil_organic_matter_pct),
    soil_salinity_g_l: toNumber(form.soil_salinity_g_l),
    water_ph: toNumber(form.water_ph),
    water_nitrates_mg_l: toNumber(form.water_nitrates_mg_l),
    notes: form.notes.trim() || null,
  };
}

/** Le cadre d'un champ : la saisie à gauche, l'unité à droite */
const box: React.CSSProperties = {
  display: "flex", alignItems: "center", marginTop: 3, border: "1px solid #d1d5db", borderRadius: 7,
  background: "#fff", padding: "0 9px", boxSizing: "border-box",
};
const input: React.CSSProperties = {
  flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
  padding: "6px 0", fontSize: 12.5, color: "#111827", fontFamily: "inherit",
};
const unitStyle: React.CSSProperties = { fontSize: 11.5, color: "#9ca3af", marginLeft: 6, flexShrink: 0 };
const twoColumns: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };

interface AnalysisFieldsProps {
  form: AnalysisFormState;
  onChange: (form: AnalysisFormState) => void;
  disabled?: boolean;
}

/**
 * Champs d'une analyse de laboratoire, sol et eau d'irrigation, dans le
 * style clair des fenêtres d'AWAM : sections 🌱 Sol et 💧 Eau d'irrigation
 * dans des encadrés teintés (vert, bleu), unité affichée dans chaque champ.
 *
 * Utilisés par la fenêtre « Nouvelle analyse » de la fiche, et par la
 * fenêtre de création de parcelle. Tous les champs sont facultatifs.
 */
export default function AnalysisFields({ form, onChange, disabled = false }: AnalysisFieldsProps) {
  const set = (key: keyof AnalysisFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: e.target.value });

  /** Un champ, avec son unité affichée à droite, dans le champ */
  const field = (key: keyof AnalysisFormState, label: string, unit = "", type = "number", placeholder = "") => (
    <label style={dialogLabel}>
      {label}
      <span className="awam-field" style={box}>
        <input
          type={type}
          step={type === "number" ? "0.01" : undefined}
          value={form[key]}
          onChange={set(key)}
          disabled={disabled}
          placeholder={placeholder}
          style={input}
        />
        {unit && <span style={unitStyle}>{unit}</span>}
      </span>
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={twoColumns}>
        {field("analyzed_at", "Date de l'analyse", "", "date")}
        {field("soil_type", "Type de sol", "", "text", "Ex. Sableuse")}
      </div>

      <div style={dialogCard(SECTION_TINT.green)}>
        <div style={dialogSection("#3B6D11")}><span aria-hidden>🌱</span> Sol</div>
        <div style={twoColumns}>
          {field("soil_ph", "pH", "", "number", "7,5")}
          {field("soil_organic_matter_pct", "Matière organique", "%", "number", "1,0")}
          {field("soil_humidity_pct", "Humidité", "%", "number", "18")}
          {field("soil_salinity_g_l", "Salinité", "g/L", "number", "0,10")}
        </div>
      </div>

      <div style={dialogCard(SECTION_TINT.blue)}>
        <div style={dialogSection("#185FA5")}><span aria-hidden>💧</span> Eau d'irrigation</div>
        <div style={twoColumns}>
          {field("water_ph", "pH", "", "number", "7,8")}
          {field("water_nitrates_mg_l", "Nitrates", "mg/L", "number", "21,6")}
        </div>
      </div>

      {field("notes", "Observations", "", "text", "Diagnostic, recommandations…")}
    </div>
  );
}