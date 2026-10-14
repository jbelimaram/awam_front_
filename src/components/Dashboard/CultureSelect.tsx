import { useEffect, useMemo, useState } from "react";
import { api } from "../../Services/api";

/** Espèce du référentiel (GET /api/crops/species), champs utiles ici. */
interface SpeciesItem {
  code: string;
  label: string;
}

interface CultureSelectProps {
  /** Texte enregistré sur la parcelle, ex. « Olivier, Lavande » */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  fieldStyle?: React.CSSProperties;
}

/** Minuscules, sans accents ni espaces superflus (même règle que le back). */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Séparateurs acceptés dans les anciennes saisies : , ; / + & « et » */
const SEPARATORS = /\s*(?:,|;|\/|\+|&|\bet\b)\s*/i;

/**
 * Choix des cultures d'une parcelle dans le référentiel, plusieurs
 * possibles (parcelles multicultures).
 *
 * La valeur reste un TEXTE, « Olivier, Lavande » : le back n'a pas changé,
 * et le formulaire de cultures lit ce texte pour pré-cocher les espèces
 * (app/services/agronomy/species.py, parse_cultures).
 *
 * Les anciennes saisies libres non reconnues (ex. « figuier ») restent
 * affichées en gris pour ne rien perdre, et peuvent être retirées.
 */
export default function CultureSelect({ value, onChange, disabled = false, fieldStyle }: CultureSelectProps) {
  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [toAdd, setToAdd] = useState("");

  useEffect(() => {
    api
      .get<SpeciesItem[]>("/api/crops/species")
      .then(setSpecies)
      .catch(() => setSpecies([]));
  }, []);

  // Texte enregistré → liste d'éléments : espèce reconnue, ou texte libre
  const items = useMemo(() => {
    const byName = new Map<string, SpeciesItem>();
    for (const s of species) {
      for (const form of [s.code, s.label, s.label.split(" ")[0]]) {
        const n = normalize(form);
        byName.set(n, s);
        byName.set(`${n}s`, s);
      }
    }
    const seen = new Set<string>();
    return value
      .split(SEPARATORS)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const spec = byName.get(normalize(part));
        return spec
          ? { key: spec.code, label: spec.label, known: true }
          : { key: `libre:${normalize(part)}`, label: part, known: false };
      })
      .filter((item) => (seen.has(item.key) ? false : (seen.add(item.key), true)));
  }, [value, species]);

  const write = (labels: string[]) => onChange(labels.join(", "));

  const remove = (key: string) => write(items.filter((i) => i.key !== key).map((i) => i.label));

  const add = (code: string) => {
    const spec = species.find((s) => s.code === code);
    if (!spec) return;
    write([...items.map((i) => i.label), spec.label]);
    setToAdd("");
  };

  const available = species.filter((s) => !items.some((i) => i.key === s.code));

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {items.map((item) => (
            <span
              key={item.key}
              title={item.known ? undefined : "Culture non reconnue dans le référentiel"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 4px 2px 9px",
                borderRadius: 999,
                fontSize: 12,
                background: item.known ? "#14532d" : "#374151",
                color: item.known ? "#ffffff" : "#d1d5db",
                fontStyle: item.known ? "normal" : "italic",
              }}
            >
              {item.label}
              <button
                type="button"
                onClick={() => remove(item.key)}
                disabled={disabled}
                title="Retirer"
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: "0 3px",
                  opacity: 0.8,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <select
        value={toAdd}
        onChange={(e) => add(e.target.value)}
        disabled={disabled || available.length === 0}
        style={fieldStyle}
      >
        <option value="">
          {species.length === 0
            ? "Chargement des cultures…"
            : available.length === 0
              ? "Toutes les cultures sont choisies"
              : "Ajouter une culture…"}
        </option>
        {available.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}