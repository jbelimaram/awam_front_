import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary';
  children: ReactNode;
  isLoading?: boolean;
}

const baseStyles =
  'w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border flex items-center justify-center gap-2';

const variantStyles: Record<ButtonProps['variant'], string> = {
  primary: 'bg-[#D99B7C] text-white border-[#C98568] hover:bg-[#C98568]',
  secondary: 'bg-[#FCFBF8] text-[#6F695B] border-[#DDD2C2] hover:bg-[#F1E9DE]',
};

export default function Button({
  variant,
  children,
  isLoading = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {isLoading ? 'Chargement...' : children}
    </button>
  );
}