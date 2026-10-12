import { useState } from "react";

interface DateFieldProps {
  label: string;
  value: string;
  /**
   * Appelé à chaque saisie. `valid` vaut false si le jour tapé n'existe
   * pas (ex. 31/09) : le navigateur vide alors la valeur sans prévenir,
   * ce composant le détecte et l'affiche.
   */
  onChange: (value: string, valid: boolean) => void;
  disabled?: boolean;
  labelStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/**
 * Champ date qui signale les dates impossibles.
 *
 * Un <input type="date"> accepte visuellement « 31/09/2026 », mais sa
 * valeur devient vide : le formulaire enverrait « aucune date » et
 * l'utilisateur croirait avoir enregistré sa saisie. On lit donc
 * `validity.badInput`, l'indicateur du navigateur pour une saisie
 * incomplète ou impossible.
 */
export default function DateField({
  label,
  value,
  onChange,
  disabled = false,
  labelStyle,
  inputStyle,
}: DateFieldProps) {
  const [invalid, setInvalid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bad = e.target.validity.badInput;
    setInvalid(bad);
    onChange(e.target.value, !bad);
  };

  return (
    <label style={labelStyle}>
      {label}
      <input
        type="date"
        value={value}
        onChange={handleChange}
        onBlur={handleChange}
        disabled={disabled}
        aria-invalid={invalid}
        style={{
          ...inputStyle,
          ...(invalid ? { borderColor: "#f87171", outline: "none" } : {}),
        }}
      />
      {invalid && (
        <span style={{ display: "block", fontSize: 11, color: "#f87171", marginTop: 3 }}>
          Date invalide : ce jour n'existe pas.
        </span>
      )}
    </label>
  );
}