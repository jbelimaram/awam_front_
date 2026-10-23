import { useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.ts'; //j'ai ajouté .ts

const AUTH_ROUTES = ['/login', '/register', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe'];

const VARIANT_STYLES_AUTH: Record<string, string> = {
  error: 'bg-terracotta text-white',
  success: 'bg-menthe text-white',
  loading: 'bg-olive text-white',
};

/**
 * Couleurs des messages hors pages d'authentification.
 *
 * La zone des messages est placée À LA RACINE de l'application, en dehors
 * de toutes les pages : les variables de couleur définies dans une page
 * (ex. .profile-page dans ProfilePage.css) ne l'atteignent pas. Chaque
 * variable a donc une couleur de secours, aux couleurs d'AWAM ; sans elle,
 * le fond serait transparent et le texte blanc, invisible sur fond blanc.
 */
const VARIANT_STYLES_PROFILE: Record<string, string> = {
  error: 'bg-[var(--accent-chaud,#b42318)] text-white',
  success: 'bg-[var(--accent,#1b4332)] text-white',
  loading: 'bg-[var(--texte-secondaire,#4b5563)] text-white',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  const location = useLocation();

  const isAuthPage = AUTH_ROUTES.some((route) => location.pathname.startsWith(route));
  const styles = isAuthPage ? VARIANT_STYLES_AUTH : VARIANT_STYLES_PROFILE;

  if (toasts.length === 0) return null;

  return (
    // z-[2000] : au-dessus de tout le reste de l'application (barre du haut
    // à 100, menu du compte à 200, fenêtres à 500, panneau de la cloche à
    // 1000) ; sinon la barre du haut recouvrirait les messages
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 w-full max-w-sm px-4">
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