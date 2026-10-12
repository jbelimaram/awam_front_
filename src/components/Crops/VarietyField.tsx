import { useState } from "react";
import type { VarietyOption } from "../../types/crop";

const OTHER = "__autre__";

interface VarietyFieldProps {
  /** Variétés proposées pour l'espèce ; vide = saisie libre directe */
  varieties: VarietyOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Choix de la variété d'une espèce.
 *
 * - Espèce avec variétés connues : liste regroupée par origine
 *   (tunisiennes, espagnoles, types cultivés) + « Autre… » pour saisir
 *   une variété absente de la liste.
 * - Espèce sans liste (caroubier) : saisie libre directe.
 */
export default function VarietyField({
  varieties,
  value,
  onChange,
  disabled = false,
  style,
}: VarietyFieldProps) {
  const names = varieties.map((v) => v.name);
  // Mode « Autre » : la valeur saisie n'est pas dans la liste
  const [other, setOther] = useState(value !== "" && !names.includes(value));

  if (varieties.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Variété (facultatif)"
        style={style}
      />
    );
  }

  if (other) {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Autre variété"
          autoFocus
          style={{ ...style, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => {
            setOther(false);
            onChange("");
          }}
          disabled={disabled}
          title="Revenir à la liste"
          style={{
            background: "transparent",
            border: "1px solid #4b5563",
            borderRadius: 6,
            color: "#d1d5db",
            padding: "0 8px",
            marginTop: 3,
            cursor: "pointer",
          }}
        >
          ↺
        </button>
      </div>
    );
  }

  // Regroupement par origine, dans l'ordre reçu du back
  const groups = varieties.reduce<{ label: string; items: VarietyOption[] }[]>(
    (acc, v) => {
      const group = acc.find((g) => g.label === v.origin_label);
      if (group) group.items.push(v);
      else acc.push({ label: v.origin_label, items: [v] });
      return acc;
    },
    []
  );

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          setOther(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      disabled={disabled}
      style={style}
    >
      <option value="">Variété (facultatif)</option>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.items.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={OTHER}>Autre…</option>
    </select>
  );
}