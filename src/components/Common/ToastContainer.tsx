import { useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.ts'; //j'ai ajouté .ts

const AUTH_ROUTES = ['/login', '/register', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe'];

const VARIANT_STYLES_AUTH: Record<string, string> = {
  error: 'bg-terracotta text-white',
  success: 'bg-menthe text-white',
  loading: 'bg-olive text-white',
};

const VARIANT_STYLES_PROFILE: Record<string, string> = {
  error: 'bg-[var(--accent-chaud)] text-white',
  success: 'bg-[var(--accent)] text-white',
  loading: 'bg-[var(--texte-secondaire)] text-white',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  const location = useLocation();

  const isAuthPage = AUTH_ROUTES.some((route) => location.pathname.startsWith(route));
  const styles = isAuthPage ? VARIANT_STYLES_AUTH : VARIANT_STYLES_PROFILE;

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg text-xs shadow-lg flex items-center gap-2 ${styles[toast.variant]}`}
          role="alert"
        >
          {toast.variant === 'loading' && (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-current opacity-80 hover:opacity-100 transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}