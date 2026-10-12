import type { ParcelAnalysisPayload } from "../../types/parcelAnalysis";

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

/** Champs compacts : neuf champs tiennent sur cinq lignes. */
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 7px",
  borderRadius: 6,
  border: "1px solid #4b5563",
  marginTop: 2,
  background: "#111827",
  color: "#ffffff",
  fontSize: 12,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#d1d5db",
  minWidth: 0,
};

const sectionStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginTop: 2,
};

interface AnalysisFieldsProps {
  form: AnalysisFormState;
  onChange: (form: AnalysisFormState) => void;
  disabled?: boolean;
}

/**
 * Champs d'analyse de laboratoire (sol et eau), réutilisés par le formulaire
 * de parcelle et par l'ajout d'une analyse depuis la fiche.
 * Tous les champs sont facultatifs : une analyse peut être partielle.
 *
 * Mise en page compacte : date et type de sol sur une ligne, les quatre
 * mesures du sol sur une ligne, les deux mesures de l'eau sur une ligne.
 */
export default function AnalysisFields({ form, onChange, disabled = false }: AnalysisFieldsProps) {
  const set = (key: keyof AnalysisFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: e.target.value });

  const numberField = (
    key: keyof AnalysisFormState,
    label: string,
    placeholder: string,
    step = "0.01",
    title?: string
  ) => (
    <label style={labelStyle} title={title}>
      {label}
      <input
        type="number"
        step={step}
        value={form[key]}
        onChange={set(key)}
        disabled={disabled}
        placeholder={placeholder}
        style={fieldStyle}
      />
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {/* Date + type de sol */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <label style={labelStyle}>
          Date de l'analyse
          <input
            type="date"
            value={form.analyzed_at}
            onChange={set("analyzed_at")}
            disabled={disabled}
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Type de sol
          <input
            type="text"
            value={form.soil_type}
            onChange={set("soil_type")}
            disabled={disabled}
            placeholder="Ex. Sableuse"
            style={fieldStyle}
          />
        </label>
      </div>

      {/* Sol : quatre mesures sur une ligne */}
      <div style={sectionStyle}>Sol</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {numberField("soil_ph", "pH", "7.5", "0.1", "pH du sol")}
        {numberField("soil_humidity_pct", "Humid. %", "2.0", "0.01", "Humidité du sol (%)")}
        {numberField("soil_organic_matter_pct", "M.O. %", "1.0", "0.01", "Matière organique (%)")}
        {numberField("soil_salinity_g_l", "Sel g/L", "0.10", "0.01", "Salinité (g/L)")}
      </div>

      {/* Eau d'irrigation */}
      <div style={sectionStyle}>Eau d'irrigation</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        {numberField("water_ph", "pH de l'eau", "7.8", "0.1")}
        {numberField("water_nitrates_mg_l", "Nitrates (mg/L)", "21.6")}
      </div>

      <label style={labelStyle}>
        Observations
        <input
          type="text"
          value={form.notes}
          onChange={set("notes")}
          disabled={disabled}
          placeholder="Diagnostic, recommandations…"
          style={fieldStyle}
        />
      </label>
    </div>
  );
}