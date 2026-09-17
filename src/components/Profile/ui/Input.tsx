import { InputHTMLAttributes, useState, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, type, className = '', ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    const actualType = isPasswordField && showPassword ? 'text' : type;

    return (
      <div className="mb-3">
        <label htmlFor={id} className="block text-sm text-[#6F695B] mb-1">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={actualType}
            className={`w-full px-3 py-2 rounded-lg bg-white border ${
              error ? 'border-[#D99B7C]' : 'border-[#DDD2C2]'
            } text-[#6F695B] placeholder-[#968B78]/50 outline-none focus:border-[#D99B7C] transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isPasswordField ? 'pr-11' : ''
            } ${className}`}
            {...rest}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#968B78] hover:text-[#6F695B] transition"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && <p className="text-[#D99B7C] text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;