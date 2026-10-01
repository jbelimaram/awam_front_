interface AlertProps {
  variant: 'error' | 'success';
  message: string;
}

export default function Alert({ variant, message }: AlertProps) {
  const styles =
    variant === 'error'
      ? 'bg-terracotta/15 border-terracotta text-terracotta'
      : 'bg-menthe/15 border-menthe text-menthe';

  return (
    <div className={`mb-4 px-3.5 py-2.5 rounded-lg border text-xs ${styles}`} role="alert">
      {message}
    </div>
  );
}