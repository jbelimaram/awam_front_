import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  error?: string; // Ajout de error pour gérer les messages d'erreur
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, error, className = '', disabled, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1 mb-5">
        <div className="flex items-start gap-2.5">
          <input
            ref={ref} // ✅ Ajout de ref
            id={id}
            type="checkbox"
            disabled={disabled}
            className={`
              mt-0.5 w-3.5 h-3.5 shrink-0 
              ${error ? 'border-2 border-terracotta' : ''}
              accent-terracotta 
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...rest}
          />
          <label htmlFor={id} className="text-xs text-white/80 leading-relaxed">
            {label}
          </label>
        </div>
        {error && <p className="text-terracotta text-xs mt-0.5">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;