import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { dialogLabel } from '../../Common/dialogStyles';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;

interface DialogFieldProps extends Omit<FieldProps, 'ref'> {
  label: ReactNode;
  error?: string;
  /** Petit texte d'aide sous le champ, remplacé par l'erreur s'il y en a une */
  hint?: ReactNode;
  /** Zone de texte sur plusieurs lignes (ex. une note), même aspect qu'un champ */
  multiline?: boolean;
}

/** Cadre commun à tous les champs des fenêtres : mêmes bordure, arrondi et hauteur */
const frame = (error?: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', marginTop: 3, borderRadius: 7, background: '#fff',
  border: `1px solid ${error ? '#E24B4A' : '#d1d5db'}`, padding: '0 9px', boxSizing: 'border-box',
});
const control: React.CSSProperties = {
  flex: 1, minWidth: 0, width: '100%', border: 'none', outline: 'none', background: 'transparent',
  padding: '6px 0', fontSize: 12.5, lineHeight: 1.5, color: '#111827', fontFamily: 'inherit',
};

/**
 * Champ des fenêtres claires du Profil, compatible avec react-hook-form
 * (register) : même aspect que tous les champs des fenêtres d'AWAM.
 * Un mot de passe a un bouton 👁 ; `multiline` donne une zone de texte,
 * de même style, sans poignée de redimensionnement.
 */
const DialogField = forwardRef<HTMLInputElement & HTMLTextAreaElement, DialogFieldProps>(
  ({ label, error, hint, multiline, id, type, style, rows, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';

    return (
      <div style={{ minWidth: 0 }}>
        <label htmlFor={id} style={dialogLabel}>
          {label}
        </label>
        <div className="awam-field" style={{ ...frame(error), alignItems: multiline ? 'stretch' : 'center' }}>
          {multiline ? (
            <textarea
              ref={ref}
              id={id}
              rows={rows ?? 3}
              aria-invalid={Boolean(error)}
              style={{ ...control, resize: 'none', ...style }}
              {...rest}
            />
          ) : (
            <input
              ref={ref}
              id={id}
              type={isPassword && visible ? 'text' : type}
              aria-invalid={Boolean(error)}
              style={{ ...control, ...style }}
              {...rest}
            />
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              tabIndex={-1}
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              title={visible ? 'Masquer' : 'Afficher'}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '0 0 0 6px' }}
            >
              {visible ? '🙈' : '👁'}
            </button>
          )}
        </div>
        {error ? (
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#A32D2D' }}>{error}</p>
        ) : (
          hint && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#6b7280' }}>{hint}</p>
        )}
      </div>
    );
  },
);

DialogField.displayName = 'DialogField';
export default DialogField;